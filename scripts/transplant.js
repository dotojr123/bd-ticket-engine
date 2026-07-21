const fs = require("fs");
const path = require("path");
const { program } = require("commander");

program
  .version("1.0.0")
  .description("Transplanta o BD-Ticket Engine para dentro de um projeto de destino legado ou existente.")
  .requiredOption("--target <path>", "Diretório de destino do transplante")
  .action((options) => {
    const targetDir = path.resolve(options.target);

    if (!fs.existsSync(targetDir)) {
      console.error(`[ERROR] O diretório de destino '${targetDir}' não existe.`);
      process.exit(1);
    }

    console.log(`[INFO] Iniciando transplante do motor para: ${targetDir}`);

    const foldersToCreate = [
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

    // 1. Criar pastas no destino
    foldersToCreate.forEach((f) => {
      const fullPath = path.join(targetDir, f);
      fs.mkdirSync(fullPath, { recursive: true });
    });

    // 2. Arquivos lógicos a serem copiados
    const filesToCopy = [
      // Extractor
      { src: "src/bin/extractor.ts", dest: "src/bin/extractor.ts" },
      { src: "src/lib/db/postgres.ts", dest: "src/lib/db/postgres.ts" },
      { src: "src/lib/db/d1.ts", dest: "src/lib/db/d1.ts" },
      { src: "src/lib/db/types.ts", dest: "src/lib/db/types.ts" },
      { src: "src/lib/utils/sort.ts", dest: "src/lib/utils/sort.ts" },
      { src: "src/lib/utils/logger.ts", dest: "src/lib/utils/logger.ts" },
      { src: "src/lib/utils/env-paths.ts", dest: "src/lib/utils/env-paths.ts" },
      // Codegen
      { src: "src/bin/codegen.ts", dest: "src/bin/codegen.ts" },
      { src: "src/lib/codegen/zod-mapper.ts", dest: "src/lib/codegen/zod-mapper.ts" },
      { src: "src/lib/codegen/types-generator.ts", dest: "src/lib/codegen/types-generator.ts" },
      { src: "src/lib/codegen/router-generator.ts", dest: "src/lib/codegen/router-generator.ts" },
      // express-router-generator.ts só GERA texto (não importa o pacote 'express' em si), então é
      // seguro copiar sempre — mas só produz código que compila se você também copiar
      // src/lib/runtime/express-adapters.ts manualmente e instalar 'express' (ver aviso abaixo).
      { src: "src/lib/codegen/express-router-generator.ts", dest: "src/lib/codegen/express-router-generator.ts" },
      { src: "src/lib/codegen/hooks-generator.ts", dest: "src/lib/codegen/hooks-generator.ts" },
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
      // Fail-Fast Validator
      { src: "src/bin/validator.ts", dest: "src/bin/validator.ts" },
      { src: "src/lib/validator/scanner.ts", dest: "src/lib/validator/scanner.ts" },
      { src: "src/lib/validator/parser.ts", dest: "src/lib/validator/parser.ts" },
      { src: "src/lib/validator/drift.ts", dest: "src/lib/validator/drift.ts" },
      // Configuração base (exemplo)
      { src: "bd-ticket.config.json", dest: "bd-ticket.config.json" },
      { src: ".env.example", dest: ".env.example" }
    ];

    filesToCopy.forEach((file) => {
      const srcPath = path.resolve(file.src);
      const destPath = path.join(targetDir, file.dest);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`[COPY] Copiado: ${file.dest}`);
      } else {
        console.warn(`[WARNING] Arquivo de origem não encontrado: ${file.src}`);
      }
    });

    // 3. Injetar scripts no package.json de destino
    const targetPackageJson = path.join(targetDir, "package.json");
    if (fs.existsSync(targetPackageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(targetPackageJson, "utf-8"));
        pkg.scripts = pkg.scripts || {};

        pkg.scripts["db:extract-metadata"] = "tsx src/bin/extractor.ts";
        pkg.scripts["db:codegen"] = "tsx src/bin/codegen.ts";
        pkg.scripts["db:validate"] = "tsx src/bin/validator.ts";
        pkg.scripts["db:migrate"] = "tsx src/bin/migrate.ts";

        fs.writeFileSync(targetPackageJson, JSON.stringify(pkg, null, 2), "utf-8");
        console.log("[INJECT] Scripts npm injetados com sucesso no package.json de destino.");
      } catch (e) {
        console.error(`[ERROR] Falha ao atualizar package.json no destino: ${e.message}`);
      }
    } else {
      console.warn("[WARNING] package.json de destino não encontrado. Scripts não foram injetados.");
    }

    // 4. Exibir dependências necessárias
    console.log("\n[SUCCESS] Transplante concluído com sucesso!");
    console.log("-----------------------------------------------------------------");
    console.log("Execute os seguintes comandos no diretório de destino para concluir:");
    console.log(
      "\nnpm install hono @hono/zod-validator zod react-hook-form @hookform/resolvers clsx tailwind-merge better-sqlite3 pg commander dotenv @tanstack/react-query"
    );
    console.log("npm install -D tsx typescript@^5.5.4 @types/react @types/react-dom @types/pg @types/better-sqlite3 @types/node");
    console.log(
      "\n(A versão do TypeScript é fixada em ^5.5.4 porque é a faixa validada pela suíte de testes do motor;\n" +
        "versões maiores futuras podem mudar comportamento de resolução de módulo sem aviso.)"
    );
    console.log("\nGaranta que o package.json do projeto de destino tenha \"type\": \"commonjs\" (os CLIs do motor usam require/CommonJS internamente).");
    console.log("Defina JWT_SECRET (e DATABASE_URL, se usar Postgres) no seu .env antes de servir tráfego real — veja .env.example.");
    console.log(
      "\n[OPCIONAL] Para gerar rotas Express além de Hono, copie manualmente src/lib/runtime/express-adapters.ts\n" +
        "do repositório original, instale 'express' + '@types/express', e rode o codegen com --target express\n" +
        "(ou --target both). Esse arquivo não é copiado por padrão para não forçar a dependência de Express em\n" +
        "quem só usa Hono — sem ele, rodar --target express gera um contrato que aponta para um import ausente,\n" +
        "com uma mensagem de erro clara de módulo não encontrado."
    );
    console.log("-----------------------------------------------------------------\n");
  });

program.parse(process.argv);
