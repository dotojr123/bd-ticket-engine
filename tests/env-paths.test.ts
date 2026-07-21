import * as fs from "fs";
import * as path from "path";
import { resolveEnvPaths, loadEnvFile } from "../src/lib/utils/env-paths";

describe("resolveEnvPaths", () => {
  test("sem --env, resolve os caminhos padrão na raiz de _reversa_sdd", () => {
    const paths = resolveEnvPaths();
    expect(paths.env).toBeNull();
    expect(paths.metadataPath).toBe(path.resolve("_reversa_sdd", "metadata.json"));
    expect(paths.historyDir).toBe(path.resolve("_reversa_sdd", "metadata_history"));
    expect(paths.migrationsDir).toBe(path.resolve("migrations"));
  });

  test("com --env, isola os caminhos em um subdiretório nomeado", () => {
    const paths = resolveEnvPaths("staging");
    expect(paths.env).toBe("staging");
    expect(paths.metadataPath).toBe(path.resolve("_reversa_sdd", "staging", "metadata.json"));
    expect(paths.migrationsDir).toBe(path.resolve("migrations", "staging"));
  });

  test("rejeita nomes de ambiente com caracteres inseguros", () => {
    expect(() => resolveEnvPaths("../../etc")).toThrow(/inválido/);
    expect(() => resolveEnvPaths("staging; rm -rf")).toThrow(/inválido/);
  });

  test("aceita nomes com letras, números, hífen e underscore", () => {
    expect(() => resolveEnvPaths("staging-2_us")).not.toThrow();
  });
});

describe("loadEnvFile", () => {
  const envFile = path.resolve(".env.testenv-bd-ticket");

  afterEach(() => {
    if (fs.existsSync(envFile)) fs.unlinkSync(envFile);
    delete process.env.BD_TICKET_TEST_VAR;
  });

  test("carrega e sobrescreve variáveis do .env.<env> por cima do .env base", () => {
    fs.writeFileSync(envFile, "BD_TICKET_TEST_VAR=valor-do-ambiente\n");
    loadEnvFile("testenv-bd-ticket");
    expect(process.env.BD_TICKET_TEST_VAR).toBe("valor-do-ambiente");
  });

  test("não lança erro quando o .env.<env> não existe", () => {
    expect(() => loadEnvFile("ambiente-que-nao-existe")).not.toThrow();
  });

  test("não lança erro quando nenhum --env é passado", () => {
    expect(() => loadEnvFile()).not.toThrow();
  });
});
