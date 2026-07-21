export type DrizzleDriver = "postgres" | "sqlite";

interface ColumnLike {
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
}

/**
 * Camada de acesso a dados tipada via Drizzle ORM, gerada automaticamente a partir do mesmo
 * metadata.json que alimenta os schemas Zod/rotas/hooks. Drizzle exige um schema por dialeto em
 * tempo de compilação (`sqliteTable` vs `pgTable` produzem tipos incompatíveis entre si) — o que
 * conflita com o design do resto do motor, que escolhe o driver em runtime via `DB_DRIVER` para
 * que o MESMO router gerado funcione contra qualquer um dos dois bancos (ver
 * `src/lib/runtime/db-client.ts` e os testes de integração Postgres/SQLite). Por isso esta camada
 * é oferecida como um artefato ADICIONAL e opcional (`--drizzle <postgres|sqlite>` no codegen),
 * para quem quer consultas 100% tipadas em um projeto que já sabe fixar seu dialeto de banco,
 * sem substituir o crud-engine genérico que dá a portabilidade multi-driver ao motor.
 */
function sqliteColumnBuilder(colName: string, physicalType: string): { expr: string; builder: string } {
  const t = physicalType.toLowerCase();
  if (t.includes("int")) return { expr: `integer("${colName}")`, builder: "integer" };
  if (t === "real" || t === "float" || t === "double") return { expr: `real("${colName}")`, builder: "real" };
  if (t === "blob") return { expr: `blob("${colName}")`, builder: "blob" };
  if (t.includes("bool")) return { expr: `integer("${colName}", { mode: "boolean" })`, builder: "integer" };
  return { expr: `text("${colName}")`, builder: "text" };
}

function postgresColumnBuilder(colName: string, physicalType: string): { expr: string; builder: string } {
  const t = physicalType.toLowerCase();
  if (t.includes("int")) return { expr: `integer("${colName}")`, builder: "integer" };
  if (t === "boolean" || t === "bool") return { expr: `boolean("${colName}")`, builder: "boolean" };
  if (t === "uuid") return { expr: `uuid("${colName}")`, builder: "uuid" };
  if (t === "json" || t === "jsonb") return { expr: `jsonb("${colName}")`, builder: "jsonb" };
  if (t.includes("timestamp") || t === "date") return { expr: `timestamp("${colName}")`, builder: "timestamp" };
  if (t === "numeric" || t === "decimal" || t === "real" || t === "double precision") {
    return { expr: `numeric("${colName}")`, builder: "numeric" };
  }
  return { expr: `text("${colName}")`, builder: "text" };
}

export function generateDrizzleSchemaString(
  tableName: string,
  colDefs: { [colName: string]: ColumnLike },
  driver: DrizzleDriver
): string {
  const isPostgres = driver === "postgres";
  const tableFn = isPostgres ? "pgTable" : "sqliteTable";
  const importSource = isPostgres ? "drizzle-orm/pg-core" : "drizzle-orm/sqlite-core";
  const builderFn = isPostgres ? postgresColumnBuilder : sqliteColumnBuilder;

  const usedBuilders = new Set<string>();
  const columnLines: string[] = [];

  for (const [colName, colDef] of Object.entries(colDefs)) {
    const { expr, builder } = builderFn(colName, colDef.type);
    usedBuilders.add(builder);

    let finalExpr = expr;
    if (colDef.isPrimaryKey) {
      finalExpr += ".primaryKey()";
    } else if (!colDef.isNullable) {
      finalExpr += ".notNull()";
    }
    columnLines.push(`  ${colName}: ${finalExpr},`);
  }

  const importList = [tableFn, ...Array.from(usedBuilders).sort()].join(", ");

  return `import { ${importList} } from "${importSource}";

export const ${tableName}Table = ${tableFn}("${tableName}", {
${columnLines.join("\n")}
});
`;
}
