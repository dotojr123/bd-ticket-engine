import { isoToLocalInputValue, validateFiles } from "../src/components/inputs";

describe("inputs.tsx: lógica pura (sem depender de renderização React/DOM)", () => {
  test("isoToLocalInputValue converte um ISO UTC para o formato esperado por <input type=datetime-local>", () => {
    const local = isoToLocalInputValue("2026-07-21T14:30:00.000Z", "UTC");
    expect(local).toBe("2026-07-21T14:30");
  });

  test("isoToLocalInputValue respeita timezones diferentes de UTC", () => {
    // America/Sao_Paulo é UTC-3 (sem horário de verão atualmente)
    const local = isoToLocalInputValue("2026-07-21T14:30:00.000Z", "America/Sao_Paulo");
    expect(local).toBe("2026-07-21T11:30");
  });

  test("validateFiles rejeita arquivos acima do tamanho máximo", () => {
    const bigFile = new File([new Uint8Array(2000)], "grande.png", { type: "image/png" });
    const errors = validateFiles([bigFile], undefined, 1000, undefined);
    expect(errors.some((e) => e.includes("grande.png"))).toBe(true);
  });

  test("validateFiles rejeita quando excede o número máximo de arquivos", () => {
    const f1 = new File(["a"], "a.txt");
    const f2 = new File(["b"], "b.txt");
    const errors = validateFiles([f1, f2], undefined, undefined, 1);
    expect(errors.some((e) => e.includes("máximo"))).toBe(true);
  });

  test("validateFiles rejeita tipo de arquivo fora do accept (extensão)", () => {
    const f = new File(["a"], "documento.pdf", { type: "application/pdf" });
    const errors = validateFiles([f], ".png,.jpg", undefined, undefined);
    expect(errors.some((e) => e.includes("documento.pdf"))).toBe(true);
  });

  test("validateFiles aceita arquivo válido sem gerar erros", () => {
    const f = new File(["a"], "foto.png", { type: "image/png" });
    const errors = validateFiles([f], "image/*", 10_000, 5);
    expect(errors).toHaveLength(0);
  });
});
