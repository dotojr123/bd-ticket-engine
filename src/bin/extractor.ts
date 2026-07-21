import { program } from "commander";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { extractPostgresSchema } from "../lib/db/postgres";
import { extractD1Schema } from "../lib/db/d1";
import { sortObjectDeep } from "../lib/utils/sort";

// Carregar variáveis de ambiente do .env
dotenv.config();

program
  .version("1.0.0")
  .description("BD-Ticket Extractor — Extrai schemas e metadados estruturados para metadata.json")
  .option("-d, --driver <driver>", "Define o driver de banco: 'postgres' ou 'd1' (SQLite)", "postgres")
  .option("-u, --url <url>", "String de conexão do PostgreSQL (DATABASE_URL)")
  .option("-b, --d1-binding <binding>", "Caminho do arquivo de banco SQLite / D1 local", "local.db")
  .option("-c, --config <config>", "Caminho do arquivo local de metadados fallback", "bd-ticket.config.json")
  .option("-s, --strict", "Dispara erro e aborta se encontrar etiquetas de metadados JSON malformados", false)
  .action(async (options) => {
    const outputDir = path.resolve("_reversa_sdd");
    const outputPath = path.join(outputDir, "metadata.json");

    // Garantir que a pasta _reversa_sdd exista
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let tablesSchema: any = {};
    const driver = options.driver.toLowerCase();

    console.log(`[INFO] Iniciando extração com o driver: '${driver}'...`);

    try {
      if (driver === "postgres") {
        const url = options.url || process.env.DATABASE_URL;
        if (!url) {
          throw new Error("String de conexão do PostgreSQL não especificada. Defina DATABASE_URL no .env ou passe via --url.");
        }
        tablesSchema = await extractPostgresSchema(url);
      } else if (driver === "d1" || driver === "sqlite") {
        const dbPath = path.resolve(options.d1Binding);
        const configPath = path.resolve(options.config);
        
        console.log(`[INFO] Lendo banco SQLite/D1 em: ${dbPath}`);
        console.log(`[INFO] Mesclando configuração fallback de: ${configPath}`);

        tablesSchema = await extractD1Schema(dbPath, configPath);
      } else {
        throw new Error(`Driver desconhecido '${driver}'. Use 'postgres' ou 'd1'.`);
      }

      // Validação estrita de JSON malformado se a flag --strict estiver ligada
      if (options.strict) {
        for (const [tableName, tableDef] of Object.entries(tablesSchema) as any[]) {
          for (const [colName, colDef] of Object.entries(tableDef.columns) as any[]) {
            if (colDef.metadata?._invalid_json) {
              throw new Error(`[FAIL-FAST] Comentário de metadado JSON malformado na tabela '${tableName}', coluna '${colName}': "${colDef.metadata._raw_comment}"`);
            }
          }
        }
      }

      // Formatar o metadata.json final com metadados do projeto e versão
      const metadata = {
        project: process.env.PROJECT_NAME || "BD-Ticket",
        version: "1.0.0",
        tables: tablesSchema
      };

      // Ordenação profunda determinística
      const sortedMetadata = sortObjectDeep(metadata);

      // Gravação atômica: cria arquivo temporário e faz rename
      const tempPath = `${outputPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(sortedMetadata, null, 2), "utf-8");
      fs.renameSync(tempPath, outputPath);

      console.log(`[SUCCESS] Extração concluída com sucesso! Contrato gerado em: ${outputPath}`);
    } catch (e: any) {
      console.error(`[ERROR] Ocorreu uma falha crítica na extração:\n  => ${e.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
