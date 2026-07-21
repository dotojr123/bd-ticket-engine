# Referência do `metadata.json` e das etiquetas de coluna/tabela

Este documento formaliza a estrutura consumida pelo Codegen Engine. A validação real vive em
[`src/lib/codegen/metadata-schema.ts`](../src/lib/codegen/metadata-schema.ts) (schema Zod) — este
arquivo é a referência legível para humanos; o `.ts` é a fonte da verdade que o codegen
efetivamente executa.

## Estrutura raiz

```jsonc
{
  "project": "string",
  "version": "string",
  "tables": {
    "<nome_da_tabela>": { /* TableDefinition, ver abaixo */ }
  }
}
```

## `TableDefinition`

| Campo     | Tipo                    | Obrigatório | Descrição |
|-----------|-------------------------|-------------|-----------|
| `columns` | `{ [nome]: ColumnDefinition }` | Sim | Colunas físicas da tabela. |
| `options` | `TableOptions`          | Não | Comportamento do CRUD gerado para esta tabela. |

### `TableOptions`

| Campo         | Tipo      | Default | Efeito no motor |
|---------------|-----------|---------|------------------|
| `soft_delete` | `boolean` | `false` | Se `true`, o gerador exige uma coluna `deleted_at` na tabela; `DELETE` marca `deleted_at` em vez de remover a linha, e toda listagem/consulta filtra `deleted_at IS NULL` automaticamente. |
| `owner_field` | `string`  | —       | Nome da coluna que identifica o dono do registro. Quando definido, o roteador gerado filtra automaticamente por `owner_field = <sub do JWT>` em listagens/leituras/updates — permissão em nível de linha — exceto para o papel `admin`, que sempre enxerga tudo. |

No driver Postgres, `options` vem do **comentário da tabela** (`COMMENT ON TABLE ...`), no mesmo
formato JSON usado nos comentários de coluna. No driver SQLite/D1, vem de `tables.<nome>.options`
no arquivo de config local (`bd-ticket.config.json` por padrão).

## `ColumnDefinition`

Campos físicos (sempre extraídos automaticamente do catálogo do banco — **não são etiquetados
manualmente**):

| Campo          | Tipo                                     | Descrição |
|----------------|-------------------------------------------|-----------|
| `type`         | `string`                                  | Tipo físico da coluna (ex.: `integer`, `text`, `uuid`, `jsonb`, `integer[]`). |
| `isNullable`   | `boolean`                                 | Vem de `NOT NULL`/`PRAGMA table_info`. |
| `isPrimaryKey` | `boolean`                                 | Faz parte da chave primária. |
| `isForeignKey` | `boolean`                                 | Referencia outra tabela. |
| `references`   | `"tabela.coluna" \| null`                 | Alvo da FK, quando `isForeignKey=true`. |
| `onDelete`     | `"CASCADE" \| "RESTRICT" \| "SET NULL" \| "SET DEFAULT" \| "NO ACTION" \| null` | Regra `ON DELETE` física da FK. |
| `cardinality`  | `"one-to-one" \| "many-to-one" \| null`   | Inferida: FK também coberta por `UNIQUE` ⇒ `one-to-one`; caso contrário `many-to-one`. |
| `metadata`     | `object`                                  | Etiquetas de negócio (ver abaixo) — a única parte editada manualmente. |

### `metadata` (etiquetas de negócio, editáveis)

No Postgres, vêm do **comentário da coluna** (`COMMENT ON COLUMN tabela.coluna IS '{...}'`) em
JSON. No SQLite/D1, vêm de `tables.<tabela>.columns.<coluna>` no arquivo de config local.

```jsonc
{
  "label": "Texto exibido como label do campo no formulário",
  "validation": {
    "required": true,
    "options": ["valor_a", "valor_b"] // gera z.enum([...]) em vez do tipo físico
  },
  "permissions": {
    "read": ["user", "parceiro", "admin"],
    "write": ["parceiro", "admin"]
  },
  "ui_control": {
    "component": "TextInput | SelectInput | CheckboxInput | RelationSelect",
    "visible_in_views": ["admin_table", "partner_panel"],
    "relation_label_field": "nome" // usado só quando component = RelationSelect
  }
}
```

- `permissions.read` / `permissions.write`: papéis (roles) autorizados. Vazio/ausente = sem
  restrição adicional além de exigir um JWT válido. Alimenta tanto o middleware RBAC do roteador
  Hono gerado (`requireRole`) quanto a visibilidade/edição no `<DynamicForm />`.
- `ui_control.component = "RelationSelect"`: em colunas de FK, faz o `<DynamicForm />` renderizar
  um `<RelationSelect />` que busca as opções via `GET /<tabela_referenciada>` em vez de um input
  numérico cru. `relation_label_field` controla qual coluna do registro relacionado é exibida como
  label (default: `id`).

## Validação

Todo `metadata.json` é validado estruturalmente antes do codegen rodar
(`npm run db:codegen`) — campos ausentes/malformados produzem uma lista de erros com o caminho
exato do problema, em vez de uma exceção genérica de runtime.
