import * as cli from "../src/lib/utils/cli-output";

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "").replace(/\x1b\]8;;.*?\x1b\\/g, "");
}

describe("cli-output", () => {
  test("success/error/warn/info/fix embutem o prefixo e a mensagem", () => {
    expect(stripAnsi(cli.success("tudo certo"))).toBe("[SUCCESS] tudo certo");
    expect(stripAnsi(cli.error("deu ruim"))).toBe("[ERROR] deu ruim");
    expect(stripAnsi(cli.warn("cuidado"))).toBe("[WARNING] cuidado");
    expect(stripAnsi(cli.info("fyi"))).toBe("[INFO] fyi");
    expect(stripAnsi(cli.fix("rode X"))).toBe("  [FIX SUGERIDO] rode X");
  });

  test("fileLink sempre contém o texto arquivo:linha:coluna, com ou sem terminal hyperlink", () => {
    const link = cli.fileLink("src/contracts/schemas/test_pedidos.ts", 3, 5);
    expect(link).toContain("test_pedidos.ts:3:5");
  });

  test("fileLink usa linha/coluna default 1:1 quando omitidas", () => {
    const link = cli.fileLink("src/foo.ts");
    expect(link).toContain("src/foo.ts:1:1");
  });

  test("linkifyPaths transforma caminhos .ts entre aspas simples em hyperlinks, preservando o resto da mensagem", () => {
    const original = "[DRIFT] Modificação manual detectada em: 'src/contracts/schemas/test_pedidos.ts' (SHA-256 divergente)";
    const linked = cli.linkifyPaths(original);
    expect(linked).toContain("test_pedidos.ts:1:1");
    expect(linked).toContain("SHA-256 divergente");
  });

  test("linkifyPaths não altera mensagens sem caminho .ts entre aspas", () => {
    const original = "mensagem qualquer sem path";
    expect(cli.linkifyPaths(original)).toBe(original);
  });
});
