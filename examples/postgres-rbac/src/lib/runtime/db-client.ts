// Importados apenas como TIPO (apagados na compilação) — o módulo real (`pg`/`better-sqlite3`) só
// é exigido em runtime via require() dentro de createDbClient(), e só para o driver realmente
// selecionado. Isso permite instalar só uma das duas dependências nativas conforme o driver usado,
// em vez de forçar ambas em todo consumidor do pacote.
import type { Pool } from "pg";
import type Database from "better-sqlite3";

export type DbDriver = "postgres" | "sqlite";

/**
 * Contrato mínimo que qualquer objeto "tipo pg.Pool/pg.PoolClient" precisa satisfazer.
 * Além do driver real `pg`, isso permite injetar um Pool compatível (ex.: pg-mem em testes de
 * integração que exercitam o dialeto Postgres real sem depender de um servidor/Docker).
 */
export interface PgLikeExecutor {
  query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number | null }>;
}

export interface PgLikePool extends PgLikeExecutor {
  connect(): Promise<PgLikeExecutor & { query(sql: string, params?: any[]): Promise<any>; release(): void }>;
  end(): Promise<void>;
}

export interface DbClient {
  driver: DbDriver;
  /** Formata o placeholder posicional de parâmetro do driver ativo ($1 no Postgres, ? no SQLite). */
  placeholder(index: number): string;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<{ changes: number; lastInsertId?: any }>;
  /** Executa fn dentro de uma transação real (BEGIN/COMMIT/ROLLBACK); propaga o erro em caso de rollback. */
  transaction<T>(fn: (trx: DbClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

class PostgresDbClient implements DbClient {
  driver: DbDriver = "postgres";
  constructor(private readonly executor: PgLikeExecutor, private readonly pool?: PgLikePool) {}

  placeholder(index: number): string {
    return `$${index}`;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const res = await this.executor.query(sql, params);
    return res.rows as T[];
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertId?: any }> {
    const res = await this.executor.query(sql, params);
    return { changes: res.rowCount ?? 0, lastInsertId: res.rows?.[0]?.id };
  }

  async transaction<T>(fn: (trx: DbClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error("Transações aninhadas não são suportadas nesta implementação.");
    }
    const client = await this.pool.connect();
    const trxClient = new PostgresDbClient(client);
    try {
      await client.query("BEGIN");
      const result = await fn(trxClient);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) await this.pool.end();
  }
}

class SqliteDbClient implements DbClient {
  driver: DbDriver = "sqlite";
  private inTransaction = false;
  constructor(private readonly db: Database.Database) {}

  placeholder(_index: number): string {
    return "?";
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertId?: any }> {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, lastInsertId: info.lastInsertRowid };
  }

  async transaction<T>(fn: (trx: DbClient) => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      // SQLite é single-connection aqui; reentrância só é segura se já estamos dentro de uma transação.
      return fn(this);
    }
    this.inTransaction = true;
    this.db.exec("BEGIN");
    try {
      const result = await fn(this);
      this.db.exec("COMMIT");
      return result;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    } finally {
      this.inTransaction = false;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

let singleton: DbClient | null = null;

export interface DbClientOptions {
  driver?: DbDriver;
  connectionString?: string;
  sqlitePath?: string;
  /** Instância já aberta de better-sqlite3 (usado em testes de integração com banco em memória). */
  sqliteInstance?: Database.Database;
  /** Pool compatível com a API do `pg.Pool` já construído (ex.: pg-mem em testes de integração do dialeto Postgres). */
  postgresPool?: PgLikePool;
}

/** Constrói uma instância nova e independente de DbClient (não usa/afeta o singleton global). */
export function createDbClient(opts: DbClientOptions = {}): DbClient {
  const driver = (opts.driver || process.env.DB_DRIVER || "sqlite").toLowerCase() as DbDriver;

  if (driver === "postgres") {
    if (opts.postgresPool) {
      return new PostgresDbClient(opts.postgresPool, opts.postgresPool);
    }
    const connectionString = opts.connectionString || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DB_DRIVER=postgres requer DATABASE_URL configurado.");
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool: PgPool } = require("pg") as typeof import("pg");
    const pool: Pool = new PgPool({ connectionString });
    return new PostgresDbClient(pool, pool);
  }

  let db = opts.sqliteInstance;
  if (!db) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SqliteDatabase = require("better-sqlite3") as typeof Database;
    db = new SqliteDatabase(opts.sqlitePath || process.env.SQLITE_PATH || "local.db");
  }
  db.pragma("foreign_keys = ON");
  return new SqliteDbClient(db);
}

/** Retorna o cliente de banco de dados compartilhado pelo processo (lazy singleton). */
export function getDbClient(): DbClient {
  if (!singleton) {
    singleton = createDbClient();
  }
  return singleton;
}

/** Substitui o singleton ativo (usado em testes para injetar um DbClient em memória). */
export function setDbClientForTesting(client: DbClient | null): void {
  singleton = client;
}
