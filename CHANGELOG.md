# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.
Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [Não lançado]

### Adicionado (rodada 3 — Plano de Evolução e Excelência: DX, CI/CD, empacotamento, UI, exemplos)
- **CI/CD real** (`.github/workflows/ci.yml`): matrix Node 20/22, typecheck, testes com cobertura, `npm audit`, scanner de segredos (modo `--all`), build + `npm pack --dry-run`.
- **Cobertura de testes real**: de 42,6% para 90,7% de statements em `src/lib/**`, com threshold aplicado no Jest. Testes novos para todo módulo que estava em 0% (`manifest`, `drift`, `env-paths`, `logger`, `d1`, `postgres` mockado, `express-router-generator`, `cli-output`, `detect-project`, lógica pura de `inputs.tsx`).
- **Empacotamento dual CJS/ESM** via `tsup` (`src/index.ts`, `src/components/index.ts`, `exports` map em `package.json`), validado com `require`/`import` reais via self-reference do pacote. `pg`/`better-sqlite3` convertidos para `require()` lazy para não forçar as duas dependências nativas simultaneamente.
- **`npx bd-ticket-init`**: wizard interativo (`@clack/prompts`) que detecta framework/driver, lista tabelas reais do banco, gera `.env` e roda o transplante — lógica de cópia extraída para `scripts/transplant-core.js`, compartilhada com `transplant.js`.
- **Cores ANSI e hyperlinks de terminal** (`src/lib/utils/cli-output.ts`, `picocolors`) nos quatro CLIs, com mensagens de erro mais acionáveis (extractor sem `DATABASE_URL`, SQLite inexistente, etc.).
- **Sete novos componentes headless** em `src/components/inputs.tsx` (`DateInput`, `DateTimeInput`, `TextareaInput`, `NumberInput`, `ToggleSwitch`, `MultiSelectInput`, `AutocompleteSelect`, `FileUploadInput`), sem visual fixo embutido, integrados ao `ui_control.component` do `<DynamicForm />`.
- **Três exemplos executáveis** em `/examples` (`basic-sqlite`, `postgres-rbac`, `react-frontend`), cada um validado rodando de ponta a ponta (não pseudocódigo) — `postgres-rbac` inclusive revelou um bug real do motor (ver "Corrigido").
- Tutorial `docs/zero-to-hero.md` e seção "Advanced Patterns" em `docs/metadata-schema.md`.
- `.github/dependabot.yml`, `SECURITY.md`, templates de issue/PR, `CODE_OF_CONDUCT.md`, `ROADMAP.md` público.

### Corrigido (rodada 3)
- **Bug real**: a coluna de `options.owner_field` era obrigatória no Insert Schema (Zod) mesmo sendo auto-preenchida pelo `crud-engine` a partir do JWT — o `zValidator` rejeitava a requisição antes do auto-preenchimento rodar, tornando esse recurso (documentado desde a rodada 2) inatingível via API. Encontrado rodando `examples/postgres-rbac` de ponta a ponta; corrigido em `src/lib/codegen/schema-generator.ts` (lógica extraída de `codegen.ts` para ficar testável), com testes de regressão.
- `scan-secrets.js`: novo modo `--all` (varre o checkout inteiro) para uso em CI, onde não existe "diff staged"; achou e corrigiu um falso positivo real em `_reversa_forward/001-metadata-extractor/onboarding.md`.
- `extractor.ts` não cria mais silenciosamente um `local.db` vazio quando o caminho apontado não existe — agora retorna um erro claro com o comando de correção sugerido.

