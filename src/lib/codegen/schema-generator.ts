import { buildFieldZodSchema } from "./zod-mapper";
import { TableOptions } from "../db/postgres";

/**
 * Gera os três schemas Zod (Select/Insert/Update) de uma tabela.
 *
 * A coluna de `options.owner_field` é marcada opcional no Insert mesmo que a coluna física seja
 * NOT NULL: o `crud-engine` preenche esse campo automaticamente a partir do `sub` do JWT quando
 * ele vem omitido no payload (ver `crud-engine.ts::createRecord`). Sem essa exceção, o
 * `zValidator` rejeitaria a requisição antes mesmo do auto-preenchimento rodar, tornando o
 * recurso inatingível via API — bug real encontrado rodando o exemplo `postgres-rbac` end-to-end.
 */
export function generateSchemasString(
  tableName: string,
  columns: { [colName: string]: any },
  tableOptions: TableOptions = {}
): string {
  const ownerField = tableOptions.owner_field;

  let schemaString = `import { z } from "zod";\n\n`;

  schemaString += `export const ${tableName}SelectSchema = z.object({\n`;
  for (const [colName, colDef] of Object.entries(columns)) {
    schemaString += `  ${colName}: ${buildFieldZodSchema(colDef)},\n`;
  }
  schemaString += `});\n\n`;

  schemaString += `export const ${tableName}InsertSchema = z.object({\n`;
  for (const [colName, colDef] of Object.entries(columns) as any[]) {
    if (colDef.isPrimaryKey && colDef.type === "integer") {
      continue; // Omitir ID primário autoincremento no insert
    }
    const isOwnerField = colName === ownerField;
    const fieldSchema = buildFieldZodSchema(colDef) + (isOwnerField ? ".optional()" : "");
    schemaString += `  ${colName}: ${fieldSchema},\n`;
  }
  schemaString += `});\n\n`;

  schemaString += `export const ${tableName}UpdateSchema = ${tableName}InsertSchema.partial();\n`;

  return schemaString;
}
