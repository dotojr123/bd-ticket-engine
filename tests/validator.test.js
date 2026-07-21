"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const scanner_1 = require("../src/lib/validator/scanner");
const parser_1 = require("../src/lib/validator/parser");
const path = __importStar(require("path"));
describe("Fail-Fast Validator Test Suite", () => {
    test("T004: scanDirectory should find source files and ignore test folders", () => {
        const srcFiles = (0, scanner_1.scanDirectory)(path.resolve("src"));
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
        const validResult = (0, parser_1.auditFileContent)("dummy.ts", validContent, validTables);
        expect(validResult.errors.length).toBe(0);
        // Conteúdo contendo chamada a schema inexistente / obsoleto (inválido)
        const invalidContent = `
      import { obsoleteTableInsertSchema } from "@/contracts/schemas/obsoleteTable";
      const val = obsoleteTableInsertSchema.parse(data);
    `;
        const invalidResult = (0, parser_1.auditFileContent)("dummy.ts", invalidContent, validTables);
        expect(invalidResult.errors.length).toBe(2);
        expect(invalidResult.errors[0]).toContain("obsoleteTable");
    });
});
