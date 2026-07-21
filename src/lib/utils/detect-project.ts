import * as fs from "fs";
import * as path from "path";

export interface ProjectDetection {
  hasHono: boolean;
  hasExpress: boolean;
  hasPg: boolean;
  hasSqlite: boolean;
}

/** Detecta framework HTTP e driver de banco já instalados no projeto de destino (uso pelo wizard `bd-ticket-init`). */
export function detectFromPackageJson(targetDir: string): ProjectDetection {
  const pkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { hasHono: false, hasExpress: false, hasPg: false, hasSqlite: false };
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return {
    hasHono: !!allDeps.hono,
    hasExpress: !!allDeps.express,
    hasPg: !!allDeps.pg,
    hasSqlite: !!allDeps["better-sqlite3"]
  };
}
