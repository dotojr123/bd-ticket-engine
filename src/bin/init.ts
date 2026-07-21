import { program } from "commander";
import * as p from "@clack/prompts";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { extractD1Schema } from "../lib/db/d1";
import { extractPostgresSchema } from "../lib/db/postgres";
import { detectFromPackageJson } from "../lib/utils/detect-project";

// transplant-core.js vive em scripts/, fora de src/ (rootDir do build) — carregado via require()
// em runtime para não violar o rootDir do tsc. Mesmo módulo usado por scripts/transplant.js, para
// nunca duplicar a lista de arquivos copiados (uma rodada anterior já ficou com essas duas listas
// divergentes e quebrou o transplante).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const transplantCore = require(path.join(__dirname, "..", "..", "scripts", "transplant-core")) as {
  runTransplant: (targetDir: string, options?: { sourceRoot?: string }) => {
    copied: string[];
    missing: string[];
    packageJsonFound: boolean;
    scriptsInjected: boolean;
  };
  INSTALL_DEPS: string;
  INSTALL_DEV_DEPS: string;
};
const { runTransplant, INSTALL_DEPS, INSTALL_DEV_DEPS } = transplantCore;

function abortIfCancelled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Inicialização cancelada.");
    process.exit(1);
  }
  return value as T;
}

