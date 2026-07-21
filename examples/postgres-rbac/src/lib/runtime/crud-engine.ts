import { DbClient, DbDriver, getDbClient } from "./db-client";

const VALID_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Aspas de identificador (tabela/coluna). Os nomes chegam aqui como constantes literais
 * embutidas no código gerado a partir do metadata.json (não são input de usuário), mas ainda
 * assim validamos o formato como defesa em profundidade antes de interpolar em SQL.
 */
function quoteIdent(name: string): string {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(`Identificador de coluna/tabela inválido: '${name}'`);
  }
  return `"${name}"`;
}

export interface ForeignKeyRef {
  column: string;
  table: string;
  refColumn: string;
}

export interface RequestUser {
  sub?: string;
  role?: string;
  [key: string]: any;
}

export interface RecordContext {
  softDelete?: boolean;
  ownerField?: string | null;
  user?: RequestUser | null;
  /** Quando true, ignora o filtro de owner mesmo se ownerField estiver configurado (ex.: role admin). */
  bypassOwnerFilter?: boolean;
}

export interface ListQueryOptions {
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection: "asc" | "desc";
  filters: Record<string, string>;
}

const RESERVED_QUERY_PARAMS = new Set(["page", "pageSize", "sort"]);
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

/** Interpreta os query params HTTP em opções seguras de listagem, validando contra colunas conhecidas. */
export function parseListQuery(query: Record<string, string>, allowedColumns: string[]): ListQueryOptions {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE));

  let sortColumn: string | undefined;
  let sortDirection: "asc" | "desc" = "asc";
  if (query.sort) {
    const [col, dir] = query.sort.split(":");
    if (allowedColumns.includes(col)) {
      sortColumn = col;
      sortDirection = dir === "desc" ? "desc" : "asc";
    }
  }

  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (RESERVED_QUERY_PARAMS.has(key)) continue;
    if (allowedColumns.includes(key)) filters[key] = value;
  }

  return { page, pageSize, sortColumn, sortDirection, filters };
}

function buildWhereClause(
  db: DbClient,
  filters: Record<string, string>,
  ctx: RecordContext,
  startIndex: number
): { clause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = startIndex;

  for (const [col, value] of Object.entries(filters)) {
    conditions.push(`${quoteIdent(col)} = ${db.placeholder(idx++)}`);
    params.push(value);
  }

  if (ctx.softDelete) {
    conditions.push(`${quoteIdent("deleted_at")} IS NULL`);
  }

  if (ctx.ownerField && !ctx.bypassOwnerFilter && ctx.user?.sub) {
    conditions.push(`${quoteIdent(ctx.ownerField)} = ${db.placeholder(idx++)}`);
    params.push(ctx.user.sub);
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params
  };
}

export interface ListResult<T = any> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export async function listRecords<T = any>(
  table: string,
  opts: ListQueryOptions & RecordContext,
  db: DbClient = getDbClient()
): Promise<ListResult<T>> {
  const { clause, params } = buildWhereClause(db, opts.filters, opts, 1);

  const countRows = await db.query<{ count: string | number }>(
    `SELECT COUNT(*) as count FROM ${quoteIdent(table)} ${clause}`,
    params
  );
  const total = Number(countRows[0]?.count ?? 0);

  const orderClause = opts.sortColumn ? `ORDER BY ${quoteIdent(opts.sortColumn)} ${opts.sortDirection.toUpperCase()}` : "";
  const offset = (opts.page - 1) * opts.pageSize;

  const limitParams = [...params, opts.pageSize, offset];
  const limitPlaceholderStart = params.length + 1;
  const data = await db.query<T>(
    `SELECT * FROM ${quoteIdent(table)} ${clause} ${orderClause} LIMIT ${db.placeholder(limitPlaceholderStart)} OFFSET ${db.placeholder(limitPlaceholderStart + 1)}`,
    limitParams
  );

  return { data, page: opts.page, pageSize: opts.pageSize, total };
}

export async function getRecord<T = any>(
  table: string,
  primaryKey: string,
  id: string,
  ctx: RecordContext,
  db: DbClient = getDbClient()
): Promise<T | null> {
  const { clause, params } = buildWhereClause(db, {}, ctx, 2);
  const rows = await db.query<T>(
    `SELECT * FROM ${quoteIdent(table)} WHERE ${quoteIdent(primaryKey)} = ${db.placeholder(1)} ${clause ? "AND " + clause.replace("WHERE ", "") : ""}`,
    [id, ...params]
  );
  return rows[0] ?? null;
}

