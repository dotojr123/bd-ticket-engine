import { program } from "commander";
import * as fs from "fs";
import * as path from "path";
import { scanDirectory } from "../lib/validator/scanner";
import { auditFileContent } from "../lib/validator/parser";
import { checkDrifts } from "../lib/validator/drift";

program
  .version("1.0.0")
  .description("BD-Ticket Auditor — Varre código e manifestos contra drifts e referências órfãs")
  .option("--warn-only", "Apenas exibe avisos sem interromper a execução (Exit Code 0)", false)
  .action(async (options) => {
    const metadataPath = path.resolve("_reversa_sdd", "metadata.json");
    const manifestPath = path.resolve("src", "contracts", "manifest.json");
    const srcDir = path.resolve("src");

    let hasErrors = false;

    console.log("[INFO] Iniciando auditoria de integridade do BD-Ticket...");

    // 1. Validar e carregar o metadata.json
    if (!fs.existsSync(metadataPath)) {
      console.error(`[ERROR] Arquivo de metadados '${metadataPath}' não encontrado.`);
      process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    const validTables = Object.keys(metadata.tables || {});

    // 2. Checar drifts de modificações manuais (SHA-256)
    console.log("[INFO] Executando checagem de integridade (Drift Check)...");
    const driftErrors = checkDrifts(manifestPath);
    if (driftErrors.length > 0) {
      hasErrors = true;
      driftErrors.forEach((err) => {
        if (options.warnOnly) {
          console.warn(`[WARNING] ${err}`);
        } else {
          console.error(`[ERROR] ${err}`);
        }
      });
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
        auditResult.errors.forEach((err) => {
          if (options.warnOnly) {
            console.warn(`[WARNING] ${err}`);
          } else {
            console.error(`[ERROR] ${err}`);
          }
        });
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
