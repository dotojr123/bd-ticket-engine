const fs = require("fs");
const path = require("path");
const { program } = require("commander");
const { runTransplant, INSTALL_DEPS, INSTALL_DEV_DEPS } = require("./transplant-core");

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

    const result = runTransplant(targetDir);

    result.copied.forEach((f) => console.log(`[COPY] Copiado: ${f}`));
    result.missing.forEach((f) => console.warn(`[WARNING] Arquivo de origem não encontrado: ${f}`));

    if (result.scriptsInjected) {
      console.log("[INJECT] Scripts npm injetados com sucesso no package.json de destino.");
    } else if (!result.packageJsonFound) {
      console.warn("[WARNING] package.json de destino não encontrado. Scripts não foram injetados.");
    }

    console.log("\n[SUCCESS] Transplante concluído com sucesso!");
    console.log("-----------------------------------------------------------------");
    console.log("Execute os seguintes comandos no diretório de destino para concluir:");
    console.log(`\nnpm install ${INSTALL_DEPS}`);
    console.log(`npm install -D ${INSTALL_DEV_DEPS}`);
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
    console.log("\nDica: prefira 'npx bd-ticket-init' para um wizard interativo que já faz esse passo a passo por você.");
    console.log("-----------------------------------------------------------------\n");
  });

program.parse(process.argv);
