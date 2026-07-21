import { program } from "commander";
import * as fs from "fs";
import * as path from "path";
import { buildFieldZodSchema } from "../lib/codegen/zod-mapper";
import { generateTypesString } from "../lib/codegen/types-generator";
import { generateRouterString } from "../lib/codegen/router-generator";
import { loadManifest, writeManifest, calculateSHA256 } from "../lib/codegen/manifest";

program
  .version("1.0.0")
  .description("BD-Ticket Codegen — Gera contratos, schemas e rotas a partir do metadata.json")
  .option("--check-only", "Verifica se há drifts de modificações manuais comparando os hashes SHA-256", false)
  .action(async (options) => {
    const metadataPath = path.resolve("_reversa_sdd", "metadata.json");
    const contractsDir = path.resolve("src", "contracts");
    const manifestPath = path.join(contractsDir, "manifest.json");

    if (!fs.existsSync(metadataPath)) {
      console.error(`[ERROR] Arquivo de metadados '${metadataPath}' não encontrado. Rode o extrator primeiro.`);
      process.exit(1);
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
      const tables = metadata.tables || {};

      const filesToTrack: string[] = [];

      // Garantir estrutura de diretórios
      if (!options.checkOnly) {
        fs.mkdirSync(path.join(contractsDir, "schemas"), { recursive: true });
        fs.mkdirSync(path.join(contractsDir, "types"), { recursive: true });
        fs.mkdirSync(path.join(contractsDir, "router"), { recursive: true });
      }

      // Se a flag --check-only estiver ativa, fazemos apenas a checagem
      if (options.checkOnly) {
        console.log("[INFO] Executando verificação de integridade de hashes (anti-drift)...");
        const manifest = loadManifest(manifestPath);
        if (!manifest) {
          console.warn("[WARNING] Manifesto de integridade não encontrado. Nenhuma checagem pôde ser realizada.");
          process.exit(0);
        }

        let driftDetected = false;
        for (const [filePath, expectedHash] of Object.entries(manifest.files) as any[]) {
          if (!fs.existsSync(filePath)) {
            console.error(`[DRIFT] Arquivo gerado ausente: '${filePath}'`);
            driftDetected = true;
            continue;
          }
          const actualHash = calculateSHA256(filePath);
          if (actualHash !== expectedHash) {
            console.error(`[DRIFT] Modificação manual detectada em: '${filePath}' (SHA-256 divergente)`);
            driftDetected = true;
          }
        }

        if (driftDetected) {
          console.error("[FAIL-FAST] Modificações manuais em arquivos de contrato detectadas! O build deve falhar.");
          process.exit(1);
        } else {
          console.log("[SUCCESS] Todos os arquivos gerados estão íntegros e livres de modificações manuais.");
          process.exit(0);
        }
      }

      // LOOP por tabelas para a geração do código
      for (const [tableName, tableDef] of Object.entries(tables) as any[]) {
        // 1. Gerar strings de schemas Zod
        let schemaString = `import { z } from "zod";\n\n`;

        const columns = tableDef.columns || {};
        
        // Zod Select Schema
        schemaString += `export const ${tableName}SelectSchema = z.object({\n`;
        for (const [colName, colDef] of Object.entries(columns) as any[]) {
          schemaString += `  ${colName}: ${buildFieldZodSchema(colDef)},\n`;
        }
        schemaString += `});\n\n`;

        // Zod Insert Schema (omitindo chaves primárias autoincremento se for serial/integer id)
        schemaString += `export const ${tableName}InsertSchema = z.object({\n`;
        for (const [colName, colDef] of Object.entries(columns) as any[]) {
          if (colDef.isPrimaryKey && colDef.type === "integer") {
            continue; // Omitir ID primário no insert
          }
          schemaString += `  ${colName}: ${buildFieldZodSchema(colDef)},\n`;
        }
        schemaString += `});\n\n`;

        // Zod Update Schema (Insert parcial)
        schemaString += `export const ${tableName}UpdateSchema = ${tableName}InsertSchema.partial();\n`;

        // Gravação atômica do Schema
        const schemaPath = path.join(contractsDir, "schemas", `${tableName}.ts`);
        fs.writeFileSync(schemaPath, schemaString, "utf-8");
        filesToTrack.push(schemaPath);

        // 2. Gerar arquivo de Types TypeScript
        const typesString = generateTypesString(tableName);
        const typesPath = path.join(contractsDir, "types", `${tableName}.ts`);
        fs.writeFileSync(typesPath, typesString, "utf-8");
        filesToTrack.push(typesPath);

        // 3. Gerar arquivo de Router do Hono
        const routerString = generateRouterString(tableName, columns);
        const routerPath = path.join(contractsDir, "router", `${tableName}.ts`);
        fs.writeFileSync(routerPath, routerString, "utf-8");
        filesToTrack.push(routerPath);
      }

      // Gerar e gravar o manifesto com os hashes corretos
      writeManifest(manifestPath, filesToTrack);
      console.log("[SUCCESS] Geração de contratos e rotas concluída com sucesso!");

    } catch (e: any) {
      console.error(`[ERROR] Falha crítica na geração de código:\n  => ${e.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
