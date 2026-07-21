const fs = require("fs");
const path = require("path");

const FOLDERS_TO_CREATE = [
  "src/bin",
  "src/lib/db",
  "src/lib/codegen",
  "src/lib/validator",
  "src/lib/migrations",
  "src/lib/runtime/core",
  "src/lib/ui",
  "src/lib/utils",
  "src/components",
  "src/contracts",
  "_reversa_sdd"
];

// Fonte única da verdade da lista de arquivos copiados pelo transplante — usada tanto pelo CLI
// `transplant.js` quanto pelo wizard interativo `bd-ticket-init`. Nunca duplique esta lista: uma
// rodada anterior já ficou com codegen.ts quebrado por essas duas listas terem divergido.
const FILES_TO_COPY = [
  // Extractor
  { src: "src/bin/extractor.ts", dest: "src/bin/extractor.ts" },
  { src: "src/lib/db/postgres.ts", dest: "src/lib/db/postgres.ts" },
  { src: "src/lib/db/d1.ts", dest: "src/lib/db/d1.ts" },
  { src: "src/lib/db/types.ts", dest: "src/lib/db/types.ts" },
  { src: "src/lib/utils/sort.ts", dest: "src/lib/utils/sort.ts" },
  { src: "src/lib/utils/logger.ts", dest: "src/lib/utils/logger.ts" },
  { src: "src/lib/utils/env-paths.ts", dest: "src/lib/utils/env-paths.ts" },
  { src: "src/lib/utils/cli-output.ts", dest: "src/lib/utils/cli-output.ts" },
  // Codegen
  { src: "src/bin/codegen.ts", dest: "src/bin/codegen.ts" },
  { src: "src/lib/codegen/schema-generator.ts", dest: "src/lib/codegen/schema-generator.ts" },
  { src: "src/lib/codegen/zod-mapper.ts", dest: "src/lib/codegen/zod-mapper.ts" },
  { src: "src/lib/codegen/types-generator.ts", dest: "src/lib/codegen/types-generator.ts" },
  { src: "src/lib/codegen/router-generator.ts", dest: "src/lib/codegen/router-generator.ts" },
  // express-router-generator.ts só GERA texto (não importa o pacote 'express' em si), então é
  // seguro copiar sempre — mas só produz código que compila se você também copiar
  // src/lib/runtime/express-adapters.ts manualmente e instalar 'express' (ver aviso no CLI).
  { src: "src/lib/codegen/express-router-generator.ts", dest: "src/lib/codegen/express-router-generator.ts" },
  { src: "src/lib/codegen/hooks-generator.ts", dest: "src/lib/codegen/hooks-generator.ts" },
  { src: "src/lib/codegen/drizzle-generator.ts", dest: "src/lib/codegen/drizzle-generator.ts" },
  { src: "src/lib/codegen/metadata-schema.ts", dest: "src/lib/codegen/metadata-schema.ts" },
  { src: "src/lib/codegen/manifest.ts", dest: "src/lib/codegen/manifest.ts" },
  // Camada de dados real em runtime (CRUD, auth JWT, rate limit, auditoria)
  { src: "src/lib/runtime/db-client.ts", dest: "src/lib/runtime/db-client.ts" },
  { src: "src/lib/runtime/crud-engine.ts", dest: "src/lib/runtime/crud-engine.ts" },
  { src: "src/lib/runtime/auth.ts", dest: "src/lib/runtime/auth.ts" },
  { src: "src/lib/runtime/rate-limit.ts", dest: "src/lib/runtime/rate-limit.ts" },
  { src: "src/lib/runtime/audit-log.ts", dest: "src/lib/runtime/audit-log.ts" },
  { src: "src/lib/runtime/core/auth-core.ts", dest: "src/lib/runtime/core/auth-core.ts" },
  { src: "src/lib/runtime/core/rate-limit-core.ts", dest: "src/lib/runtime/core/rate-limit-core.ts" },
  // Migrações
  { src: "src/bin/migrate.ts", dest: "src/bin/migrate.ts" },
  { src: "src/lib/migrations/differ.ts", dest: "src/lib/migrations/differ.ts" },
  { src: "src/lib/migrations/sql-generator.ts", dest: "src/lib/migrations/sql-generator.ts" },
  // Dynamic Headless UI
  { src: "src/lib/ui/utils.ts", dest: "src/lib/ui/utils.ts" },
  { src: "src/lib/ui/provider.tsx", dest: "src/lib/ui/provider.tsx" },
  { src: "src/components/DynamicForm.tsx", dest: "src/components/DynamicForm.tsx" },
  { src: "src/components/RelationSelect.tsx", dest: "src/components/RelationSelect.tsx" },
  { src: "src/components/inputs.tsx", dest: "src/components/inputs.tsx" },
  // Fail-Fast Validator
  { src: "src/bin/validator.ts", dest: "src/bin/validator.ts" },
  { src: "src/lib/validator/scanner.ts", dest: "src/lib/validator/scanner.ts" },
  { src: "src/lib/validator/parser.ts", dest: "src/lib/validator/parser.ts" },
  { src: "src/lib/validator/drift.ts", dest: "src/lib/validator/drift.ts" },
  // Configuração base (exemplo)
  { src: "bd-ticket.config.json", dest: "bd-ticket.config.json" },
  { src: ".env.example", dest: ".env.example" }
];

