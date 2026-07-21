# Exemplo: basic-sqlite

Fluxo mínimo do BD-Ticket Engine, do zero a uma API CRUD real rodando — SQLite, sem Docker, sem
servidor externo. Leva menos de 5 minutos.

## Rodando

```bash
npm install
cp .env.example .env
npm run setup   # cria o banco local.db, extrai metadata, gera contratos e valida — tudo de uma vez
npm run dev     # sobe o servidor Hono em http://localhost:3000
```

Em outro terminal:

```bash
npm run token   # gera um JWT de demonstração (role=admin)

curl http://localhost:3000/users -H "Authorization: Bearer <token-gerado-acima>"

curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <token-gerado-acima>" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Silva","email":"ana@example.com","status":"ativo"}'
```

## O que aconteceu

1. **`npm run seed`** — cria `local.db` com uma tabela `users` (nome, email, status), vazia.
2. **`npm run db:extract-metadata`** — lê o catálogo físico do SQLite e mescla com as etiquetas de
   negócio em `bd-ticket.config.json`, gerando `_reversa_sdd/metadata.json`.
3. **`npm run db:codegen`** — gera, a partir do `metadata.json`: schemas Zod (`src/contracts/schemas/`),
   tipos TS (`src/contracts/types/`), o router Hono com **CRUD real** e RBAC via JWT
   (`src/contracts/router/`), e hooks React Query (`src/contracts/hooks/`).
4. **`npm run db:validate`** — confere que nada foi editado manualmente nos arquivos gerados.
5. **`server.ts`** — só importa `usersRouter` já gerado e monta em `/users`. Nenhuma linha de SQL,
   validação ou autenticação foi escrita à mão.

## Próximos passos

- Edite `bd-ticket.config.json` (ex.: mude `permissions.write` de `status`), rode `npm run db:codegen`
  de novo e veja o roteador gerado mudar sozinho.
- Veja `../postgres-rbac` para permissão em nível de linha, múltiplos papéis e rate limiting.
- Veja `../react-frontend` para consumir esses hooks num formulário React de verdade.
