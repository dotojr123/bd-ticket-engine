# Data Delta: Metadata Extractor

> Identificador: `001-metadata-extractor`
> Data: `2026-07-21`

---

## 1. Entrada: Configuração de Metadados Local (Fallback)

Para bancos que não suportam comentários de coluna (D1/SQLite), o extrator mescla o arquivo local `bd-ticket.config.json` que deve residir na raiz do projeto. Exemplo estrutural:

```json
{
  "project": "BD-Ticket",
  "tables": {
    "pedidos": {
      "columns": {
        "status": {
          "label": "Status do Pedido",
          "validation": {
            "required": true,
            "options": ["pendente", "concluido", "cancelado"]
          },
          "permissions": {
            "read": ["user", "parceiro", "admin"],
            "write": ["admin"]
          },
          "ui_control": {
            "component": "Select",
            "visible_in_views": ["admin_dashboard"]
          }
        }
      }
    }
  }
}
```

---

## 2. Saída: `_reversa_sdd/metadata.json`

O arquivo unificado gerado será composto pela estrutura física (colunas, tipos, nulidade) mesclada de forma transparente com as chaves e propriedades de negócios lidas das etiquetas do banco (ou do arquivo fallback).

O `metadata.json` resultante é ordenado alfabeticamente chave por chave:

```json
{
  "project": "BD-Ticket",
  "tables": {
    "pedidos": {
      "columns": {
        "id": {
          "isForeignKey": false,
          "isNullable": false,
          "isPrimaryKey": true,
          "metadata": {},
          "references": null,
          "type": "integer"
        },
        "status": {
          "isForeignKey": false,
          "isNullable": false,
          "isPrimaryKey": false,
          "metadata": {
            "label": "Status do Pedido",
            "permissions": {
              "read": ["admin", "parceiro", "user"],
              "write": ["admin"]
            },
            "ui_control": {
              "component": "Select",
              "visible_in_views": ["admin_dashboard"]
            },
            "validation": {
              "max": null,
              "min": null,
              "options": ["pendente", "concluido", "cancelado"],
              "required": true
            }
          },
          "references": null,
          "type": "varchar"
        }
      }
    }
  },
  "version": "1.0.0"
}
```
Todos os campos nulos de validação (`min`, `max`, `options`) e tags devem ser inicializados explicitamente para facilitar o consumo nas etapas do codegen, evitando checagens de `undefined` redundantes.