### Adicionado (rodada 2 — itens que haviam ficado de fora da primeira rodada)
- **Drizzle ORM** (`src/lib/codegen/drizzle-generator.ts`, flag `--drizzle <postgres|sqlite>` no codegen): gera `src/contracts/drizzle/<tabela>.ts` com schema tipado real a partir do `metadata.json`, como camada adicional e opcional ao `crud-engine` genérico. Validado executando insert/select tipados reais contra SQLite (`tests/integration-drizzle.test.ts`).
- **Suporte multi-ambiente** (`src/lib/utils/env-paths.ts`, flag `--env` em extractor/codegen/migrate): isola metadata/histórico/migrações por ambiente nomeado (`_reversa_sdd/<env>/`, `migrations/<env>/`) e carrega `.env.<env>` por cima do `.env` base.
- **Auto-correção assistida no validador** (`npm run db:validate -- --fix`): ao detectar drift, roda o codegen automaticamente e reaudita; toda mensagem de erro agora vem com uma linha `[FIX SUGERIDO]`.
- **Núcleo de segurança desacoplado de framework HTTP** (`src/lib/runtime/core/auth-core.ts`, `core/rate-limit-core.ts`) e um segundo adapter real e completo: `src/lib/runtime/express-adapters.ts` + `src/lib/codegen/express-router-generator.ts` (flag `--target express|both` no codegen), reaproveitando o mesmo `crud-engine`. Validado com `tests/integration-express.test.ts` via `supertest`.
- **Testes de integração contra o dialeto Postgres real** via `pg-mem` (`tests/integration-postgres.test.ts`) — mesmo router gerado, mesmos cenários do teste SQLite, sem depender de Docker/servidor.
- **Preparação para publicação em registry**: `package.json` ganhou `bin` (4 CLIs), `files`, `engines`, `prepublishOnly`; `scripts/add-shebangs.js` injeta o shebang nos binários compilados. Validado com `npm pack --dry-run` (sem publicar de fato).
- Correção de um bug real introduzido pela própria expansão do motor: `scripts/transplant.js` estava desatualizado e não copiava os novos módulos — corrigido e validado transplantando para um diretório temporário e rodando `tsc --noEmit` + o validador transplantado com sucesso.

### Adicionado
- Camada de dados real (`src/lib/runtime/db-client.ts`, `crud-engine.ts`): rotas geradas agora executam CRUD real (Postgres via `pg.Pool` / SQLite via `better-sqlite3`), com transações, paginação/ordenação/filtro, soft delete opcional e normalização de erros de banco em respostas HTTP consistentes.
- Autenticação e autorização reais via JWT (`src/lib/runtime/auth.ts`), substituindo a confiança cega no header `X-User-Role`.
- Permissão em nível de linha (`options.owner_field`) e rate limiting em memória (`src/lib/runtime/rate-limit.ts`).
- Log de auditoria estruturado (`src/lib/runtime/audit-log.ts`) e métricas de execução dos CLIs (`src/lib/utils/logger.ts`).
- Checagem de integridade de chave estrangeira antes de insert/update, dentro de uma transação (`crud.assertForeignKeysExist`).
- Extração de cardinalidade (`one-to-one`/`many-to-one`) e regra `ON DELETE` das FKs, tanto no driver Postgres quanto SQLite/D1.
- Componente `<RelationSelect />` e integração no `<DynamicForm />` para renderizar colunas de FK como select assíncrono em vez de input numérico cru.
- Geração de hooks React Query tipados por tabela (`src/lib/codegen/hooks-generator.ts`), eliminando a necessidade de `fetch` manual no frontend.
- Sistema de migrações (`npm run db:migrate`): diff entre snapshots de `metadata.json` gera SQL `UP`/`DOWN` reversível; mudanças destrutivas exigem `--force`.
- Validação estrutural do `metadata.json` via schema Zod (`src/lib/codegen/metadata-schema.ts`) antes do codegen consumir o arquivo.
- `--dry-run` no extrator e no codegen.
- Suíte de testes de integração end-to-end (`tests/integration.test.ts`) exercitando CRUD real, RBAC, FK e soft delete contra SQLite em memória, sem depender de infraestrutura externa.
- Scanner de segredos (`scripts/scan-secrets.js`) e hook de pre-commit via husky.
- `LICENSE` (MIT), `.env.example` e referência formal do schema de metadados (`docs/metadata-schema.md`).

### Corrigido
- Extração de N+1 queries no driver Postgres (uma consulta por tabela) para um número fixo de consultas independente da quantidade de tabelas.
- Interpolação de identificadores de tabela em `PRAGMA` do driver SQLite/D1 agora validada contra um whitelist antes de ser usada.
- Validador de referências órfãs reescrito com a AST real do TypeScript (Compiler API) em vez de regex sobre texto bruto, eliminando falsos positivos em strings/comentários.
- Inconsistência de licença entre `package.json` (`ISC`) e `README.md` (`MIT`).
- Artefatos `.js` compilados de `tests/*.ts` que estavam sendo versionados junto do código-fonte, fazendo a suíte Jest rodar cada teste em duplicidade.

### Segurança
- Documentado e mitigado (do lado do repositório) o vazamento de uma credencial do GitHub embutida na URL do remote `origin` — ação de rotação da credencial em si é responsabilidade do mantenedor, fora do escopo de uma mudança de código.
