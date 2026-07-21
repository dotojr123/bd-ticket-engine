import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { calculateSHA256, loadManifest, writeManifest } from "../src/lib/codegen/manifest";
import { checkDrifts } from "../src/lib/validator/drift";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bd-ticket-manifest-"));
}

describe("Manifest (SHA-256 + persistência)", () => {
  test("calculateSHA256 é determinístico e sensível ao conteúdo", () => {
    const dir = tmpDir();
    const filePath = path.join(dir, "a.txt");
    fs.writeFileSync(filePath, "conteudo-fixo");

    const hash1 = calculateSHA256(filePath);
    const hash2 = calculateSHA256(filePath);
    expect(hash1).toBe(hash2);

    fs.writeFileSync(filePath, "conteudo-diferente");
    expect(calculateSHA256(filePath)).not.toBe(hash1);
  });

  test("loadManifest retorna null quando o arquivo não existe ou está corrompido", () => {
    const dir = tmpDir();
    expect(loadManifest(path.join(dir, "nao-existe.json"))).toBeNull();

    const corrupted = path.join(dir, "corrupted.json");
    fs.writeFileSync(corrupted, "{ isso nao é json");
    expect(loadManifest(corrupted)).toBeNull();
  });

  test("writeManifest grava hashes de todos os arquivos existentes e ignora os ausentes", () => {
    const dir = tmpDir();
    const file1 = path.join(dir, "f1.ts");
    const file2 = path.join(dir, "f2.ts");
    const missing = path.join(dir, "missing.ts");
    fs.writeFileSync(file1, "conteudo 1");
    fs.writeFileSync(file2, "conteudo 2");

    const manifestPath = path.join(dir, "manifest.json");
    writeManifest(manifestPath, [file1, file2, missing]);

    const manifest = loadManifest(manifestPath);
    expect(manifest.generated_at).toBeDefined();
    expect(Object.keys(manifest.files)).toEqual([file1, file2]);
    expect(manifest.files[file1]).toBe(calculateSHA256(file1));
  });
});

describe("Fail-Fast Validator: checkDrifts", () => {
  test("reporta erro quando o manifesto não existe", () => {
    const dir = tmpDir();
    const errors = checkDrifts(path.join(dir, "manifest.json"));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("MANIFESTO");
  });

  test("não reporta nada quando todos os hashes conferem", () => {
    const dir = tmpDir();
    const file1 = path.join(dir, "gerado.ts");
    fs.writeFileSync(file1, "export const x = 1;");
    const manifestPath = path.join(dir, "manifest.json");
    writeManifest(manifestPath, [file1]);

    expect(checkDrifts(manifestPath)).toHaveLength(0);
  });

  test("detecta arquivo ausente e arquivo modificado manualmente", () => {
    const dir = tmpDir();
    const present = path.join(dir, "present.ts");
    const removed = path.join(dir, "removed.ts");
    fs.writeFileSync(present, "conteudo original");
    fs.writeFileSync(removed, "conteudo original");

    const manifestPath = path.join(dir, "manifest.json");
    writeManifest(manifestPath, [present, removed]);

    // Simula drift: edita um arquivo gerado na mão e apaga o outro
    fs.writeFileSync(present, "conteudo editado manualmente");
    fs.unlinkSync(removed);

    const errors = checkDrifts(manifestPath);
    expect(errors).toHaveLength(2);
    expect(errors.some((e) => e.includes("ausente"))).toBe(true);
    expect(errors.some((e) => e.includes("Modificação manual"))).toBe(true);
  });
});
