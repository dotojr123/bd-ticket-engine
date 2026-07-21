import { scanDirectory } from "../src/lib/validator/scanner";
import { auditFileContent } from "../src/lib/validator/parser";
import * as path from "path";

describe("Fail-Fast Validator Test Suite", () => {
  test("T004: scanDirectory should find source files and ignore test folders", () => {
    const srcFiles = scanDirectory(path.resolve("src"));
    // Deve conter arquivos em src, mas nenhum sob testes ou node_modules
    expect(srcFiles.length).toBeGreaterThan(0);
    srcFiles.forEach(file => {
      expect(file).not.toContain("tests");
      expect(file).not.toContain("node_modules");
    });
  });

  test("T005: auditFileContent should identify invalid/obsolete schemas based on metadata", () => {
    const validTables = ["pedidos", "usuarios"];
    
    // Conteúdo contendo chamada a schema existente (válido)
    const validContent = `
      import { pedidosInsertSchema } from "@/contracts/schemas/pedidos";
      const val = pedidosInsertSchema.parse(data);
    `;
    const validResult = auditFileContent("dummy.ts", validContent, validTables);
    expect(validResult.errors.length).toBe(0);

    // Conteúdo contendo chamada a schema inexistente / obsoleto (inválido)
    const invalidContent = `
      import { obsoleteTableInsertSchema } from "@/contracts/schemas/obsoleteTable";
      const val = obsoleteTableInsertSchema.parse(data);
    `;
    const invalidResult = auditFileContent("dummy.ts", invalidContent, validTables);
    expect(invalidResult.errors.length).toBe(2);
    expect(invalidResult.errors[0]).toContain("obsoleteTable");
  });

  test("T009: auditFileContent (AST) não deve gerar falso positivo para nomes dentro de strings/comentários", () => {
    const validTables = ["pedidos"];

    // "obsoleteTableInsertSchema" aparece aqui só como texto (string/comentário), nunca como
    // identificador de código real — o scanner por regex antigo acusaria erro; o baseado em AST não.
    const contentWithStringsAndComments = `
      // TODO: remover suporte legado a obsoleteTableInsertSchema no futuro
      const explicacao = "não usar obsoleteTableInsertSchema em código novo";
      import { pedidosInsertSchema } from "@/contracts/schemas/pedidos";
      const val = pedidosInsertSchema.parse(data);
    `;

    const result = auditFileContent("dummy.ts", contentWithStringsAndComments, validTables);
    expect(result.errors.length).toBe(0);
  });
});
