import { program } from "commander";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { scanDirectory } from "../lib/validator/scanner";
import { auditFileContent } from "../lib/validator/parser";
import { checkDrifts } from "../lib/validator/drift";

const DRIFT_FIX_HINT = "[FIX SUGERIDO] Rode: npm run db:codegen  (ou 'npm run db:validate -- --fix' para regenerar automaticamente)";
const ORPHAN_FIX_HINT =
  "[FIX SUGERIDO] Confira se a tabela existe em _reversa_sdd/metadata.json. Se ela foi renomeada/removida no banco, rode: npm run db:extract-metadata && npm run db:codegen. Se a referência no código está errada, corrija o nome manualmente.";

function printIssue(message: string, hint: string, warnOnly: boolean) {
  const log = warnOnly ? console.warn : console.error;
  log(`[${warnOnly ? "WARNING" : "ERROR"}] ${message}`);
  log(`  ${hint}`);
}

program
  .version("1.0.0")
  .description("BD-Ticket Auditor — Varre código e manifestos contra drifts e referências órfãs")
  .option("--warn-only", "Apenas exibe avisos sem interromper a execução (Exit Code 0)", false)
  .option("--fix", "Ao detectar drift de contratos gerados, roda 'db:codegen' automaticamente para resincronizar e reaudita em seguida", false)
  .action(async (options) => {
    const metadataPath = path.resolve("_reversa_sdd", "metadata.json");
    const manifestPath = path.resolve("src", "contracts", "manifest.json");
    const srcDir = path.resolve("src");

    let hasErrors = false;
    let hasDrift = false;

    console.log("[INFO] Iniciando auditoria de integridade do BD-Ticket...");

    // 1. Validar e carregar o metadata.json
    if (!fs.existsSync(metadataPath)) {
      console.error(`[ERROR] Arquivo de metadados '${metadataPath}' não encontrado.`);
      console.error("  [FIX SUGERIDO] Rode: npm run db:extract-metadata");
      process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    const validTables = Object.keys(metadata.tables || {});

    // 2. Checar drifts de modificações manuais (SHA-256)
    console.log("[INFO] Executando checagem de integridade (Drift Check)...");
    const driftErrors = checkDrifts(manifestPath);
    if (driftErrors.length > 0) {
      hasErrors = true;
      hasDrift = true;
      driftErrors.forEach((err) => printIssue(err, DRIFT_FIX_HINT, options.warnOnly));
    }

    if (hasDrift && options.fix) {
      console.log("[FIX] Drift detectado — regenerando contratos automaticamente via 'npm run db:codegen'...");
      try {
        execSync("npx tsx src/bin/codegen.ts", { stdio: "inherit" });
        const recheck = checkDrifts(manifestPath);
        if (recheck.length === 0) {
          console.log("[FIX] Contratos resincronizados com sucesso. Reaudite para confirmar.");
          hasErrors = false;
          hasDrift = false;
        } else {
          console.error("[FIX] Drift persistiu mesmo após regenerar — revise manualmente.");
        }
      } catch (fixErr: any) {
        console.error(`[FIX] Falha ao regenerar contratos automaticamente: ${fixErr.message}`);
      }
    }

    // 3. Varredura estática de referências de UI em src/
    console.log("[INFO] Executando varredura estática de referências de código (App Scan)...");
    const appFiles = scanDirectory(srcDir);

    appFiles.forEach((file) => {
      // Ignorar a própria CLI e biblioteca do validator para evitar autorreferência
      if (file.includes("validator") || file.includes("codegen")) return;

      const content = fs.readFileSync(file, "utf-8");
      const auditResult = auditFileContent(file, content, validTables);

      if (auditResult.errors.length > 0) {
        hasErrors = true;
        auditResult.errors.forEach((err) => printIssue(err, ORPHAN_FIX_HINT, options.warnOnly));
      }
    });

    if (hasErrors) {
      if (options.warnOnly) {
        console.log("[SUCCESS] Auditoria concluída com avisos (Bypass --warn-only ativo).");
        process.exit(0);
      } else {
        console.error("[FAIL-FAST] Falha crítica de integridade detectada! O build foi abortado.");
        process.exit(1);
      }
    }

    console.log("[SUCCESS] Auditoria de integridade concluída! Código 100% em conformidade.");
    process.exit(0);
  });

program.parse(process.argv);
