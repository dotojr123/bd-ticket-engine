/**
 * Mapeia tipos físicos SQL de catálogo para validadores lógicos Zod.
 */
export function mapSqlTypeToZod(sqlType: string): string {
  const typeLower = sqlType.toLowerCase().trim();

  // Tipos array do Postgres chegam como "integer[]", "text[]" etc.
  if (typeLower.endsWith("[]") || typeLower === "array") {
    const baseType = typeLower.endsWith("[]") ? typeLower.slice(0, -2) : "text";
    return `z.array(${mapSqlTypeToZod(baseType)})`;
  }

  switch (typeLower) {
    case "integer":
    case "int":
    case "int4":
    case "int8":
    case "bigint":
    case "smallint":
    case "real":
    case "float":
    case "float4":
    case "float8":
    case "numeric":
    case "double":
    case "double precision":
    case "decimal":
    case "serial":
    case "bigserial":
      return "z.number()";
    case "boolean":
    case "bool":
      return "z.boolean()";
    case "timestamp":
    case "timestamp without time zone":
    case "timestamp with time zone":
    case "date":
    case "datetime":
      return "z.coerce.date()";
    case "uuid":
      return "z.string().uuid()";
    case "json":
    case "jsonb":
      return "z.any()";
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
