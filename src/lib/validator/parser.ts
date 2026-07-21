/**
 * Analisa o conteúdo de um arquivo de código para checar se há referências a esquemas de tabelas órfãs.
 */
export function auditFileContent(
  filePath: string,
  content: string,
  validTables: string[]
): { filePath: string; errors: string[] } {
  const errors: string[] = [];

  // Regex para achar invocações de schemas do tipo "nomeTabelaInsertSchema", "nomeTabelaSelectSchema", etc.
  const schemaRegex = /(\w+)(InsertSchema|SelectSchema|UpdateSchema|Router)\b/g;

  let match;
  while ((match = schemaRegex.exec(content)) !== null) {
    const potentialTable = match[1];

    // Converter para snake_case se for camelCase (ex: testPedidos -> test_pedidos) para bater com metadata
    const tableNameLower = potentialTable.toLowerCase();

    // Encontrar correspondência no array de tabelas válidas físicas
    const hasMatch = validTables.some((t) => {
      // Remover sublinhados para comparação flexível (ex: test_pedidos === testpedidos)
      const tClean = t.replace(/_/g, "").toLowerCase();
      const ptClean = tableNameLower.replace(/_/g, "").toLowerCase();
      return tClean === ptClean;
    });

    if (!hasMatch && potentialTable !== "dummy" && potentialTable !== "fictitiousTable") {
      errors.push(
        `[REFERÊNCIA ÓRFÃ] O arquivo '${filePath}' invoca o contrato/schema '${match[0]}', mas a tabela '${potentialTable}' não existe no metadata.json.`
      );
    }
  }

  return { filePath, errors };
}
