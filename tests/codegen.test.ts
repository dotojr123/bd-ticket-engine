import { mapSqlTypeToZod } from "../src/lib/codegen/zod-mapper";
import { generateTypesString } from "../src/lib/codegen/types-generator";
import { generateRouterString } from "../src/lib/codegen/router-generator";
import { generateHooksString } from "../src/lib/codegen/hooks-generator";
import { validateMetadata } from "../src/lib/codegen/metadata-schema";

describe("Codegen Engine Test Suite", () => {
  test("T004: physical SQL types mapping to Zod rules should match specs", () => {
    expect(mapSqlTypeToZod("integer")).toBe("z.number()");
    expect(mapSqlTypeToZod("real")).toBe("z.number()");
    expect(mapSqlTypeToZod("varchar")).toBe("z.string()");
    expect(mapSqlTypeToZod("text")).toBe("z.string()");
    expect(mapSqlTypeToZod("boolean")).toBe("z.boolean()");
  });

  test("T005: generateTypesString should correctly declare types", () => {
    const table = "pedidos";
    const tsTypes = generateTypesString(table);
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
    const routerString = generateRouterString(table, colDef);
    expect(routerString).toContain(`import { Hono } from "hono";`);
    expect(routerString).toContain(`import { zValidator } from "@hono/zod-validator";`);
    expect(routerString).toContain(`export const pedidosRouter = new Hono();`);
    expect(routerString).toContain(`const allowed = ["admin"];`);
  });

  test("T010: generateRouterString should embed real CRUD, FK checks and JWT-based RBAC (no mocks)", () => {
    const colDef = {
      id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, references: null, metadata: {} },
      cliente_id: {
        type: "integer",
        isNullable: true,
        isPrimaryKey: false,
        isForeignKey: true,
        references: "clientes.id",
        metadata: {}
      }
    };
    const routerString = generateRouterString("pedidos", colDef, { soft_delete: true, owner_field: "user_id" });

    expect(routerString).not.toContain("Mock GET");
    expect(routerString).not.toContain("Mock POST");
    expect(routerString).toContain(`import { requireRole, getAuthUser } from "../../lib/runtime/auth";`);
    expect(routerString).toContain(`import * as crud from "../../lib/runtime/crud-engine";`);
    expect(routerString).toContain(`"table": "clientes"`);
    expect(routerString).toContain(`SOFT_DELETE = true;`);
    expect(routerString).toContain(`OWNER_FIELD: string | null = "user_id";`);
    expect(routerString).toContain("crud.assertForeignKeysExist");
  });

  test("T011: generateHooksString should produce typed React Query hooks with cache invalidation", () => {
    const hooksString = generateHooksString("pedidos");
    expect(hooksString).toContain(`import { useMutation, useQuery, useQueryClient`);
    expect(hooksString).toContain(`export function usePedidosList(`);
    expect(hooksString).toContain(`export function usePedidosCreate(`);
    expect(hooksString).toContain(`invalidateQueries({ queryKey: [QUERY_KEY, "list"] })`);
  });

  test("T012: validateMetadata should reject structurally invalid metadata with actionable errors", () => {
    const invalid = { project: "X", tables: { pedidos: { columns: { id: { type: "integer" } } } } };
    const result = validateMetadata(invalid);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("isNullable"))).toBe(true);
  });

  test("T013: validateMetadata should accept a well-formed metadata document", () => {
    const valid = {
      project: "X",
      version: "1.0.0",
      tables: {
        pedidos: {
          columns: {
            id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, metadata: {} }
          }
        }
      }
    };
    const result = validateMetadata(valid);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