export async function createRecord<T = any>(
  table: string,
  data: Record<string, any>,
  ctx: RecordContext,
  db: DbClient = getDbClient()
): Promise<T> {
  const payload = { ...data };
  if (ctx.ownerField && ctx.user?.sub && payload[ctx.ownerField] === undefined) {
    payload[ctx.ownerField] = ctx.user.sub;
  }

  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = columns.map((_, i) => db.placeholder(i + 1));

  if (db.driver === "postgres") {
    const rows = await db.query<T>(
      `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      values
    );
    return rows[0];
  }

  const result = await db.run(
    `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")}) VALUES (${placeholders.join(", ")})`,
    values
  );
  const rows = await db.query<T>(`SELECT * FROM ${quoteIdent(table)} WHERE rowid = ${db.placeholder(1)}`, [result.lastInsertId]);
  return rows[0];
}

export async function updateRecord<T = any>(
  table: string,
  primaryKey: string,
  id: string,
  data: Record<string, any>,
  ctx: RecordContext,
  db: DbClient = getDbClient()
): Promise<T | null> {
  const columns = Object.keys(data);
  if (columns.length === 0) {
    return getRecord<T>(table, primaryKey, id, ctx, db);
  }

  const setClause = columns.map((col, i) => `${quoteIdent(col)} = ${db.placeholder(i + 1)}`).join(", ");
  const values = Object.values(data);

  const { clause: ownerClause, params: ownerParams } = buildWhereClause(db, {}, { ...ctx, softDelete: false }, columns.length + 2);
  const extraWhere = ownerClause ? `AND ${ownerClause.replace("WHERE ", "")}` : "";

  if (db.driver === "postgres") {
    const rows = await db.query<T>(
      `UPDATE ${quoteIdent(table)} SET ${setClause} WHERE ${quoteIdent(primaryKey)} = ${db.placeholder(columns.length + 1)} ${extraWhere} RETURNING *`,
      [...values, id, ...ownerParams]
    );
    return rows[0] ?? null;
  }

  await db.run(
    `UPDATE ${quoteIdent(table)} SET ${setClause} WHERE ${quoteIdent(primaryKey)} = ${db.placeholder(columns.length + 1)} ${extraWhere}`,
    [...values, id, ...ownerParams]
  );
  return getRecord<T>(table, primaryKey, id, ctx, db);
}

export async function deleteRecord(
  table: string,
  primaryKey: string,
  id: string,
  ctx: RecordContext,
  db: DbClient = getDbClient()
): Promise<{ deleted: boolean }> {
  if (ctx.softDelete) {
    const result = await db.run(
      `UPDATE ${quoteIdent(table)} SET ${quoteIdent("deleted_at")} = ${db.driver === "postgres" ? "NOW()" : "CURRENT_TIMESTAMP"} WHERE ${quoteIdent(primaryKey)} = ${db.placeholder(1)}`,
      [id]
    );
    return { deleted: result.changes > 0 };
  }

  const result = await db.run(`DELETE FROM ${quoteIdent(table)} WHERE ${quoteIdent(primaryKey)} = ${db.placeholder(1)}`, [id]);
  return { deleted: result.changes > 0 };
}

/** Verifica, dentro da mesma transação/conexão, se os valores de FK informados existem na tabela referenciada. */
export async function assertForeignKeysExist(
  fks: ForeignKeyRef[],
  data: Record<string, any>,
  db: DbClient = getDbClient()
): Promise<void> {
  for (const fk of fks) {
    const value = data[fk.column];
    if (value === undefined || value === null) continue;

    const rows = await db.query(
      `SELECT 1 FROM ${quoteIdent(fk.table)} WHERE ${quoteIdent(fk.refColumn)} = ${db.placeholder(1)}`,
      [value]
    );
    if (rows.length === 0) {
      const err: any = new Error(`Referência inválida: '${fk.column}' aponta para um registro inexistente em '${fk.table}.${fk.refColumn}'.`);
      err.code = "FOREIGN_KEY_NOT_FOUND";
      throw err;
    }
  }
}

export interface DbErrorResponse {
  status: number;
  body: { error: string; code?: string };
}

/** Normaliza erros de driver (Postgres/SQLite) em respostas HTTP consistentes. */
export function normalizeDbError(err: any, driver: DbDriver): DbErrorResponse {
  if (err?.code === "FOREIGN_KEY_NOT_FOUND") {
    return { status: 400, body: { error: err.message, code: "FOREIGN_KEY_NOT_FOUND" } };
  }

  if (driver === "postgres") {
    if (err?.code === "23505") return { status: 409, body: { error: "Violação de unicidade: registro já existe.", code: "UNIQUE_VIOLATION" } };
    if (err?.code === "23503") return { status: 409, body: { error: "Violação de integridade referencial.", code: "FOREIGN_KEY_VIOLATION" } };
    if (err?.code === "23502") return { status: 400, body: { error: "Campo obrigatório ausente.", code: "NOT_NULL_VIOLATION" } };
  } else {
    const message: string = err?.message || "";
    if (message.includes("UNIQUE constraint failed")) return { status: 409, body: { error: "Violação de unicidade: registro já existe.", code: "UNIQUE_VIOLATION" } };
    if (message.includes("FOREIGN KEY constraint failed")) return { status: 409, body: { error: "Violação de integridade referencial.", code: "FOREIGN_KEY_VIOLATION" } };
    if (message.includes("NOT NULL constraint failed")) return { status: 400, body: { error: "Campo obrigatório ausente.", code: "NOT_NULL_VIOLATION" } };
  }

  return { status: 500, body: { error: "Erro interno ao acessar o banco de dados.", code: "UNKNOWN_DB_ERROR" } };
}
