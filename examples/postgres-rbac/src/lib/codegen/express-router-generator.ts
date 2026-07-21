import { TableOptions } from "../db/postgres";

interface ForeignKeyInfo {
  column: string;
  table: string;
  refColumn: string;
}

function extractForeignKeys(colDefs: { [colName: string]: any }): ForeignKeyInfo[] {
  const fks: ForeignKeyInfo[] = [];
  for (const [colName, colDef] of Object.entries(colDefs)) {
    if (colDef.isForeignKey && typeof colDef.references === "string" && colDef.references.includes(".")) {
      const [refTable, refColumn] = colDef.references.split(".");
      fks.push({ column: colName, table: refTable, refColumn });
    }
  }
  return fks;
}

function resolvePrimaryKey(colDefs: { [colName: string]: any }): string {
  const pkEntry = Object.entries(colDefs).find(([, colDef]: [string, any]) => colDef.isPrimaryKey);
  return pkEntry ? pkEntry[0] : "id";
}

/**
 * Gera um router Express equivalente ao router Hono (`router-generator.ts`), reaproveitando
 * exatamente o mesmo `crud-engine` (execução real de CRUD) e o mesmo núcleo de RBAC/rate limiting
 * (`core/auth-core.ts`, `core/rate-limit-core.ts`) por trás dos adapters Express dedicados
 * (`express-adapters.ts`). Prova em código — não só em documentação — de que o motor é portável
 * para outra stack HTTP sem duplicar lógica de negócio ou de segurança.
 */
export function generateExpressRouterString(
  tableName: string,
  colDefs: { [colName: string]: any },
  tableOptions: TableOptions = {}
): string {
  const writeRolesSet = new Set<string>();
  const readRolesSet = new Set<string>();

  for (const colDef of Object.values(colDefs) as any[]) {
    if (colDef.metadata?.permissions?.write) {
      colDef.metadata.permissions.write.forEach((r: string) => writeRolesSet.add(r));
    }
    if (colDef.metadata?.permissions?.read) {
      colDef.metadata.permissions.read.forEach((r: string) => readRolesSet.add(r));
    }
  }

  const writeRoles = Array.from(writeRolesSet);
  const readRoles = Array.from(readRolesSet);
  const columnNames = Object.keys(colDefs);
  const primaryKey = resolvePrimaryKey(colDefs);
  const foreignKeys = extractForeignKeys(colDefs);
  const softDelete = tableOptions.soft_delete === true;
  const ownerField = tableOptions.owner_field ?? null;

  return `import { Router } from "express";
import { ${tableName}InsertSchema, ${tableName}UpdateSchema } from "../schemas/${tableName}";
import { requireRoleExpress, rateLimitExpress } from "../../lib/runtime/express-adapters";
import { logAudit } from "../../lib/runtime/audit-log";
import * as crud from "../../lib/runtime/crud-engine";
import { getDbClient } from "../../lib/runtime/db-client";

export const ${tableName}Router = Router();

const TABLE = "${tableName}";
const PRIMARY_KEY = "${primaryKey}";
const COLUMN_NAMES = ${JSON.stringify(columnNames)};
const SOFT_DELETE = ${JSON.stringify(softDelete)};
const OWNER_FIELD: string | null = ${JSON.stringify(ownerField)};
const FOREIGN_KEYS: { column: string; table: string; refColumn: string }[] = ${JSON.stringify(foreignKeys, null, 2)};

const rbacWrite = requireRoleExpress(${JSON.stringify(writeRoles)});
const rbacRead = requireRoleExpress(${JSON.stringify(readRoles)});

${tableName}Router.use(rateLimitExpress());

${tableName}Router.get("/", rbacRead, async (req, res) => {
  const db = getDbClient();
  const user = req.user;
  const listOpts = crud.parseListQuery(req.query as Record<string, string>, COLUMN_NAMES);
  const result = await crud.listRecords(TABLE, {
    ...listOpts,
    softDelete: SOFT_DELETE,
    ownerField: OWNER_FIELD,
    user,
    bypassOwnerFilter: user?.role === "admin"
  }, db);
  logAudit({ action: "read", table: TABLE, userId: user?.sub, userRole: user?.role });
  res.json(result);
});

${tableName}Router.get("/:id", rbacRead, async (req, res) => {
  const db = getDbClient();
  const user = req.user;
  const record = await crud.getRecord(TABLE, PRIMARY_KEY, req.params.id as string, {
    softDelete: SOFT_DELETE,
    ownerField: OWNER_FIELD,
    user,
    bypassOwnerFilter: user?.role === "admin"
  }, db);
  if (!record) { res.status(404).json({ error: "Registro não encontrado" }); return; }
  logAudit({ action: "read", table: TABLE, recordId: req.params.id as string, userId: user?.sub, userRole: user?.role });
  res.json(record);
});

${tableName}Router.post("/", rbacWrite, async (req, res) => {
  const db = getDbClient();
  const user = req.user;
  const parsed = ${tableName}InsertSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const created = await db.transaction(async (trx) => {
      await crud.assertForeignKeysExist(FOREIGN_KEYS, parsed.data, trx);
      return crud.createRecord(TABLE, parsed.data, { ownerField: OWNER_FIELD, user }, trx);
    });
    logAudit({ action: "create", table: TABLE, recordId: (created as any)?.[PRIMARY_KEY], userId: user?.sub, userRole: user?.role });
    res.status(201).json(created);
  } catch (err: any) {
    const { status, body } = crud.normalizeDbError(err, db.driver);
    res.status(status).json(body);
  }
});

${tableName}Router.put("/:id", rbacWrite, async (req, res) => {
  const db = getDbClient();
  const user = req.user;
  const parsed = ${tableName}UpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const updated = await db.transaction(async (trx) => {
      await crud.assertForeignKeysExist(FOREIGN_KEYS, parsed.data, trx);
      return crud.updateRecord(TABLE, PRIMARY_KEY, req.params.id as string, parsed.data, {
        ownerField: OWNER_FIELD,
        user,
        bypassOwnerFilter: user?.role === "admin"
      }, trx);
    });
    if (!updated) { res.status(404).json({ error: "Registro não encontrado" }); return; }
    logAudit({ action: "update", table: TABLE, recordId: req.params.id as string, userId: user?.sub, userRole: user?.role });
    res.json(updated);
  } catch (err: any) {
    const { status, body } = crud.normalizeDbError(err, db.driver);
    res.status(status).json(body);
  }
});

${tableName}Router.delete("/:id", rbacWrite, async (req, res) => {
  const db = getDbClient();
  const user = req.user;
  try {
    const result = await crud.deleteRecord(TABLE, PRIMARY_KEY, req.params.id as string, {
      softDelete: SOFT_DELETE,
      ownerField: OWNER_FIELD,
      user,
      bypassOwnerFilter: user?.role === "admin"
    }, db);
    if (!result.deleted) { res.status(404).json({ error: "Registro não encontrado" }); return; }
    logAudit({ action: "delete", table: TABLE, recordId: req.params.id as string, userId: user?.sub, userRole: user?.role });
    res.status(204).send();
  } catch (err: any) {
    const { status, body } = crud.normalizeDbError(err, db.driver);
    res.status(status).json(body);
  }
});
`;
}
