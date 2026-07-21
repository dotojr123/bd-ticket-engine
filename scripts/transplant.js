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
      "src/lib/ui",
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
      { src: "src/lib/utils/sort.ts", dest: "src/lib/utils/sort.ts" },
      // Codegen
      { src: "src/bin/codegen.ts", dest: "src/bin/codegen.ts" },
      { src: "src/lib/codegen/zod-mapper.ts", dest: "src/lib/codegen/zod-mapper.ts" },
      { src: "src/lib/codegen/types-generator.ts", dest: "src/lib/codegen/types-generator.ts" },
      { src: "src/lib/codegen/router-generator.ts", dest: "src/lib/codegen/router-generator.ts" },
      { src: "src/lib/codegen/manifest.ts", dest: "src/lib/codegen/manifest.ts" },
      // Dynamic Headless UI
      { src: "src/lib/ui/utils.ts", dest: "src/lib/ui/utils.ts" },
      { src: "src/lib/ui/provider.tsx", dest: "src/lib/ui/provider.tsx" },
      { src: "src/components/DynamicForm.tsx", dest: "src/components/DynamicForm.tsx" },
      // Fail-Fast Validator
      { src: "src/bin/validator.ts", dest: "src/bin/validator.ts" },
      { src: "src/lib/validator/scanner.ts", dest: "src/lib/validator/scanner.ts" },
      { src: "src/lib/validator/parser.ts", dest: "src/lib/validator/parser.ts" },
      { src: "src/lib/validator/drift.ts", dest: "src/lib/validator/drift.ts" },
      // Configuração base (exemplo)
      { src: "bd-ticket.config.json", dest: "bd-ticket.config.json" }
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
    console.log("\nnpm install hono @hono/zod-validator zod react-hook-form @hookform/resolvers clsx tailwind-merge better-sqlite3 pg commander dotenv");
    console.log("npm install -D tsx typescript @types/react @types/react-dom @types/pg @types/better-sqlite3");
    console.log("-----------------------------------------------------------------\n");
  });

program.parse(process.argv);
