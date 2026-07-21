import { Client } from "pg";

export interface ColumnDefinition {
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references: string | null;
  /** Regra de exclusão referencial (ON DELETE) do banco físico, quando isForeignKey=true. */
  onDelete?: "CASCADE" | "RESTRICT" | "SET NULL" | "SET DEFAULT" | "NO ACTION" | null;
  /** Cardinalidade inferida do relacionamento a partir de constraints físicas (FK também UNIQUE => 1:1). */
  cardinality?: "one-to-one" | "many-to-one" | null;
  metadata: any;
}

export interface TableOptions {
  /** Quando true, DELETE gerado marca deleted_at em vez de remover a linha fisicamente. */
  soft_delete?: boolean;
  /** Nome da coluna que identifica o dono do registro, usada para permissão em nível de linha. */
  owner_field?: string;
}

export interface TableDefinition {
  columns: { [columnName: string]: ColumnDefinition };
  options?: TableOptions;
}

export interface SchemaDefinition {
  project: string;
  version: string;
  tables: { [tableName: string]: TableDefinition };
}

function parseMetadataComment(rawComment: string | null): any {
  if (!rawComment) return {};
  try {
    const parsed = JSON.parse(rawComment);
    return parsed.metadata || parsed;
  } catch {
    return { _raw_comment: rawComment, _invalid_json: true };
  }
}

/**
 * Conecta ao PostgreSQL e extrai o catálogo físico com as etiquetas nos comentários.
 * Usa um número fixo de consultas (independente da quantidade de tabelas) para evitar
 * o padrão N+1 de uma query por tabela.
 */
export async function extractPostgresSchema(connectionString: string): Promise<{ [tableName: string]: TableDefinition }> {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const tables: { [tableName: string]: TableDefinition } = {};

    // 1. Tabelas base do schema public
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    for (const row of tablesRes.rows) {
      tables[row.table_name] = { columns: {} };
    }

    // 2. Todas as colunas de todas as tabelas em uma única query
    const columnsRes = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public';
    `);
    for (const col of columnsRes.rows) {
      if (!tables[col.table_name]) continue;
      tables[col.table_name].columns[col.column_name] = {
        type: col.data_type,
        isNullable: col.is_nullable === "YES",
        isPrimaryKey: false,
        isForeignKey: false,
        references: null,
        onDelete: null,
        cardinality: null,
        metadata: {}
      };
    }

    // 3. Comentários de coluna (etiquetas de metadados) em uma única query
    const columnCommentsRes = await client.query(`
      SELECT c.relname AS table_name, a.attname AS column_name,
             pg_catalog.col_description(c.oid, a.attnum) AS comment
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped;
    `);
    for (const row of columnCommentsRes.rows) {
      const col = tables[row.table_name]?.columns[row.column_name];
      if (col) col.metadata = parseMetadataComment(row.comment);
    }

    // 4. Comentários de tabela (opções de tabela: soft_delete, owner_field) em uma única query
    const tableCommentsRes = await client.query(`
      SELECT c.relname AS table_name, pg_catalog.obj_description(c.oid) AS comment
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r';
    `);
    for (const row of tableCommentsRes.rows) {
      const table = tables[row.table_name];
      if (!table || !row.comment) continue;
      const parsed = parseMetadataComment(row.comment);
      if (parsed && !parsed._invalid_json) {
        table.options = parsed.options || undefined;
      }
    }

    // 5. Chaves primárias em uma única query
    const pkRes = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public';
    `);
    for (const row of pkRes.rows) {
      const col = tables[row.table_name]?.columns[row.column_name];
      if (col) col.isPrimaryKey = true;
    }

    // 6. Colunas cobertas por constraint UNIQUE (usado para inferir cardinalidade 1:1 de FKs)
    const uniqueRes = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public';
    `);
    const uniqueColumns = new Set(uniqueRes.rows.map((r) => `${r.table_name}.${r.column_name}`));

    // 7. Chaves estrangeiras + regra de ON DELETE em uma única query
    const fkRes = await client.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_column,
             rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `);
    for (const row of fkRes.rows) {
      const col = tables[row.table_name]?.columns[row.column_name];
      if (!col) continue;
      col.isForeignKey = true;
      col.references = `${row.ref_table}.${row.ref_column}`;
      col.onDelete = row.delete_rule || "NO ACTION";
      col.cardinality = uniqueColumns.has(`${row.table_name}.${row.column_name}`) ? "one-to-one" : "many-to-one";
    }

    return tables;
  } finally {
    await client.end();
  }
}
