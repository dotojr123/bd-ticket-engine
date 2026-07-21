import * as ts from "typescript";

const SCHEMA_SUFFIX_PATTERN = /^(\w+?)(InsertSchema|SelectSchema|UpdateSchema|Router)$/;
const IGNORED_TABLE_NAMES = new Set(["dummy", "fictitiousTable"]);

/**
 * Analisa o conteúdo de um arquivo de código para checar se há referências a esquemas de tabelas
 * órfãs. Diferente de um scanner por regex em texto bruto, percorre a AST real do TypeScript —
 * isso significa que identificadores dentro de strings ou comentários nunca são considerados
 * falsos positivos, pois o parser já os trata como tokens de tipo diferente.
 */
export function auditFileContent(
  filePath: string,
  content: string,
  validTables: string[]
): { filePath: string; errors: string[] } {
  const errors: string[] = [];
  const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind);

  const seen = new Set<string>();

  function visit(node: ts.Node) {
    if (ts.isIdentifier(node)) {
      const match = node.text.match(SCHEMA_SUFFIX_PATTERN);
      if (match) {
        const potentialTable = match[1];
        const dedupeKey = `${node.text}:${node.getStart(sourceFile)}`;

        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);

          const tableNameLower = potentialTable.toLowerCase();
          const hasMatch = validTables.some((t) => {
            const tClean = t.replace(/_/g, "").toLowerCase();
            const ptClean = tableNameLower.replace(/_/g, "").toLowerCase();
            return tClean === ptClean;
          });

          if (!hasMatch && !IGNORED_TABLE_NAMES.has(potentialTable)) {
            errors.push(
              `[REFERÊNCIA ÓRFÃ] O arquivo '${filePath}' invoca o contrato/schema '${node.text}', mas a tabela '${potentialTable}' não existe no metadata.json.`
            );
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return { filePath, errors };
}
