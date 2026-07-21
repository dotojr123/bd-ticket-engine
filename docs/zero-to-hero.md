# Zero to Hero: do diretório vazio a uma API CRUD real em < 10 minutos

Este tutorial usa SQLite (zero infraestrutura externa) e é literalmente o que roda em
[`examples/basic-sqlite`](../examples/basic-sqlite) — copie os arquivos de lá, ou reproduza os
passos abaixo em um projeto do zero.

## 0. Pré-requisitos

- Node.js 20+
- Nada mais. Sem Docker, sem conta em nenhum serviço externo.

## 1. Projeto e dependências (1 min)

```bash
mkdir meu-projeto && cd meu-projeto
npm init -y
npx bd-ticket-init          # ou: npx tsx caminho/para/scripts/transplant.js --target .
```

O `bd-ticket-init` pergunta o framework HTTP, o driver de banco, mostra as tabelas encontradas (se
já houver um banco) e injeta tudo — arquivos do motor, scripts npm, `.env`. Sem ele, use
`transplant.js` e configure manualmente (ver `README.md` da raiz do motor).

## 2. Criar a tabela física (1 min)

Este passo é o único onde você escreve SQL — o motor não inventa colunas, ele lê o que já existe.

```ts
// seed.ts
import Database from "better-sqlite3";
const db = new Database("local.db");
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ativo'
  );
`);
```

```bash
npx tsx seed.ts
```

## 3. Etiquetar as colunas (2 min)

Edite `bd-ticket.config.json` — isso é o único lugar onde você descreve *intenção de negócio*
(quem pode ler/escrever, como validar, como renderizar):

```json
{
  "project": "meu-projeto",
  "tables": {
    "users": {
      "columns": {
        "nome": { "label": "Nome", "validation": { "required": true }, "permissions": { "read": ["user","admin"], "write": ["admin"] }, "ui_control": { "component": "TextInput" } },
        "email": { "label": "E-mail", "validation": { "required": true }, "permissions": { "read": ["user","admin"], "write": ["admin"] }, "ui_control": { "component": "TextInput" } },
        "status": { "label": "Status", "validation": { "required": true, "options": ["ativo","inativo"] }, "permissions": { "read": ["user","admin"], "write": ["admin"] }, "ui_control": { "component": "SelectInput" } }
      }
    }
  }
}
```

Referência completa de todos os campos possíveis: [`docs/metadata-schema.md`](./metadata-schema.md).

## 4. Extrair, gerar, validar (1 min)

```bash
npm run db:extract-metadata -- --driver sqlite
npm run db:codegen
npm run db:validate
```

Em `src/contracts/` agora existem, gerados — não escritos à mão: schemas Zod, tipos TS, o router
Hono com CRUD real e RBAC via JWT, e hooks React Query.

## 5. Subir o servidor (1 min)

```ts
// server.ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { usersRouter } from "./src/contracts/router/users";

const app = new Hono();
app.route("/users", usersRouter);
serve({ fetch: app.fetch, port: 3000 });
```

```bash
npx tsx server.ts
```

## 6. Testar de verdade (1 min)

Defina `JWT_SECRET` no `.env` (`cp .env.example .env` já traz um valor de demonstração) e gere um
token:

```bash
npx tsx -e "import('hono/jwt').then(({sign}) => sign({sub:'demo',role:'admin',exp:Math.floor(Date.now()/1000)+3600},'<seu-JWT_SECRET>','HS256').then(console.log))"
```

```bash
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"nome":"Ana","email":"ana@example.com","status":"ativo"}'

curl http://localhost:3000/users -H "Authorization: Bearer <token>"
```

Dados reais, persistidos em `local.db`, com validação Zod e RBAC — sem uma linha de SQL ou de
lógica de autenticação escrita à mão.

## 7. Formulário React (2 min, opcional)

```tsx
import { DynamicForm } from "./src/components/DynamicForm";
import { usersInsertSchema } from "./src/contracts/schemas/users";
import { useUsersCreate } from "./src/contracts/hooks/users";

function CreateUserForm() {
  const createUser = useUsersCreate({ apiBaseUrl: "http://localhost:3000", authToken: "<token>" });
  return (
    <DynamicForm
      schema={usersInsertSchema}
      metadata={{ columns: { /* mesmas etiquetas do bd-ticket.config.json */ } }}
      role="admin"
      onSubmit={(values) => createUser.mutate(values)}
    />
  );
}
```

Veja [`examples/react-frontend`](../examples/react-frontend) para uma versão completa disso rodando.

## E agora?

- Mude uma permissão em `bd-ticket.config.json`, rode `npm run db:codegen` de novo, e note que a
  rota gerada muda sozinha — sem você tocar em `src/contracts/`.
- Adicione uma segunda tabela com uma FK apontando para `users` e veja o `<RelationSelect />`
  aparecer automaticamente no formulário.
- Veja [`examples/postgres-rbac`](../examples/postgres-rbac) para permissão em nível de linha,
  múltiplos papéis e rate limiting.
- Veja a seção "Advanced Patterns" em [`docs/metadata-schema.md`](./metadata-schema.md#advanced-patterns)
  para relacionamentos, soft delete e permissões granulares por coluna.
