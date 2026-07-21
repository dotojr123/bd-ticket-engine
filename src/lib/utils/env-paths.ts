import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const VALID_ENV_NAME = /^[a-z0-9_-]+$/i;

/**
 * Resolve os caminhos de metadata/manifesto/migrações para um ambiente nomeado (dev/staging/prod),
 * evitando que um extract/migração de um ambiente sobrescreva o contrato de outro. Sem `--env`,
 * o comportamento é idêntico ao anterior (caminhos na raiz de `_reversa_sdd/`), preservando
 * compatibilidade retroativa para quem não usa múltiplos ambientes.
 */
export interface EnvPaths {
  env: string | null;
  metadataDir: string;
  metadataPath: string;
  historyDir: string;
  migrationsDir: string;
}

export function resolveEnvPaths(env?: string): EnvPaths {
  if (!env) {
    const metadataDir = path.resolve("_reversa_sdd");
    return {
      env: null,
      metadataDir,
      metadataPath: path.join(metadataDir, "metadata.json"),
      historyDir: path.join(metadataDir, "metadata_history"),
      migrationsDir: path.resolve("migrations")
    };
  }

  if (!VALID_ENV_NAME.test(env)) {
    throw new Error(`Nome de ambiente inválido: '${env}'. Use apenas letras, números, hífen e underscore.`);
  }

  const metadataDir = path.resolve("_reversa_sdd", env);
  return {
    env,
    metadataDir,
    metadataPath: path.join(metadataDir, "metadata.json"),
    historyDir: path.join(metadataDir, "metadata_history"),
    migrationsDir: path.resolve("migrations", env)
  };
}

/**
 * Carrega `.env` (base) e, se existir, `.env.<env>` por cima (sobrescrevendo chaves em comum) —
 * permite `DATABASE_URL`/`JWT_SECRET`/etc. distintos por ambiente sem exigir múltiplos processos.
 */
export function loadEnvFile(env?: string): void {
  dotenv.config();
  if (env) {
    const envFile = path.resolve(`.env.${env}`);
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile, override: true });
    }
  }
}
