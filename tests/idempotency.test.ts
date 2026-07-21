import { buildFieldZodSchema } from "../src/lib/codegen/zod-mapper";
import { generateTypesString } from "../src/lib/codegen/types-generator";
import { generateRouterString } from "../src/lib/codegen/router-generator";
import { generateHooksString } from "../src/lib/codegen/hooks-generator";

describe("Idempotência do Codegen", () => {
  test("gerar o mesmo conjunto de colunas duas vezes produz bytes idênticos em todos os artefatos", () => {
    const columns = {
      id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, references: null, metadata: {} },
      cliente_id: {
        type: "integer",
        isNullable: true,
        isPrimaryKey: false,
        isForeignKey: true,
        references: "clientes.id",
        metadata: { permissions: { write: ["admin"] } }
      },
      status: { type: "text", isNullable: false, isPrimaryKey: false, isForeignKey: false, references: null, metadata: {} }
    };

    const runOnce = () => {
      let schema = "";
      for (const [colName, colDef] of Object.entries(columns)) {
        schema += `${colName}:${buildFieldZodSchema(colDef)};`;
      }
      return {
        schema,
        types: generateTypesString("pedidos"),
        router: generateRouterString("pedidos", columns, { soft_delete: false }),
        hooks: generateHooksString("pedidos")
      };
    };

    const first = runOnce();
    const second = runOnce();

    expect(first.schema).toBe(second.schema);
    expect(first.types).toBe(second.types);
    expect(first.router).toBe(second.router);
    expect(first.hooks).toBe(second.hooks);
  });
});
