import * as fs from "fs";
import * as path from "path";

/**
 * Retorna todos os arquivos de código (.ts, .tsx, .js, .jsx) recursivamente sob um diretório.
 * Ignora pastas de testes, dist e node_modules.
 */
export function scanDirectory(dir: string): string[] {
  let results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Ignorar pastas de teste e build
      const folderName = path.basename(filePath);
      if (
        folderName === "node_modules" ||
        folderName === "dist" ||
        folderName === "tests" ||
        folderName === "__tests__"
      ) {
        continue;
      }
      results = results.concat(scanDirectory(filePath));
    } else {
      const ext = path.extname(filePath).toLowerCase();
      if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
        // Ignorar arquivos de declaração tipo
        if (!filePath.endsWith(".d.ts")) {
          results.push(filePath);
        }
      }
    }
  }

  return results;
}
