import Database from "better-sqlite3";
import * as fs from "fs";
import { TableDefinition, ColumnDefinition } from "./postgres";

const VALID_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Garante que um identificador vindo do próprio catálogo do banco é seguro para interpolar em PRAGMA. */
function assertSafeIdentifier(name: string): string {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(`Identificador de tabela/coluna inesperado ou inseguro: '${name}'`);
  }
  return name;
}

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

    // 2. Extrai as tabelas físicas do SQLite (nomes vêm do próprio catálogo, tratados como confiáveis
    //    mas ainda assim validados contra um whitelist de identificador antes de interpolar em PRAGMA)
    const tablesRes = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").all();

    for (const tableRow of tablesRes as any[]) {
      const tableName = assertSafeIdentifier(tableRow.name);
      tables[tableName] = { columns: {} };

      // Opções de tabela (soft_delete, owner_field) vindas do config local
      const tableOptions = localConfig.tables?.[tableName]?.options;
      if (tableOptions) {
        tables[tableName].options = tableOptions;
      }

      // Obter colunas e PK
      const columnsRes = db.prepare(`PRAGMA table_info("${tableName}");`).all();
      // Obter FKs (better-sqlite3/SQLite já expõe a regra de ON DELETE por linha)
      const fksRes = db.prepare(`PRAGMA foreign_key_list("${tableName}");`).all() as any[];
      // Obter índices para inferir cardinalidade 1:1 em colunas FK cobertas por UNIQUE
      const indexListRes = db.prepare(`PRAGMA index_list("${tableName}");`).all() as any[];
      const uniqueColumns = new Set<string>();
      for (const idx of indexListRes) {
        if (!idx.unique) continue;
        const idxInfo = db.prepare(`PRAGMA index_info("${idx.name}");`).all() as any[];
        if (idxInfo.length === 1) uniqueColumns.add(idxInfo[0].name);
      }

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
          onDelete: fk ? (fk.on_delete || "NO ACTION") : null,
          cardinality: isForeignKey ? (uniqueColumns.has(columnName) ? "one-to-one" : "many-to-one") : null,
          metadata
        };
      }
    }

    return tables;
  } finally {
    db.close();
  }
}
