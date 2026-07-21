import { Client } from "pg";

export interface ColumnDefinition {
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references: string | null;
  metadata: any;
}

export interface TableDefinition {
  columns: { [columnName: string]: ColumnDefinition };
}

export interface SchemaDefinition {
  project: string;
  version: string;
  tables: { [tableName: string]: TableDefinition };
}

/**
 * Conecta ao PostgreSQL e extrai o catálogo físico com as etiquetas nos comentários.
 */
export async function extractPostgresSchema(connectionString: string): Promise<{ [tableName: string]: TableDefinition }> {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const tables: { [tableName: string]: TableDefinition } = {};

    // 1. Obter tabelas da base
    const tablesRes = await client.query(`
      SELECT 
        t.table_name
      FROM 
        information_schema.tables t
      WHERE 
        t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE';
    `);

    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      tables[tableName] = { columns: {} };

      // 2. Obter colunas e comentários de cada coluna
      const columnsRes = await client.query(`
        SELECT 
          cols.column_name,
          cols.data_type,
          cols.is_nullable,
          pg_catalog.col_description(c.oid, cols.ordinal_position::int) as column_comment,
          (
            SELECT EXISTS (
              SELECT 1 FROM information_schema.table_constraints tc 
              JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
              WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = cols.table_name AND kcu.column_name = cols.column_name
            )
          ) as is_primary,
          (
            SELECT EXISTS (
              SELECT 1 FROM information_schema.table_constraints tc 
              JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
              WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = cols.table_name AND kcu.column_name = cols.column_name
            )
          ) as is_foreign,
          (
            SELECT ccu.table_name || '.' || ccu.column_name 
            FROM information_schema.table_constraints tc 
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = cols.table_name AND kcu.column_name = cols.column_name
            LIMIT 1
          ) as references_to
        FROM 
          information_schema.columns cols
        JOIN 
          pg_catalog.pg_class c ON c.relname = cols.table_name
        JOIN 
          pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE 
          cols.table_schema = 'public' 
          AND n.nspname = 'public'
          AND cols.table_name = $1;
      `, [tableName]);

      for (const colRow of columnsRes.rows) {
        const columnName = colRow.column_name;
        let metadata: any = {};

        // Decodifica o comentário JSON se existir
        if (colRow.column_comment) {
          try {
            const parsed = JSON.parse(colRow.column_comment);
            metadata = parsed.metadata || parsed;
          } catch (e) {
            // Em caso de parse inválido, lança erro no modo strict no extractor principal,
            // mas aqui apenas repassamos o comentário bruto em formato string
            metadata = { _raw_comment: colRow.column_comment, _invalid_json: true };
          }
        }

        tables[tableName].columns[columnName] = {
          type: colRow.data_type,
          isNullable: colRow.is_nullable === "YES",
          isPrimaryKey: colRow.is_primary,
          isForeignKey: colRow.is_foreign,
          references: colRow.references_to || null,
          metadata
        };
      }
    }

    return tables;
  } finally {
    await client.end();
  }
}
