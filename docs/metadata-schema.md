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
    "component": "TextInput | SelectInput | CheckboxInput | RelationSelect | DateInput | DateTimeInput | TextareaInput | NumberInput | ToggleSwitch | MultiSelectInput",
    "visible_in_views": ["admin_table", "partner_panel"],
    "relation_label_field": "nome", // usado só quando component = RelationSelect
    "timezone": "America/Sao_Paulo" // usado só quando component = DateTimeInput
  }
}
```

- `permissions.read` / `permissions.write`: papéis (roles) autorizados. Vazio/ausente = sem
  restrição adicional além de exigir um JWT válido. Alimenta tanto o middleware RBAC do roteador
  Hono gerado (`requireRole`) quanto a visibilidade/edição no `<DynamicForm />`. **Importante:**
  essa checagem hoje só é aplicada no nível de *tabela* pelo roteador (união dos papéis de todas as
  colunas); a granularidade por coluna é reforçada apenas na UI (`<DynamicForm />` desabilita o
  campo). Ver "Advanced Patterns" abaixo.
- `ui_control.component = "RelationSelect"`: em colunas de FK, faz o `<DynamicForm />` renderizar
  um `<RelationSelect />` que busca as opções via `GET /<tabela_referenciada>` em vez de um input
  numérico cru. `relation_label_field` controla qual coluna do registro relacionado é exibida como
  label (default: `id`).
- `ui_control.component` para os demais tipos (`DateInput`, `DateTimeInput`, `TextareaInput`,
  `NumberInput`, `ToggleSwitch`, `MultiSelectInput`): componentes headless de `src/components/inputs.tsx`,
  com comportamento real (validação, debounce, acessibilidade) e sem opinião visual fixa — ver
  `CONTRIBUTING.md`, princípio "Headless". `AutocompleteSelect` e `FileUploadInput` também existem
  em `inputs.tsx`, mas exigem uma função de busca / regras de upload que não vêm só do metadata —
  use-os via `slots` no `<DynamicForm />` em vez de `ui_control.component`.

## Validação

Todo `metadata.json` é validado estruturalmente antes do codegen rodar
(`npm run db:codegen`) — campos ausentes/malformados produzem uma lista de erros com o caminho
exato do problema, em vez de uma exceção genérica de runtime.

## Advanced Patterns

### Relacionamentos entre tabelas

Não há nada para configurar manualmente — o extractor lê a FK física do banco (`REFERENCES` no
SQLite, `FOREIGN KEY` no Postgres) e preenche `references`, `onDelete` e `cardinality`
automaticamente. O que você controla via metadata é só a *apresentação*: marque
`ui_control.component: "RelationSelect"` na coluna de FK e, opcionalmente,
`relation_label_field` para escolher qual coluna do registro relacionado aparece no seletor. Veja
`examples/basic-sqlite` (sem relação) vs. o `test_pedidos.cliente_id → test_clientes.id` no
`bd-ticket.config.json` da raiz do motor (com relação) para comparar.

### Permissões granulares por coluna — o que é garantido e o que não é

`permissions.read`/`write` por coluna controlam **visibilidade e habilitação no
`<DynamicForm />`** com certeza. No roteador gerado, a checagem de RBAC (`requireRole`) é feita uma
vez por rota, com a lista de papéis sendo a **união** dos papéis de todas as colunas da tabela — ou
seja, qualquer papel autorizado a escrever em *alguma* coluna passa pela checagem HTTP, e a partir
daí o Zod aceita todo o payload, incluindo colunas cujo `permissions.write` restringe a um papel
mais específico. Isso é suficiente para "esconder o campo de quem não deveria editá-lo pela UI",
mas **não** é enforcement de API a nível de campo. Se isso importa para o seu caso de uso (ex.: só
`admin` pode reatribuir o dono de um registro), valide isso manualmente no seu próprio middleware
antes de ir para produção — é um gap conhecido, documentado em
`examples/postgres-rbac/README.md` e no checklist do motor.

### Soft delete + relacionamentos

`options.soft_delete: true` faz o `DELETE` marcar `deleted_at` em vez de remover a linha, e todo
`GET` (lista e detalhe) filtrar `deleted_at IS NULL` automaticamente. Isso não interfere na
checagem de FK: `assertForeignKeysExist` verifica a existência do registro referenciado pela chave
primária, então uma linha "soft-deletada" (que ainda existe fisicamente) continua satisfazendo uma
FK que aponte para ela — se isso não é o comportamento desejado no seu domínio, filtre
`deleted_at IS NULL` também nessa checagem via um middleware próprio antes de aceitar o insert/update.

### Extensão do código gerado

Os arquivos em `src/contracts/` **nunca devem ser editados manualmente** (o Fail-Fast Validator
existe justamente para pegar isso). Para adicionar lógica além do CRUD padrão (ex.: um endpoint
`/users/:id/reset-password`), crie um arquivo separado (ex.: `src/routes/custom-users.ts`) que
importa o router gerado e monta rotas adicionais nele, ou compõe os dois routers no seu `server.ts`:
`app.route("/users", usersRouter); app.route("/users", customUsersRouter);`.

### Integração com outro framework front-end (além de React)

O `<DynamicForm />` é acoplado a React/React Hook Form. O contrato que independe de framework é o
schema Zod + o router gerado (Hono/Express) — para Vue/Svelte/Angular, consuma diretamente
`src/contracts/schemas/<tabela>.ts` e a API REST gerada, construindo sua própria camada de
formulário naquele ecossistema. Isso ainda é trabalho manual hoje (ver `ROADMAP.md`, seção "fora de
escopo").
