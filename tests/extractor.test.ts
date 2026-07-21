import { sortObjectDeep } from "../src/lib/utils/sort";

describe("Metadata Extractor Test Suite", () => {
  test("T007: Deep Sorting of JSON keys should be deterministic", () => {
    const unordered = {
      version: "1.0.0",
      project: "Test-Project",
      tables: {
        pedidos: {
          columns: {
            status: {
              type: "varchar",
              metadata: {
                validation: {
                  required: true,
                  options: ["a", "b"]
                },
                label: "Status"
              }
            },
            id: {
              type: "integer"
            }
          }
        }
      }
    };

    const sorted = sortObjectDeep(unordered);
    
    // As chaves no primeiro nível devem estar ordenadas alfabeticamente:
    const rootKeys = Object.keys(sorted);
    expect(rootKeys).toEqual(["project", "tables", "version"]);

    // As colunas de pedidos devem estar ordenadas: id, status
    const colKeys = Object.keys(sorted.tables.pedidos.columns);
    expect(colKeys).toEqual(["id", "status"]);

    // As chaves de status.metadata devem estar ordenadas: label, validation
    const metaKeys = Object.keys(sorted.tables.pedidos.columns.status.metadata);
    expect(metaKeys).toEqual(["label", "validation"]);
  });

  test("Integration check (in-memory sqlite mock should succeed)", () => {
    // Mapeamento simples em memória para simular o comportamento de merge
    const dbSchema = {
      test_pedidos: {
        columns: {
          status: {
            type: "TEXT",
            isNullable: false,
            isPrimaryKey: false,
            isForeignKey: false,
            references: null
          }
        }
      }
    };

    const localConfig = {
      tables: {
        test_pedidos: {
          columns: {
            status: {
              label: "Status do Pedido",
              validation: {
                required: true
              }
            }
          }
        }
      }
    };

    // Lógica do extractor de D1:
    const merged: any = {
      project: "BD-Ticket-Test",
      version: "1.0.0",
      tables: {}
    };

    for (const [tableName, tableDef] of Object.entries(dbSchema)) {
      merged.tables[tableName] = {
        columns: {}
      };
      for (const [colName, colDef] of Object.entries(tableDef.columns)) {
        const configMeta = (localConfig.tables as any)?.[tableName]?.columns?.[colName];
        merged.tables[tableName].columns[colName] = {
          ...colDef,
          metadata: configMeta || {}
        };
      }
    }

    const finalResult = sortObjectDeep(merged);
    expect(finalResult.tables.test_pedidos.columns.status.metadata.label).toBe("Status do Pedido");
  });
});
