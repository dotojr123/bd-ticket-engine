# Roadmap Público

Este documento resume o que já existe, o que está em andamento e o que é considerado fora de escopo
por enquanto — para dar previsibilidade a quem está avaliando adotar o motor. Para o detalhamento
técnico item a item (incluindo o que foi validado e como), veja
`_reversa_sdd/production_readiness_checklist.md` e `_reversa_sdd/excellence_plan_checklist.md`.

## ✅ Já entregue

- Extração de schema real (Postgres/SQLite) com etiquetas de metadados de negócio.
- Codegen de schemas Zod, tipos TS, rotas Hono **e** Express (CRUD real, sem mocks), hooks React
  Query, e um schema Drizzle ORM opcional.
- Autenticação JWT real + RBAC, permissão em nível de linha, rate limiting, auditoria estruturada.
- Migrações reversíveis (`db:migrate`) com detecção de mudanças destrutivas.
- Suporte a múltiplos ambientes (`--env`).
- Auditor anti-drift baseado em AST, com auto-correção (`--fix`).
- Suíte de testes de integração real (SQLite, Postgres via `pg-mem`, Express via `supertest`,
  Drizzle) e cobertura de código medida e aplicada em CI.
- Pipeline de CI (GitHub Actions): typecheck, testes com cobertura, `npm audit`, build.

## 🚧 Em andamento / próximos passos

- Exemplos executáveis em `/examples` (`basic-sqlite`, `postgres-rbac`, `react-frontend`).
- Tutorial "Zero to Hero" guiando alguém de projeto vazio a formulário funcional.
- Expansão dos tipos de campo do `<DynamicForm />` (data, autocomplete, upload, número, etc.),
  mantendo o princípio headless — comportamento e estado expostos via slot, sem visual embutido.
- `npx bd-ticket-init`: wizard interativo de inicialização.
- Empacotamento npm dual CJS/ESM com `exports` map.

## ❌ Fora de escopo por enquanto (e por quê)

- **Publicação efetiva no registro npm.** O pacote está pronto para isso (`npm pack --dry-run`
  validado), mas publicar exige a conta/credenciais do mantenedor — decisão e ação humanas, não
  algo que a automação deveria fazer sozinha.
- **Adaptadores de UI para outros frameworks front-end (Vue, Angular).** Já existe prova real de
  portabilidade no *backend* (adapter Express ao lado do Hono, mesmo núcleo de segurança). Um
  adapter de UI é um tipo de trabalho diferente — construir componentes num ecossistema de frontend
  diferente — e não está planejado no curto prazo.
- **Serviços de terceiros que exigem conta própria** (Snyk, Coveralls/Codacy). A infraestrutura para
  usá-los (cobertura medida, `npm audit` no CI) já existe; conectar a um serviço externo específico
  fica a critério de quem for operar o projeto, já que exige credenciais que não pertencem a este
  repositório.

## Como isso é mantido atualizado

Este roadmap é atualizado manualmente a cada rodada de mudanças significativas. Para o estado exato
do que foi testado e como, os checklists em `_reversa_sdd/` são a fonte da verdade — este arquivo é
o resumo para quem só precisa da visão geral.
