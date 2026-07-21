import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { test_clientesInsertSchema, test_clientesUpdateSchema } from "../schemas/test_clientes";
import { requireRole, getAuthUser } from "../../lib/runtime/auth";
import { rateLimit } from "../../lib/runtime/rate-limit";
import { logAudit } from "../../lib/runtime/audit-log";
import * as crud from "../../lib/runtime/crud-engine";
import { getDbClient } from "../../lib/runtime/db-client";

export const test_clientesRouter = new Hono();

// Metadados físicos da tabela, embutidos em tempo de geração (não são input de usuário)
const TABLE = "test_clientes";
const PRIMARY_KEY = "id";
const COLUMN_NAMES = ["deleted_at","email","id","nome"];
const SOFT_DELETE = true;
const OWNER_FIELD: string | null = null;
const FOREIGN_KEYS: { column: string; table: string; refColumn: string }[] = [];

// Middleware RBAC de Escrita (JWT real verificado via requireRole)
const rbacWrite = async (c: any, next: any) => {
  const allowed = ["admin"];
  return requireRole(allowed)(c, next);
};

// Middleware RBAC de Leitura (JWT real verificado via requireRole)
const rbacRead = async (c: any, next: any) => {
  const allowed = ["admin","user","parceiro"];
  return requireRole(allowed)(c, next);
};

test_clientesRouter.use("*", rateLimit());

// Endpoints CRUD reais (dados persistidos de fato via DbClient, sem mocks)
test_clientesRouter.get("/", rbacRead, async (c) => {
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

test_clientesRouter.get("/:id", rbacRead, async (c) => {
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

test_clientesRouter.post("/", rbacWrite, zValidator("json", test_clientesInsertSchema), async (c) => {
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

test_clientesRouter.put("/:id", rbacWrite, zValidator("json", test_clientesUpdateSchema), async (c) => {
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

test_clientesRouter.delete("/:id", rbacWrite, async (c) => {
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
