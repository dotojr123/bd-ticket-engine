import Database from "better-sqlite3";
import * as fs from "fs";
import { TableDefinition, ColumnDefinition } from "./postgres";

/**
 * Conecta ao SQLite e extrai a estrutura física, mesclando com o config JSON local.
 */
export async function extractD1Schema(
  dbPath: string,
  configPath: string
): Promise<{ [tableName: string]: TableDefinition }> {
  const db = new Database(dbPath);
  const tables: { [tableName: string]: TableDefinition } = {};

  try {
    // 1. Carrega o arquivo de configuração local de metadados se existir
    let localConfig: any = {};
    if (fs.existsSync(configPath)) {
      try {
        const rawConfig = fs.readFileSync(configPath, "utf-8");
        localConfig = JSON.parse(rawConfig);
      } catch (e) {
        console.warn(`[WARNING] Erro de parsing no arquivo de metadados local '${configPath}'. Ignorando configurações de etiquetas.`);
      }
    }

    // 2. Extrai as tabelas físicas do SQLite
    const tablesRes = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").all();

    for (const tableRow of tablesRes as any[]) {
      const tableName = tableRow.name;
      tables[tableName] = { columns: {} };

      // Obter colunas e PK
      const columnsRes = db.prepare(`PRAGMA table_info(${tableName});`).all();
      // Obter FKs
      const fksRes = db.prepare(`PRAGMA foreign_key_list(${tableName});`).all() as any[];

      for (const colRow of columnsRes as any[]) {
        const columnName = colRow.name;
        const isPrimaryKey = colRow.pk > 0;

        // Verificar se é chave estrangeira
        const fk = fksRes.find((f) => f.from === columnName);
        const isForeignKey = !!fk;
        const references = fk ? `${fk.table}.${fk.to}` : null;

        // Mescla metadados do arquivo local config
        const localMeta = localConfig.tables?.[tableName]?.columns?.[columnName] || {};
        // Se já existirem propriedades de negócios, aninha no objeto "metadata"
        const metadata = localMeta.metadata || localMeta;

        tables[tableName].columns[columnName] = {
          type: colRow.type.toLowerCase(),
          isNullable: colRow.notnull === 0,
          isPrimaryKey,
          isForeignKey,
          references,
          metadata
        };
      }
    }

    return tables;
  } finally {
    db.close();
  }
}
