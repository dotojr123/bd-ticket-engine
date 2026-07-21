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
 * Gera a string de código TypeScript do roteador Hono com CRUD real (via crud-engine + DbClient),
 * autenticação JWT verificada (RBAC real), checagem de integridade de chaves estrangeiras,
 * paginação/ordenação/filtro, soft delete opcional e log de auditoria estruturado.
 */
export function generateRouterString(
  tableName: string,
  colDefs: { [colName: string]: any },
  tableOptions: TableOptions = {}
): string {
  // Extrair papéis permitidos de escrita/leitura na tabela a partir das colunas
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

  return `import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ${tableName}InsertSchema, ${tableName}UpdateSchema } from "../schemas/${tableName}";
import { requireRole, getAuthUser } from "../../lib/runtime/auth";
import { rateLimit } from "../../lib/runtime/rate-limit";
import { logAudit } from "../../lib/runtime/audit-log";
import * as crud from "../../lib/runtime/crud-engine";
import { getDbClient } from "../../lib/runtime/db-client";

export const ${tableName}Router = new Hono();

// Metadados físicos da tabela, embutidos em tempo de geração (não são input de usuário)
const TABLE = "${tableName}";
const PRIMARY_KEY = "${primaryKey}";
const COLUMN_NAMES = ${JSON.stringify(columnNames)};
const SOFT_DELETE = ${JSON.stringify(softDelete)};
const OWNER_FIELD: string | null = ${JSON.stringify(ownerField)};
const FOREIGN_KEYS: { column: string; table: string; refColumn: string }[] = ${JSON.stringify(foreignKeys, null, 2)};

// Middleware RBAC de Escrita (JWT real verificado via requireRole)
const rbacWrite = async (c: any, next: any) => {
  const allowed = ${JSON.stringify(writeRoles)};
  return requireRole(allowed)(c, next);
};

// Middleware RBAC de Leitura (JWT real verificado via requireRole)
const rbacRead = async (c: any, next: any) => {
  const allowed = ${JSON.stringify(readRoles)};
  return requireRole(allowed)(c, next);
};

${tableName}Router.use("*", rateLimit());

// Endpoints CRUD reais (dados persistidos de fato via DbClient, sem mocks)
${tableName}Router.get("/", rbacRead, async (c) => {
  const db = getDbClient();
  const user = getAuthUser(c);
  const listOpts = crud.parseListQuery(c.req.query(), COLUMN_NAMES);
  const result = await crud.listRecords(TABLE, {
    ...listOpts,
    softDelete: SOFT_DELETE,
    ownerField: OWNER_FIELD,
    user,
    bypassOwnerFilter: user?.role === "admin"
  }, db);
  logAudit({ action: "read", table: TABLE, userId: user?.sub, userRole: user?.role });
  return c.json(result);
});

${tableName}Router.get("/:id", rbacRead, async (c) => {
  const db = getDbClient();
  const user = getAuthUser(c);
  const record = await crud.getRecord(TABLE, PRIMARY_KEY, c.req.param("id"), {
    softDelete: SOFT_DELETE,
    ownerField: OWNER_FIELD,
    user,
    bypassOwnerFilter: user?.role === "admin"
  }, db);
  if (!record) return c.json({ error: "Registro não encontrado" }, 404);
  logAudit({ action: "read", table: TABLE, recordId: c.req.param("id"), userId: user?.sub, userRole: user?.role });
  return c.json(record);
});

${tableName}Router.post("/", rbacWrite, zValidator("json", ${tableName}InsertSchema), async (c) => {
  const db = getDbClient();
  const user = getAuthUser(c);
  const data = c.req.valid("json");
  try {
    const created = await db.transaction(async (trx) => {
      await crud.assertForeignKeysExist(FOREIGN_KEYS, data, trx);
      return crud.createRecord(TABLE, data, { ownerField: OWNER_FIELD, user }, trx);
    });
    logAudit({ action: "create", table: TABLE, recordId: (created as any)?.[PRIMARY_KEY], userId: user?.sub, userRole: user?.role });
    return c.json(created, 201);
  } catch (err: any) {
    const { status, body } = crud.normalizeDbError(err, db.driver);
    return c.json(body, status as any);
  }
});

${tableName}Router.put("/:id", rbacWrite, zValidator("json", ${tableName}UpdateSchema), async (c) => {
  const db = getDbClient();
  const user = getAuthUser(c);
  const data = c.req.valid("json");
  try {
    const updated = await db.transaction(async (trx) => {
      await crud.assertForeignKeysExist(FOREIGN_KEYS, data, trx);
      return crud.updateRecord(TABLE, PRIMARY_KEY, c.req.param("id"), data, {
        ownerField: OWNER_FIELD,
        user,
        bypassOwnerFilter: user?.role === "admin"
      }, trx);
    });
    if (!updated) return c.json({ error: "Registro não encontrado" }, 404);
    logAudit({ action: "update", table: TABLE, recordId: c.req.param("id"), userId: user?.sub, userRole: user?.role });
    return c.json(updated);
  } catch (err: any) {
    const { status, body } = crud.normalizeDbError(err, db.driver);
    return c.json(body, status as any);
  }
});

${tableName}Router.delete("/:id", rbacWrite, async (c) => {
  const db = getDbClient();
  const user = getAuthUser(c);
  try {
    const result = await crud.deleteRecord(TABLE, PRIMARY_KEY, c.req.param("id"), {
      softDelete: SOFT_DELETE,
      ownerField: OWNER_FIELD,
      user,
      bypassOwnerFilter: user?.role === "admin"
    }, db);
    if (!result.deleted) return c.json({ error: "Registro não encontrado" }, 404);
    logAudit({ action: "delete", table: TABLE, recordId: c.req.param("id"), userId: user?.sub, userRole: user?.role });
    return c.body(null, 204);
  } catch (err: any) {
    const { status, body } = crud.normalizeDbError(err, db.driver);
    return c.json(body, status as any);
  }
});
`;
}
