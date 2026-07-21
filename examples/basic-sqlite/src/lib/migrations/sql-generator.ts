import { MetadataChange, ColumnSnapshot } from "./differ";

export type MigrationDriver = "postgres" | "sqlite";

function quoteIdent(name: string): string {
  return `"${name}"`;
}

function columnDdl(name: string, col: ColumnSnapshot): string {
  return `${quoteIdent(name)} ${col.type}${col.isNullable ? "" : " NOT NULL"}`;
}

function createTableSql(table: string, columns: Record<string, ColumnSnapshot>): string {
  const cols = Object.entries(columns).map(([name, def]) => columnDdl(name, def));
  return `CREATE TABLE ${quoteIdent(table)} (\n  ${cols.join(",\n  ")}\n);`;
}

/**
 * Gera as instruções SQL de UP e DOWN para uma mudança individual de metadata.
 * Mudanças destrutivas (drop/type change) vêm acompanhadas de um comentário de aviso.
 */
export function generateMigrationSql(change: MetadataChange, driver: MigrationDriver): { up: string; down: string } {
  switch (change.kind) {
    case "table_added":
      return {
        up: createTableSql(change.table, change.columns),
        down: `DROP TABLE ${quoteIdent(change.table)};`
      };

    case "table_removed":
      return {
        up: `-- ATENÇÃO: operação destrutiva, todos os dados da tabela serão perdidos.\nDROP TABLE ${quoteIdent(change.table)};`,
        down: createTableSql(change.table, change.columns)
      };

    case "column_added":
      return {
        up: `ALTER TABLE ${quoteIdent(change.table)} ADD COLUMN ${columnDdl(change.column, { type: change.type, isNullable: change.isNullable })};`,
        down: `ALTER TABLE ${quoteIdent(change.table)} DROP COLUMN ${quoteIdent(change.column)};`
      };

    case "column_removed":
      return {
        up: `-- ATENÇÃO: operação destrutiva, os dados desta coluna serão perdidos.\nALTER TABLE ${quoteIdent(change.table)} DROP COLUMN ${quoteIdent(change.column)};`,
        down: `ALTER TABLE ${quoteIdent(change.table)} ADD COLUMN ${columnDdl(change.column, { type: change.type, isNullable: change.isNullable })};`
      };

    case "column_type_changed":
      if (driver === "sqlite") {
        return {
          up: `-- SQLite não suporta ALTER COLUMN TYPE diretamente. Requer reconstrução manual da tabela\n-- (criar tabela nova com o tipo desejado, copiar dados, DROP + RENAME).\n-- Mudança pretendida: ${change.table}.${change.column} de '${change.from}' para '${change.to}'.`,
          down: `-- Reversão manual: reconstruir ${change.table}.${change.column} de volta para '${change.from}'.`
        };
      }
      return {
        up: `-- ATENÇÃO: operação potencialmente destrutiva se os dados existentes não forem compatíveis com o novo tipo.\nALTER TABLE ${quoteIdent(change.table)} ALTER COLUMN ${quoteIdent(change.column)} TYPE ${change.to};`,
        down: `ALTER TABLE ${quoteIdent(change.table)} ALTER COLUMN ${quoteIdent(change.column)} TYPE ${change.from};`
      };
  }
}

export function generateMigrationScript(changes: MetadataChange[], driver: MigrationDriver): { up: string; down: string } {
  const ups: string[] = [];
  const downs: string[] = [];

  for (const change of changes) {
    const { up, down } = generateMigrationSql(change, driver);
    ups.push(up);
    downs.unshift(down); // DOWN reverte na ordem inversa do UP
  }

  return {
    up: ups.join("\n\n"),
    down: downs.join("\n\n")
  };
}