program
  .version("1.0.0")
  .description("BD-Ticket Init — Wizard interativo para injetar o motor num projeto existente")
  .option("-t, --target <path>", "Diretório de destino (default: diretório atual)", ".")
  .action(async (options) => {
    const targetDir = path.resolve(options.target);

    p.intro("BD-Ticket Engine — inicialização");

    if (!fs.existsSync(targetDir)) {
      p.cancel(`O diretório de destino '${targetDir}' não existe. Crie-o antes de rodar o init.`);
      process.exit(1);
    }

    const pkgPath = path.join(targetDir, "package.json");
    if (!fs.existsSync(pkgPath)) {
      const create = abortIfCancelled(
        await p.confirm({ message: `Não encontrei um package.json em ${targetDir}. Criar um mínimo agora?` })
      );
      if (!create) {
        p.cancel("Sem package.json, não há onde injetar os scripts. Rode 'npm init -y' e tente de novo.");
        process.exit(1);
      }
      fs.writeFileSync(
        pkgPath,
        JSON.stringify({ name: path.basename(targetDir), version: "0.1.0", type: "commonjs", scripts: {} }, null, 2)
      );
    }

    const detected = detectFromPackageJson(targetDir);

    // 1. Framework HTTP
    let framework: "hono" | "express" = "hono";
    if (detected.hasHono && !detected.hasExpress) {
      p.log.info("Detectei 'hono' já instalado — vou gerar rotas Hono.");
    } else if (detected.hasExpress && !detected.hasHono) {
      framework = "express";
      p.log.info("Detectei 'express' já instalado — vou gerar rotas Express.");
    } else {
      framework = abortIfCancelled(
        await p.select({
          message: "Qual framework HTTP este projeto usa?",
          options: [
            { value: "hono", label: "Hono (recomendado, mais leve)" },
            { value: "express", label: "Express" }
          ]
        })
      );
    }

    // 2. Driver de banco
    let driver: "postgres" | "sqlite" = "sqlite";
    if (detected.hasPg && !detected.hasSqlite) {
      driver = "postgres";
      p.log.info("Detectei 'pg' já instalado — assumindo Postgres.");
    } else if (detected.hasSqlite && !detected.hasPg) {
      p.log.info("Detectei 'better-sqlite3' já instalado — assumindo SQLite.");
    } else {
      driver = abortIfCancelled(
        await p.select({
          message: "Qual banco de dados você vai usar?",
          options: [
            { value: "sqlite", label: "SQLite local (mais fácil para começar)" },
            { value: "postgres", label: "PostgreSQL" }
          ]
        })
      );
    }

    let databaseUrl: string | null = null;
    let sqlitePath = "local.db";
    let discoveredTables: string[] = [];

    if (driver === "postgres") {
      databaseUrl = abortIfCancelled(
        await p.password({ message: "Connection string do PostgreSQL (DATABASE_URL):" })
      );
      const s = p.spinner();
      s.start("Conectando e listando tabelas...");
      try {
        const schema = await extractPostgresSchema(databaseUrl);
        discoveredTables = Object.keys(schema);
        s.stop(`${discoveredTables.length} tabela(s) encontrada(s).`);
      } catch (err: any) {
        s.stop("Não consegui conectar agora — sem problema, você roda a extração depois.");
        p.log.warn(err.message);
      }
    } else {
      sqlitePath = abortIfCancelled(
        await p.text({ message: "Caminho do arquivo SQLite:", initialValue: "local.db" })
      );
      const resolvedPath = path.resolve(targetDir, sqlitePath);
      if (fs.existsSync(resolvedPath)) {
        const s = p.spinner();
        s.start("Lendo tabelas do banco...");
        try {
          const schema = await extractD1Schema(resolvedPath, path.join(targetDir, "bd-ticket.config.json"));
          discoveredTables = Object.keys(schema);
          s.stop(`${discoveredTables.length} tabela(s) encontrada(s).`);
        } catch (err: any) {
          s.stop("Falha ao ler o banco.");
          p.log.warn(err.message);
        }
      } else {
        p.log.warn(`'${resolvedPath}' ainda não existe — crie o banco e rode 'npm run db:extract-metadata' depois.`);
      }
    }

    let selectedTables: string[] = discoveredTables;
    if (discoveredTables.length > 0) {
      selectedTables = abortIfCancelled(
        await p.multiselect({
          message: "Quais tabelas você quer incluir no bd-ticket.config.json inicial?",
          options: discoveredTables.map((t) => ({ value: t, label: t })),
          initialValues: discoveredTables
        })
      );
    }

    // 3. Transplante dos arquivos
    const s = p.spinner();
    s.start("Copiando os arquivos do motor...");
    const result = runTransplant(targetDir);
    s.stop(`${result.copied.length} arquivo(s) copiado(s).`);
    if (result.missing.length > 0) {
      p.log.warn(`Não encontrados na origem (ignorados): ${result.missing.join(", ")}`);
    }

    // 4. bd-ticket.config.json inicial com as tabelas selecionadas
    if (selectedTables.length > 0) {
      const config = {
        project: path.basename(targetDir),
        tables: Object.fromEntries(selectedTables.map((t) => [t, { columns: {} }]))
      };
      fs.writeFileSync(path.join(targetDir, "bd-ticket.config.json"), JSON.stringify(config, null, 2));
    }

    // 5. .env com JWT_SECRET gerado + a config de banco escolhida
    const envPath = path.join(targetDir, ".env");
    const envLines = [`JWT_SECRET=${crypto.randomBytes(32).toString("hex")}`, `DB_DRIVER=${driver}`];
    if (driver === "postgres" && databaseUrl) envLines.push(`DATABASE_URL=${databaseUrl}`);
    if (driver === "sqlite") envLines.push(`SQLITE_PATH=${sqlitePath}`);
    const existingEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
    fs.writeFileSync(envPath, existingEnv + (existingEnv ? "\n" : "") + envLines.join("\n") + "\n");

    p.note(
      `${INSTALL_DEPS}${framework === "express" ? " express" : ""}`,
      "npm install"
    );
    p.note(INSTALL_DEV_DEPS + (framework === "express" ? " @types/express" : ""), "npm install -D");

    if (framework === "express") {
      p.log.info(
        "Para Express, copie manualmente src/lib/runtime/express-adapters.ts do repositório do motor e rode 'npm run db:codegen -- --target express'."
      );
    }

    p.outro(
      selectedTables.length > 0
        ? "Pronto! Rode 'npm run db:extract-metadata' e depois 'npm run db:codegen' para gerar os contratos."
        : "Pronto! Configure seu banco, rode 'npm run db:extract-metadata' e depois 'npm run db:codegen'."
    );
  });

program.parse(process.argv);
