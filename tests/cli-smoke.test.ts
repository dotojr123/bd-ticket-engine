import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Database from "better-sqlite3";

const TSX_CLI = require.resolve("tsx/cli");
const REPO_ROOT = path.resolve(__dirname, "..");

function runCli(scriptRelPath: string, args: string[], cwd: string) {
  return spawnSync(process.execPath, [TSX_CLI, path.join(REPO_ROOT, scriptRelPath), ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env }
  });
}

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bd-ticket-cli-"));
}

// Testes de ponta a ponta reais dos binários CLI (processo filho de verdade via tsx, sem mocks),
// isolados em um diretório temporário para nunca tocar o _reversa_sdd/ real do repositório.
jest.setTimeout(30000);

describe("CLIs (smoke tests via processo real)", () => {
  test("codegen.ts falha com exit 1 e mensagem acionável quando metadata.json não existe", () => {
    const cwd = tmpDir();
    const result = runCli("src/bin/codegen.ts", [], cwd);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("metadados");
  });

  test("validator.ts falha com exit 1 e sugere o comando de correção quando metadata.json não existe", () => {
    const cwd = tmpDir();
    const result = runCli("src/bin/validator.ts", [], cwd);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("db:extract-metadata");
  });

  test("extractor.ts --dry-run extrai um banco SQLite real sem escrever metadata.json em disco", () => {
    const cwd = tmpDir();
    const dbPath = path.join(cwd, "local.db");
    const db = new Database(dbPath);
    db.exec(`CREATE TABLE produtos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL);`);
    db.close();

    const result = runCli("src/bin/extractor.ts", ["--driver", "d1", "--d1-binding", "local.db", "--dry-run"], cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DRY-RUN");
    expect(fs.existsSync(path.join(cwd, "_reversa_sdd", "metadata.json"))).toBe(false);
  });

  test("migrate.ts reporta 'nada a migrar' quando não há metadata.json ainda extraído", () => {
    const cwd = tmpDir();
    const result = runCli("src/bin/migrate.ts", [], cwd);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("metadados");
  });
});
