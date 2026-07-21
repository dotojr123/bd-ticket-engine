import * as fs from "fs";
import { calculateSHA256, loadManifest } from "../codegen/manifest";

/**
 * Executa a checagem de hashes do manifest.json contra os arquivos físicos gerados.
 * Retorna lista de erros encontrados.
 */
export function checkDrifts(manifestPath: string): string[] {
  const errors: string[] = [];

  const manifest = loadManifest(manifestPath);
  if (!manifest) {
    errors.push("[MANIFESTO] Arquivo manifest.json de integridade não encontrado.");
    return errors;
  }

  for (const [filePath, expectedHash] of Object.entries(manifest.files) as any[]) {
    if (!fs.existsSync(filePath)) {
      errors.push(`[DRIFT] Arquivo gerado ausente: '${filePath}'`);
      continue;
    }
    const actualHash = calculateSHA256(filePath);
    if (actualHash !== expectedHash) {
      errors.push(`[DRIFT] Modificação manual detectada em: '${filePath}' (SHA-256 divergente)`);
    }
  }

  return errors;
}
