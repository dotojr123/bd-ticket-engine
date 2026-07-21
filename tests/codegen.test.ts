import { mapSqlTypeToZod, buildFieldZodSchema } from "../src/lib/codegen/zod-mapper";
import { generateTypesString } from "../src/lib/codegen/types-generator";
import { generateRouterString } from "../src/lib/codegen/router-generator";
import { generateExpressRouterString } from "../src/lib/codegen/express-router-generator";
import { generateHooksString } from "../src/lib/codegen/hooks-generator";
import { generateSchemasString } from "../src/lib/codegen/schema-generator";
import { validateMetadata } from "../src/lib/codegen/metadata-schema";

describe("Codegen Engine Test Suite", () => {
  test("T004: physical SQL types mapping to Zod rules should match specs", () => {
    expect(mapSqlTypeToZod("integer")).toBe("z.number()");
    expect(mapSqlTypeToZod("real")).toBe("z.number()");
    expect(mapSqlTypeToZod("varchar")).toBe("z.string()");
    expect(mapSqlTypeToZod("text")).toBe("z.string()");
    expect(mapSqlTypeToZod("boolean")).toBe("z.boolean()");
  });

  test("T004b: mapSqlTypeToZod handles arrays, uuid, json and timestamp variants", () => {
    expect(mapSqlTypeToZod("integer[]")).toBe("z.array(z.number())");
    expect(mapSqlTypeToZod("text[]")).toBe("z.array(z.string())");
    expect(mapSqlTypeToZod("array")).toBe("z.array(z.string())");
    expect(mapSqlTypeToZod("uuid")).toBe("z.string().uuid()");
    expect(mapSqlTypeToZod("json")).toBe("z.any()");
    expect(mapSqlTypeToZod("jsonb")).toBe("z.any()");
    expect(mapSqlTypeToZod("timestamp with time zone")).toBe("z.coerce.date()");
    expect(mapSqlTypeToZod("timestamp without time zone")).toBe("z.coerce.date()");
    expect(mapSqlTypeToZod("date")).toBe("z.coerce.date()");
    expect(mapSqlTypeToZod("bigint")).toBe("z.number()");
    expect(mapSqlTypeToZod("double precision")).toBe("z.number()");
    expect(mapSqlTypeToZod("  INTEGER  ")).toBe("z.number()");
  });

  test("T004c: buildFieldZodSchema builds enum schemas from validation.options and appends nullable/optional", () => {
    const enumCol = {
      type: "text",
      isNullable: true,
      metadata: { validation: { options: ["a", "b"] } }
    };
    expect(buildFieldZodSchema(enumCol)).toBe('z.enum(["a", "b"]).nullable().optional()');

    const plainCol = { type: "integer", isNullable: false, metadata: {} };
    expect(buildFieldZodSchema(plainCol)).toBe("z.number()");
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

  test("T014: generateExpressRouterString should embed real CRUD over the same crud-engine, Express-flavored", () => {
    const colDef = {
      id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, references: null, metadata: {} },
      cliente_id: {
        type: "integer",
        isNullable: true,
        isPrimaryKey: false,
        isForeignKey: true,
        references: "clientes.id",
        metadata: { permissions: { write: ["admin"] } }
      }
    };
    const routerString = generateExpressRouterString("pedidos", colDef, { soft_delete: true, owner_field: "user_id" });

    expect(routerString).toContain(`import { Router } from "express";`);
    expect(routerString).toContain(`import { requireRoleExpress, rateLimitExpress } from "../../lib/runtime/express-adapters";`);
    expect(routerString).toContain(`import * as crud from "../../lib/runtime/crud-engine";`);
    expect(routerString).toContain(`export const pedidosRouter = Router();`);
    expect(routerString).toContain(`const rbacWrite = requireRoleExpress(["admin"]);`);
    expect(routerString).toContain(`SOFT_DELETE = true;`);
    expect(routerString).toContain(`"table": "clientes"`);
    expect(routerString).not.toContain("Mock GET");
  });

  test("T015: generateSchemasString makes the owner_field optional on Insert even when NOT NULL, so auto-assignment from the JWT is actually reachable", () => {
    const columns = {
      id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, metadata: {} },
      titulo: { type: "text", isNullable: false, isPrimaryKey: false, isForeignKey: false, metadata: {} },
      owner_id: { type: "text", isNullable: false, isPrimaryKey: false, isForeignKey: false, metadata: {} }
    };
    const schemaString = generateSchemasString("tasks", columns, { owner_field: "owner_id" });

    expect(schemaString).toContain("owner_id: z.string().optional(),");
    // titulo continua obrigatório — só o owner_field ganha .optional() extra
    expect(schemaString).toContain("titulo: z.string(),");
  });

  test("T016: generateSchemasString keeps every field required on Insert when there is no owner_field", () => {
    const columns = {
      id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, metadata: {} },
      nome: { type: "text", isNullable: false, isPrimaryKey: false, isForeignKey: false, metadata: {} }
    };
    const schemaString = generateSchemasString("clientes", columns, {});
    expect(schemaString).toContain("nome: z.string(),");
    expect(schemaString).not.toContain(".optional()");
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
