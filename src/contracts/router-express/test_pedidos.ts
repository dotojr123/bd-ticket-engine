import { Router } from "express";
import { test_pedidosInsertSchema, test_pedidosUpdateSchema } from "../schemas/test_pedidos";
import { requireRoleExpress, rateLimitExpress } from "../../lib/runtime/express-adapters";
import { logAudit } from "../../lib/runtime/audit-log";
import * as crud from "../../lib/runtime/crud-engine";
import { getDbClient } from "../../lib/runtime/db-client";

export const test_pedidosRouter = Router();

const TABLE = "test_pedidos";
const PRIMARY_KEY = "id";
const COLUMN_NAMES = ["cliente_id","id","status"];
const SOFT_DELETE = false;
const OWNER_FIELD: string | null = null;
const FOREIGN_KEYS: { column: string; table: string; refColumn: string }[] = [
  {
    "column": "cliente_id",
    "table": "test_clientes",
    "refColumn": "id"
  }
];

const rbacWrite = requireRoleExpress(["parceiro","admin"]);
const rbacRead = requireRoleExpress(["user","parceiro","admin"]);

test_pedidosRouter.use(rateLimitExpress());

test_pedidosRouter.get("/", rbacRead, async (req, res) => {
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

test_pedidosRouter.get("/:id", rbacRead, async (req, res) => {
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

test_pedidosRouter.post("/", rbacWrite, async (req, res) => {
  const db = getDbClient();
  const user = req.user;
  const parsed = test_pedidosInsertSchema.safeParse(req.body);
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

test_pedidosRouter.put("/:id", rbacWrite, async (req, res) => {
  const db = getDbClient();
  const user = req.user;
  const parsed = test_pedidosUpdateSchema.safeParse(req.body);
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

test_pedidosRouter.delete("/:id", rbacWrite, async (req, res) => {
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
