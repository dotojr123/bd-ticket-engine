import { program } from "commander";
import * as fs from "fs";
import * as path from "path";
import { validateMetadata } from "../lib/codegen/metadata-schema";
import { diffMetadata } from "../lib/migrations/differ";
import { generateMigrationScript, MigrationDriver } from "../lib/migrations/sql-generator";
import { resolveEnvPaths } from "../lib/utils/env-paths";

function loadLatestSnapshot(historyDir: string): { file: string; metadata: any } | null {
  if (!fs.existsSync(historyDir)) return null;
  const files = fs
    .readdirSync(historyDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (files.length === 0) return null;
  const latest = files[files.length - 1];
  const metadata = JSON.parse(fs.readFileSync(path.join(historyDir, latest), "utf-8"));
  return { file: latest, metadata };
}

program
  .version("1.0.0")
  .description("BD-Ticket Migrate — Gera migrações SQL UP/DOWN a partir do diff entre snapshots de metadata.json")
  .option("-d, --driver <driver>", "Dialeto SQL alvo: 'postgres' ou 'sqlite'", "sqlite")
  .option("-f, --force", "Confirma e permite gerar migrações com mudanças destrutivas", false)
  .option("--dry-run", "Mostra o diff e a migração sem escrever arquivos em disco", false)
  .option("-n, --name <name>", "Nome descritivo da migração", "auto")
  .option("-e, --env <env>", "Ambiente nomeado — isola metadata/histórico/migrações em _reversa_sdd/<env>/ e migrations/<env>/")
  .action(async (options) => {
    const { metadataPath, historyDir, migrationsDir } = resolveEnvPaths(options.env);

    if (!fs.existsSync(metadataPath)) {
      console.error(`[ERROR] Arquivo de metadados '${metadataPath}' não encontrado. Rode o extrator primeiro${options.env ? ` (com --env ${options.env})` : ""}.`);
      process.exit(1);
    }

    const rawMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    const validation = validateMetadata(rawMetadata);
    if (!validation.success) {
      console.error("[FAIL-FAST] metadata.json atual não passou na validação estrutural:");
      validation.errors.forEach((err) => console.error(`  => ${err}`));
      process.exit(1);
    }

    const previousSnapshot = loadLatestSnapshot(historyDir);
    const previousMetadata = previousSnapshot
      ? validateMetadata(previousSnapshot.metadata).data || null
      : null;

    const diff = diffMetadata(previousMetadata, validation.data!);

    if (diff.changes.length === 0) {
      console.log("[INFO] Nenhuma mudança de schema detectada desde o último snapshot. Nada a migrar.");
      process.exit(0);
    }

    console.log(`[INFO] ${diff.changes.length} mudança(s) de schema detectada(s):`);
    diff.changes.forEach((c) => console.log(`  - ${c.kind}: ${c.table}${"column" in c ? "." + c.column : ""}`));

    if (diff.destructive.length > 0) {
      console.warn(`[WARNING] ${diff.destructive.length} mudança(s) potencialmente destrutiva(s) (perda de dados):`);
      diff.destructive.forEach((c) => console.warn(`  - ${c.kind}: ${c.table}${"column" in c ? "." + c.column : ""}`));

      if (!options.force) {
        console.error("[FAIL-FAST] Migrações destrutivas requerem confirmação explícita via --force. Nenhum arquivo foi gerado.");
        process.exit(1);
      }
    }

    const driver = options.driver.toLowerCase() as MigrationDriver;
    const script = generateMigrationScript(diff.changes, driver);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const slug = String(options.name).replace(/[^a-z0-9_-]/gi, "_");
    const baseName = `${timestamp}_${slug}`;

    if (options.dryRun) {
      console.log("\n[DRY-RUN] Migração UP:\n" + script.up);
      console.log("\n[DRY-RUN] Migração DOWN:\n" + script.down);
      console.log("\n[SUCCESS] Dry-run concluído. Nenhum arquivo foi escrito em disco.");
      process.exit(0);
    }

    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.mkdirSync(historyDir, { recursive: true });

    const upPath = path.join(migrationsDir, `${baseName}.up.sql`);
    const downPath = path.join(migrationsDir, `${baseName}.down.sql`);
    const snapshotPath = path.join(historyDir, `${timestamp}.json`);

    fs.writeFileSync(upPath, script.up + "\n", "utf-8");
    fs.writeFileSync(downPath, script.down + "\n", "utf-8");
    fs.writeFileSync(snapshotPath, JSON.stringify(rawMetadata, null, 2), "utf-8");

    console.log(`[SUCCESS] Migração gerada em: ${path.relative(process.cwd(), upPath)} (e .down.sql)`);
    console.log(`[SUCCESS] Snapshot de metadata salvo em: ${path.relative(process.cwd(), snapshotPath)}`);
  });

program.parse(process.argv);
