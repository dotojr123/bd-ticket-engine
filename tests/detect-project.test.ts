import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { detectFromPackageJson } from "../src/lib/utils/detect-project";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bd-ticket-detect-"));
}

describe("detectFromPackageJson (usado pelo wizard bd-ticket-init)", () => {
  test("retorna tudo false quando não há package.json", () => {
    const dir = tmpDir();
    expect(detectFromPackageJson(dir)).toEqual({ hasHono: false, hasExpress: false, hasPg: false, hasSqlite: false });
  });

  test("detecta hono + better-sqlite3 já instalados", () => {
    const dir = tmpDir();
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ dependencies: { hono: "^4.0.0", "better-sqlite3": "^12.0.0" } })
    );
    expect(detectFromPackageJson(dir)).toEqual({ hasHono: true, hasExpress: false, hasPg: false, hasSqlite: true });
  });

  test("detecta express + pg em devDependencies também", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ devDependencies: { express: "^5.0.0", pg: "^8.0.0" } }));
    const result = detectFromPackageJson(dir);
    expect(result.hasExpress).toBe(true);
    expect(result.hasPg).toBe(true);
    expect(result.hasHono).toBe(false);
    expect(result.hasSqlite).toBe(false);
  });
});
