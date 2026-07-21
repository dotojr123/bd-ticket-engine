/**
 * Mapeia tipos físicos SQL de catálogo para validadores lógicos Zod.
 */
export function mapSqlTypeToZod(sqlType: string): string {
  const typeLower = sqlType.toLowerCase();

  switch (typeLower) {
    case "integer":
    case "int":
    case "real":
    case "numeric":
    case "double":
    case "decimal":
    case "serial":
      return "z.number()";
    case "boolean":
    case "bool":
      return "z.boolean()";
    case "timestamp":
    case "date":
    case "datetime":
      return "z.coerce.date()";
    default:
      return "z.string()";
  }
}

/**
 * Cria a string de definição de campo Zod considerando nulidade, obrigatoriedade e opções enums.
 */
export function buildFieldZodSchema(colDef: any): string {
  let schema = "";

  if (colDef.metadata?.validation?.options && Array.isArray(colDef.metadata.validation.options)) {
    const optionsStr = colDef.metadata.validation.options.map((opt: string) => `"${opt}"`).join(", ");
    schema = `z.enum([${optionsStr}])`;
  } else {
    schema = mapSqlTypeToZod(colDef.type);
  }

  // Tratamento de nullable
  if (colDef.isNullable) {
    schema += ".nullable().optional()";
  }

  return schema;
}
