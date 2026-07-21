#!/usr/bin/env node
/**
 * Pós-build: injeta o shebang `#!/usr/bin/env node` nos entrypoints CLI compilados, exigido para
 * que os binários funcionem quando o pacote for instalado via npm (campo "bin" do package.json).
 * TypeScript não preserva/injeta shebangs no output de `tsc`, então isso roda depois do build.
 */
const fs = require("fs");
const path = require("path");

const BIN_FILES = ["extractor.js", "codegen.js", "validator.js", "migrate.js"];
const SHEBANG = "#!/usr/bin/env node\n";

for (const file of BIN_FILES) {
  const filePath = path.join(__dirname, "..", "dist", "bin", file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARNING] ${filePath} não encontrado — pulei a injeção de shebang.`);
    continue;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  if (!content.startsWith("#!")) {
    fs.writeFileSync(filePath, SHEBANG + content, "utf-8");
    console.log(`[SHEBANG] Injetado em dist/bin/${file}`);
  }
}
