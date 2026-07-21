import * as crypto from "crypto";
import * as fs from "fs";

/**
 * Calcula o hash SHA-256 de um arquivo físico.
 */
export function calculateSHA256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

/**
 * Carrega o manifesto se existir.
 */
export function loadManifest(manifestPath: string): any {
  if (fs.existsSync(manifestPath)) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Grava o manifesto com os hashes de todos os arquivos.
 */
export function writeManifest(manifestPath: string, filePaths: string[]): void {
  const filesMap: { [path: string]: string } = {};

  for (const file of filePaths) {
    if (fs.existsSync(file)) {
      filesMap[file] = calculateSHA256(file);
    }
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    files: filesMap
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}
