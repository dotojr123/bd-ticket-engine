/**
 * Gera o arquivo TypeScript de tipos correspondentes inferidos via z.infer.
 */
export function generateTypesString(tableName: string): string {
  const camelTableName = tableName.charAt(0).toUpperCase() + tableName.slice(1);

  return `import { z } from "zod";
import { ${tableName}SelectSchema, ${tableName}InsertSchema, ${tableName}UpdateSchema } from "../schemas/${tableName}";

export type ${camelTableName}Select = z.infer<typeof ${tableName}SelectSchema>;
export type ${camelTableName}Insert = z.infer<typeof ${tableName}InsertSchema>;
export type ${camelTableName}Update = z.infer<typeof ${tableName}UpdateSchema>;
`;
}