const INSTALL_DEPS = "hono @hono/zod-validator zod react-hook-form @hookform/resolvers clsx tailwind-merge better-sqlite3 pg commander dotenv @tanstack/react-query picocolors";
const INSTALL_DEV_DEPS = "tsx typescript@^5.5.4 @types/react @types/react-dom @types/pg @types/better-sqlite3 @types/node";

/**
 * Executa o transplante de fato: cria as pastas, copia os arquivos (a partir de `sourceRoot`,
 * default = raiz deste repositório) e injeta os scripts npm no package.json de destino.
 * Retorna um resumo estruturado em vez de fazer console.log diretamente — quem chama decide como
 * apresentar (CLI de texto simples em `transplant.js`, wizard colorido em `bd-ticket-init`).
 */
function runTransplant(targetDir, options = {}) {
  const sourceRoot = options.sourceRoot || path.resolve(__dirname, "..");
  const copied = [];
  const missing = [];

  FOLDERS_TO_CREATE.forEach((f) => {
    fs.mkdirSync(path.join(targetDir, f), { recursive: true });
  });

  FILES_TO_COPY.forEach((file) => {
    const srcPath = path.join(sourceRoot, file.src);
    const destPath = path.join(targetDir, file.dest);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      copied.push(file.dest);
    } else {
      missing.push(file.src);
    }
  });

  let scriptsInjected = false;
  let packageJsonFound = false;
  const targetPackageJson = path.join(targetDir, "package.json");
  if (fs.existsSync(targetPackageJson)) {
    packageJsonFound = true;
    const pkg = JSON.parse(fs.readFileSync(targetPackageJson, "utf-8"));
    pkg.scripts = pkg.scripts || {};
    pkg.scripts["db:extract-metadata"] = "tsx src/bin/extractor.ts";
    pkg.scripts["db:codegen"] = "tsx src/bin/codegen.ts";
    pkg.scripts["db:validate"] = "tsx src/bin/validator.ts";
    pkg.scripts["db:migrate"] = "tsx src/bin/migrate.ts";
    fs.writeFileSync(targetPackageJson, JSON.stringify(pkg, null, 2), "utf-8");
    scriptsInjected = true;
  }

  return { copied, missing, packageJsonFound, scriptsInjected, targetDir };
}

module.exports = { runTransplant, FOLDERS_TO_CREATE, FILES_TO_COPY, INSTALL_DEPS, INSTALL_DEV_DEPS };
