# Exemplo: react-frontend

Um app React (Vite) consumindo, sem nenhum `fetch` escrito à mão:

- Os **hooks React Query gerados** (`useUsersList`, `useUsersCreate`) do exemplo `basic-sqlite`.
- O **`<DynamicForm />`** headless do motor, montando o formulário de criação a partir de um schema
  Zod gerado.

## Pré-requisito

Este exemplo **consome o backend do `basic-sqlite`** em vez de duplicar outro backend inteiro —
mostra a composição real: gere o backend uma vez, plugue quantos frontends quiser.

```bash
cd ../basic-sqlite
npm install
cp .env.example .env
npm run setup
npm run dev          # deixe rodando em :3000
```

## Rodando este exemplo

Em outro terminal:

```bash
npm install
npm run dev           # abre em http://localhost:5173
```

No navegador: cole um token JWT no campo do topo (gere um com `npm run token` dentro de
`../basic-sqlite`, em outro terminal) — o formulário e a listagem passam a funcionar contra a API
real do `basic-sqlite`.

## Build de produção

```bash
npm run build
```

Roda `tsc` (typecheck estrito, incluindo os tipos gerados que este app importa de
`../basic-sqlite/src/contracts`) seguido do bundle de produção do Vite.

## O que isso prova

- O `<DynamicForm />` é genuinamente headless: nada aqui além do próprio HTML semântico
  (`<input>`, `<select>`) é estilizado pela biblioteca — qualquer CSS/tema é responsabilidade deste
  app.
- Os hooks gerados (`hooks-generator.ts`) já vêm com invalidação de cache: criar um usuário aqui
  atualiza a listagem automaticamente, sem código de sincronização manual.
