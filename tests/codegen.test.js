"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_mapper_1 = require("../src/lib/codegen/zod-mapper");
const types_generator_1 = require("../src/lib/codegen/types-generator");
const router_generator_1 = require("../src/lib/codegen/router-generator");
describe("Codegen Engine Test Suite", () => {
    test("T004: physical SQL types mapping to Zod rules should match specs", () => {
        expect((0, zod_mapper_1.mapSqlTypeToZod)("integer")).toBe("z.number()");
        expect((0, zod_mapper_1.mapSqlTypeToZod)("real")).toBe("z.number()");
        expect((0, zod_mapper_1.mapSqlTypeToZod)("varchar")).toBe("z.string()");
        expect((0, zod_mapper_1.mapSqlTypeToZod)("text")).toBe("z.string()");
        expect((0, zod_mapper_1.mapSqlTypeToZod)("boolean")).toBe("z.boolean()");
    });
    test("T005: generateTypesString should correctly declare types", () => {
        const table = "pedidos";
        const tsTypes = (0, types_generator_1.generateTypesString)(table);
        expect(tsTypes).toContain(`export type PedidosSelect = z.infer<typeof pedidosSelectSchema>;`);
        expect(tsTypes).toContain(`export type PedidosInsert = z.infer<typeof pedidosInsertSchema>;`);
        expect(tsTypes).toContain(`export type PedidosUpdate = z.infer<typeof pedidosUpdateSchema>;`);
    });
    test("T006: generateRouterString should construct Hono router and zValidator", () => {
        const table = "pedidos";
        const colDef = {
            status: {
                type: "varchar",
                isNullable: false,
                isPrimaryKey: false,
                isForeignKey: false,
                references: null,
                metadata: {
                    permissions: {
                        write: ["admin"]
                    }
                }
            }
        };
        const routerString = (0, router_generator_1.generateRouterString)(table, colDef);
        expect(routerString).toContain(`import { Hono } from "hono";`);
        expect(routerString).toContain(`import { zValidator } from "@hono/zod-validator";`);
        expect(routerString).toContain(`export const pedidosRouter = new Hono();`);
        expect(routerString).toContain(`const allowed = ["admin"];`);
    });
});
