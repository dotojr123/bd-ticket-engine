import { program } from "commander";
import * as fs from "fs";
import * as path from "path";
import { generateSchemasString } from "../lib/codegen/schema-generator";
import { generateTypesString } from "../lib/codegen/types-generator";
import { generateRouterString } from "../lib/codegen/router-generator";
import { generateExpressRouterString } from "../lib/codegen/express-router-generator";
import { generateHooksString } from "../lib/codegen/hooks-generator";
import { generateDrizzleSchemaString, DrizzleDriver } from "../lib/codegen/drizzle-generator";
import { loadManifest, writeManifest, calculateSHA256 } from "../lib/codegen/manifest";
import { validateMetadata } from "../lib/codegen/metadata-schema";
import { logMetric } from "../lib/utils/logger";
import { resolveEnvPaths } from "../lib/utils/env-paths";
import * as cli from "../lib/utils/cli-output";

program
  .version("1.0.0")
  .description("BD-Ticket Codegen — Gera contratos, schemas e rotas a partir do metadata.json")
  .option("--check-only", "Verifica se há drifts de modificações manuais comparando os hashes SHA-256", false)
  .option("--dry-run", "Mostra o que seria gerado sem escrever nenhum arquivo em disco", false)
  .option("-e, --env <env>", "Lê o metadata.json isolado de _reversa_sdd/<env>/ em vez do caminho padrão")
  .option("-t, --target <framework>", "Framework HTTP do router gerado: 'hono' (default), 'express' ou 'both'", "hono")
  .option(
    "--drizzle <driver>",
    "Gera também um schema Drizzle ORM tipado por tabela ('postgres' ou 'sqlite'), como camada de acesso a dados adicional e opcional"
  )
  .action(async (options) => {
    const target = String(options.target).toLowerCase();
    const generateHono = target === "hono" || target === "both";
    const generateExpress = target === "express" || target === "both";
    if (!generateHono && !generateExpress) {
      console.error(cli.error(`--target inválido: '${options.target}'. Use 'hono', 'express' ou 'both'.`));
      process.exit(1);
    }

    let drizzleDriver: DrizzleDriver | null = null;
    if (options.drizzle) {
      const requested = String(options.drizzle).toLowerCase();
      if (requested !== "postgres" && requested !== "sqlite") {
        console.error(cli.error(`--drizzle inválido: '${options.drizzle}'. Use 'postgres' ou 'sqlite'.`));
        process.exit(1);
      }
      drizzleDriver = requested as DrizzleDriver;
    }
    const { metadataPath } = resolveEnvPaths(options.env);
    const contractsDir = path.resolve("src", "contracts");
    const manifestPath = path.join(contractsDir, "manifest.json");
    const startedAt = Date.now();

    if (!fs.existsSync(metadataPath)) {
      console.error(cli.error(`Arquivo de metadados '${cli.fileLink(metadataPath)}' não encontrado.`));
      console.error(cli.fix(`Rode: npm run db:extract-metadata${options.env ? ` -- --env ${options.env}` : ""}`));
      process.exit(1);
    }

    try {
      const rawMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));

      const validation = validateMetadata(rawMetadata);
      if (!validation.success) {
        console.error(cli.error("metadata.json não passou na validação estrutural:"));
        validation.errors.forEach((err) => console.error(`  => ${err}`));
        console.error(cli.fix("Corrija os campos apontados acima e rode novamente. Se o metadata.json foi editado manualmente, prefira regenerá-lo com npm run db:extract-metadata."));
        process.exit(1);
      }

      const metadata = validation.data!;
      const tables = metadata.tables || {};

      const filesToTrack: string[] = [];

      // Garantir estrutura de diretórios
      if (!options.checkOnly && !options.dryRun) {
        fs.mkdirSync(path.join(contractsDir, "schemas"), { recursive: true });
        fs.mkdirSync(path.join(contractsDir, "types"), { recursive: true });
        fs.mkdirSync(path.join(contractsDir, "hooks"), { recursive: true });
        if (generateHono) fs.mkdirSync(path.join(contractsDir, "router"), { recursive: true });
        if (generateExpress) fs.mkdirSync(path.join(contractsDir, "router-express"), { recursive: true });
        if (drizzleDriver) fs.mkdirSync(path.join(contractsDir, "drizzle"), { recursive: true });
      }

      // Se a flag --check-only estiver ativa, fazemos apenas a checagem
      if (options.checkOnly) {
        console.log(cli.info("Executando verificação de integridade de hashes (anti-drift)..."));
        const manifest = loadManifest(manifestPath);
        if (!manifest) {
          console.warn(cli.warn("Manifesto de integridade não encontrado. Nenhuma checagem pôde ser realizada."));
          process.exit(0);
        }

        let driftDetected = false;
        for (const [filePath, expectedHash] of Object.entries(manifest.files) as any[]) {
          if (!fs.existsSync(filePath)) {
            console.error(cli.error(`[DRIFT] Arquivo gerado ausente: '${cli.fileLink(filePath)}'`));
            driftDetected = true;
            continue;
          }
          const actualHash = calculateSHA256(filePath);
          if (actualHash !== expectedHash) {
            console.error(cli.error(`[DRIFT] Modificação manual detectada em: '${cli.fileLink(filePath)}' (SHA-256 divergente)`));
            driftDetected = true;
          }
        }

        if (driftDetected) {
          console.error(cli.error("[FAIL-FAST] Modificações manuais em arquivos de contrato detectadas! O build deve falhar."));
          console.error(cli.fix("Rode: npm run db:validate -- --fix"));
          process.exit(1);
        } else {
          console.log(cli.success("Todos os arquivos gerados estão íntegros e livres de modificações manuais."));
          process.exit(0);
        }
      }

      // LOOP por tabelas para a geração do código
      for (const [tableName, tableDef] of Object.entries(tables) as any[]) {
        // 1. Gerar strings de schemas Zod
        const columns = tableDef.columns || {};
        const schemaString = generateSchemasString(tableName, columns, tableDef.options || {});

        // 2. Gerar arquivo de Types TypeScript
        const typesString = generateTypesString(tableName);

        // 3. Gerar arquivo(s) de Router (CRUD real, RBAC via JWT, FK checks, paginação) — um ou
        //    ambos os frameworks alvo, ambos sobre o mesmo crud-engine e núcleo de auth/rate-limit
        const routerString = generateHono ? generateRouterString(tableName, columns, tableDef.options || {}) : null;
        const expressRouterString = generateExpress ? generateExpressRouterString(tableName, columns, tableDef.options || {}) : null;

        // 4. Gerar hooks React Query tipados para o frontend (fecha o ciclo full-stack)
        const hooksString = generateHooksString(tableName);

        // 5. Gerar schema Drizzle ORM tipado (opcional, camada adicional de acesso a dados)
        const drizzleString = drizzleDriver ? generateDrizzleSchemaString(tableName, columns, drizzleDriver) : null;

        if (options.dryRun) {
          const parts = [`schemas/${tableName}.ts`, `types/${tableName}.ts`, `hooks/${tableName}.ts`];
          if (generateHono) parts.push(`router/${tableName}.ts`);
          if (generateExpress) parts.push(`router-express/${tableName}.ts`);
          if (drizzleDriver) parts.push(`drizzle/${tableName}.ts`);
          console.log(cli.info(`[DRY-RUN] Tabela '${tableName}': geraria ${parts.join(", ")}`));
          continue;
        }

        const schemaPath = path.join(contractsDir, "schemas", `${tableName}.ts`);
        fs.writeFileSync(schemaPath, schemaString, "utf-8");
        filesToTrack.push(schemaPath);

        const typesPath = path.join(contractsDir, "types", `${tableName}.ts`);
        fs.writeFileSync(typesPath, typesString, "utf-8");
        filesToTrack.push(typesPath);

        if (routerString) {
          const routerPath = path.join(contractsDir, "router", `${tableName}.ts`);
          fs.writeFileSync(routerPath, routerString, "utf-8");
          filesToTrack.push(routerPath);
        }

        if (expressRouterString) {
          const expressRouterPath = path.join(contractsDir, "router-express", `${tableName}.ts`);
          fs.writeFileSync(expressRouterPath, expressRouterString, "utf-8");
          filesToTrack.push(expressRouterPath);
        }

        const hooksPath = path.join(contractsDir, "hooks", `${tableName}.ts`);
        fs.writeFileSync(hooksPath, hooksString, "utf-8");
        filesToTrack.push(hooksPath);

        if (drizzleString) {
          const drizzlePath = path.join(contractsDir, "drizzle", `${tableName}.ts`);
          fs.writeFileSync(drizzlePath, drizzleString, "utf-8");
          filesToTrack.push(drizzlePath);
        }
      }

      if (options.dryRun) {
        console.log(cli.success("Dry-run concluído. Nenhum arquivo foi escrito em disco."));
        process.exit(0);
      }

      // Gerar e gravar o manifesto com os hashes corretos
      writeManifest(manifestPath, filesToTrack);
      console.log(cli.success(`Geração de contratos e rotas concluída com sucesso! (${filesToTrack.length} arquivo(s) em ${cli.fileLink(contractsDir)})`));
      console.log(cli.dim("  Próximo passo: npm run db:validate"));
      logMetric("codegen", { tableCount: Object.keys(tables).length, filesGenerated: filesToTrack.length, durationMs: Date.now() - startedAt });

    } catch (e: any) {
      console.error(cli.error(`Falha crítica na geração de código:\n  => ${e.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);
