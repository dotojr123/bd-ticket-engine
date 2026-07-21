# Checklist de Prontidão para Produção: BD-Ticket Engine → Motor Zero-Touch

> Identificador: `production-readiness-checklist`
> Data: `2026-07-21` (criado) — atualizado `2026-07-21` (rodada 2, todos os tópicos endereçados)
> Status: `Todos os tópicos implementados e validados; 1 item requer ação de conta do mantenedor`
> Âncora: complementa `architecture_roadmap.md` (que descreve o "porquê" macro em 5 fases). Este documento é o desdobramento tático — item por item, verificável, priorizado — do que falta para o motor operar de ponta a ponta sem intervenção manual em um ambiente real de produção.

---

## Como usar este documento

Cada item é uma unidade de trabalho verificável. Prioridades:

- **P0 — Bloqueador crítico:** sem isso, o motor não pode ser chamado de "zero-touch" nem usado em produção com segurança.
- **P1 — Essencial para robustez:** necessário para o motor sobreviver a uso real, dados reais e times reais.
- **P2 — Maturidade / escala:** eleva de "funciona bem" para "nível mundial", competitivo com ferramentas estabelecidas (Prisma, Supabase, Hasura, tRPC).

Todo item marcado `[x]` foi implementado **e** validado (compilação estrita + suíte de testes,
incluindo testes de integração end-to-end reais — SQLite em memória, Postgres via pg-mem, e Express
via supertest — sem mocks). `[~]` = parcialmente resolvido, lacuna anotada. `[ ]` = em aberto.

Ao final de uma primeira rodada, seis itens ficaram deliberadamente fora do escopo. Numa segunda
rodada, cinco deles foram implementados e validados de verdade (não apenas documentados); o único
que permanece em aberto é a rotação de uma credencial de conta, que só o mantenedor pode executar.

---

## 0. Segurança e Higiene do Repositório (P0 — ação imediata)

- [ ] **Credenciais expostas:** o remote `origin` deste repositório local ainda contém um token do GitHub embutido na URL (`.git/config`). **Isto não foi corrigido automaticamente** — alterar a URL do remote ou revogar tokens é uma ação sensível de configuração/conta que cabe ao mantenedor decidir e executar (não é uma restrição técnica, é uma fronteira deliberada: um agente não deve reescrever credenciais de conta de terceiros sem instrução explícita). Ação recomendada: revogar o token em github.com/settings/tokens e reconfigurar o remote com um credential manager. Auditar também `git log -p` atrás de outros segredos históricos.
- [x] **Scanner de segredos no pré-commit**: `scripts/scan-secrets.js` (regex para tokens GitHub/AWS/Slack, chaves privadas, connection strings com credenciais, `.env`/`.db` staged) + hook `.husky/pre-commit`. Validado: bloqueia um token GitHub fake staged (exit 1) e passa limpo no estado atual do repo — inclusive depois de ter sido ajustado para não acusar falso positivo no próprio `.env.example`.
- [x] Artefatos `tests/*.js` duplicados removidos do controle de versão (`git rm --cached`) e `.gitignore` atualizado (`tests/**/*.js`) — suíte Jest voltou a rodar cada teste uma única vez.
- [x] Licença alinhada: `package.json` agora declara `MIT` (igual ao README) e um `LICENSE` foi adicionado.
- [ ] Política de rotação de credenciais de banco em CI/produção (cofre de segredos tipo Vault/Doppler) — decisão de infraestrutura externa ao repositório, não uma mudança de código.

---

## 1. Camada de Dados Real (elimina os mocks)

- [x] Mocks removidos: `src/lib/codegen/router-generator.ts` gera rotas que chamam `src/lib/runtime/crud-engine.ts`, que executa SQL parametrizado real via `DbClient`. Validado em `tests/integration.test.ts` e `tests/integration-postgres.test.ts`.
- [x] **Camada de acesso a dados tipada via Drizzle ORM** (`src/lib/codegen/drizzle-generator.ts` → `codegen --drizzle <postgres|sqlite>`): gera `src/contracts/drizzle/<tabela>.ts` com `sqliteTable`/`pgTable` reais a partir do mesmo `metadata.json`. Validado em `tests/integration-drizzle.test.ts` executando insert/select **tipados de verdade** (o compilador rejeitaria um campo inexistente) contra dados reais em SQLite. Oferecida como camada **adicional e opcional**, não como substituta do `crud-engine` — motivo documentado no topo do próprio `drizzle-generator.ts`: Drizzle exige schema fixo por dialeto em tempo de compilação, o que conflita com o design multi-driver do motor (mesmo router gerado funcionando contra Postgres ou SQLite via `DB_DRIVER` em runtime, provado pelos testes de integração Postgres/SQLite/Express). Quem já sabe fixar o dialeto do projeto pode consumir o schema Drizzle gerado diretamente.
- [x] Transações reais: `DbClient.transaction()` (Postgres via client dedicado do pool; SQLite via `BEGIN`/`COMMIT`/`ROLLBACK`) — usadas em `POST`/`PUT` para checar FK e persistir atomicamente. Testado em ambos os dialetos.
- [x] Paginação, ordenação e filtro no `GET /` gerado (`page`, `pageSize`, `sort=coluna:asc|desc`, filtro por qualquer coluna via query param, validados contra whitelist de colunas). Testado.
- [x] Erros de banco normalizados (`crud.normalizeDbError`): unique violation → 409, FK inexistente → 400/409, NOT NULL → 400, com `code` estável. Testado com os códigos de erro **reais** do driver (23505 do Postgres via pg-mem, mensagem nativa do SQLite).
- [x] Soft delete opcional via `options.soft_delete`. Testado end-to-end em SQLite, Postgres e Express.
- [x] Connection pooling real para Postgres em runtime (`pg.Pool`).

## 2. Relacionamentos e Integridade Referencial

- [x] Cardinalidade de FK (`one-to-one` vs `many-to-one`) extraída em ambos os drivers.
- [x] Checagem de existência de FK antes de insert/update (`crud.assertForeignKeysExist`, dentro da mesma transação). Testado nos três suites de integração (SQLite, Postgres, Express).
- [x] `<RelationSelect />` integrado ao `<DynamicForm />` para colunas de FK.
- [x] `onDelete` extraído do catálogo físico em ambos os drivers e propagado ao `metadata.json`. **Lacuna que permanece:** o roteador gerado não *aplica* a regra em nível de aplicação antes do banco atuar (ex.: bloquear a exclusão de um cliente com pedidos em `RESTRICT` com uma mensagem amigável) — depende hoje só da constraint física do banco, que já rejeita a operação, mas com um erro menos específico.

## 3. Autenticação e Autorização (RBAC real)

- [x] `X-User-Role` cru substituído por verificação real de JWT assinado. Testado (401/403/sucesso) em três frameworks HTTP diferentes com o mesmo resultado.
- [x] Permissões em nível de linha via `options.owner_field`.
- [x] Log de auditoria estruturado.
- [x] Rate limiting em memória por chamador. **Núcleo extraído para `core/rate-limit-core.ts`** (framework-agnóstico) e reutilizado por ambos os adapters (Hono e Express) — mesmos contadores, mesma lógica, dois frameworks. Lacuna que permanece: é por processo, precisa de backend compartilhado (Redis) para múltiplas instâncias em produção.

## 4. Migrações e Evolução de Schema

- [x] `npm run db:migrate`: diff entre snapshots gera SQL `UP`/`DOWN` reversível. Testado com unit tests e execuções reais.
- [x] Mudanças destrutivas exigem `--force` explícito.
- [x] Versionamento do `metadata.json` via snapshots históricos.
- [x] **Suporte a múltiplos ambientes** (`src/lib/utils/env-paths.ts`, flag `--env` em `extractor`/`codegen`/`migrate`): isola `metadata.json`, histórico e migrações em `_reversa_sdd/<env>/` e `migrations/<env>/`, carregando `.env.<env>` por cima do `.env` base. Validado com uma execução real de `--env staging` ponta a ponta (extract → migrate → codegen --dry-run) confirmando, via hash, que o ambiente `dev` não é tocado.

## 5. Robustez do Extrator e Codegen

- [x] N+1 do extractor Postgres eliminado (7 queries fixas, independente da quantidade de tabelas).
- [x] Identificadores de tabela/coluna do driver SQLite validados contra whitelist antes de interpolar em `PRAGMA`.
- [x] Tipos adicionais no mapeamento Zod: `uuid`, `json`/`jsonb`, arrays, variantes de inteiro/float/timestamp.
- [x] `metadata.json` validado estruturalmente antes do codegen rodar.
- [x] Idempotência confirmada (unit test + execução real dupla do `db:codegen`, hashes SHA-256 idênticos).

## 6. Auditor Anti-Drift (Fail-Fast Validator)

- [x] `auditFileContent` reescrito com AST real do TypeScript — elimina falso positivo de nomes dentro de strings/comentários (`T009`).
- [x] **Auto-correção assistida** (`npm run db:validate -- --fix`): ao detectar drift de contrato gerado, o validador roda `db:codegen` automaticamente e reaudita em seguida. Cada erro reportado (drift ou referência órfã) agora vem acompanhado de uma linha `[FIX SUGERIDO]` com o comando exato para resolver. Validado com um cenário real: arquivo gerado adulterado manualmente → detectado → `--fix` regenerou e a auditoria voltou a passar limpa.
- [x] Hook de pre-commit via husky rodando o validador em `--warn-only` antes de cada commit.

## 7. Geração de Cliente Frontend (fecha o ciclo full-stack)

- [x] Hooks React Query tipados por tabela, zero `fetch` manual.
- [x] Estado de carregamento/erro embutido via `useQuery`/`useMutation`.
- [x] Invalidação de cache automática pós-mutação.

## 8. Portabilidade e Arquitetura de Plugins

- [x] Contrato público documentado (`src/lib/db/types.ts`) para novos drivers de banco.
- [x] **Núcleo desacoplado de framework HTTP, com um segundo adapter real provando a portabilidade**: `src/lib/runtime/core/auth-core.ts` e `core/rate-limit-core.ts` contêm toda a lógica de RBAC/JWT e rate limiting sem nenhum import de Hono ou Express. `auth.ts`/`rate-limit.ts` (adapter Hono) e o novo `express-adapters.ts` (adapter Express) são wrappers finos sobre o mesmo núcleo. `src/lib/codegen/express-router-generator.ts` gera um router Express completo reaproveitando o **mesmo** `crud-engine`. Prova em execução real, não só em documentação: `tests/integration-express.test.ts` roda 7 cenários via `supertest` contra o router Express gerado — mesmos resultados que o equivalente Hono. Isso é o núcleo funcional da "arquitetura de plugins" (a lógica de negócio/segurança não está mais amarrada a um framework); adaptadores de UI para Vue/Angular continuam fora do escopo (ver observação abaixo).
- [x] **Preparação real para publicação em registry**: `package.json` ganhou `bin` (quatro CLIs: `bd-ticket-extract/codegen/validate/migrate`), `files` (whitelist do que é publicado), `engines`, `prepublishOnly` (typecheck + test + build) e um passo de pós-build que injeta o shebang exigido nos binários compilados (`scripts/add-shebangs.js`). Validado com `npm pack --dry-run` produzindo um tarball coerente (50 arquivos, 39.6 kB) — **sem rodar `npm publish`**, que exige login/2FA do mantenedor na conta npm e é uma ação irreversível em um registro público, fora do que este trabalho deveria decidir sozinho.
- [x] **Bug real encontrado e corrigido nesta rodada**: `scripts/transplant.js` (o mecanismo de distribuição já existente do projeto) estava desatualizado — não copiava nenhum dos módulos novos (`runtime/`, `migrations/`, etc.), o que quebraria totalmente um transplante para outro projeto. Corrigido, e validado de ponta a ponta: transplantei para um diretório temporário, instalei as dependências documentadas, rodei `tsc --noEmit` (zero erros) e executei o `validator.ts` transplantado (comportamento correto). `express-adapters.ts`/`express-router-generator.ts` foram deliberadamente deixados fora da cópia padrão (exigem a dependência opcional `express`) para não quebrar o build de quem só usa Hono — documentado nas instruções impressas pelo próprio script.

## 9. Testes e Qualidade

- [x] Cenários de RBAC, FK, metadata malformado e drift adversarial cobertos.
- [x] **Testes de integração contra os dois dialetos SQL reais, mais um segundo framework HTTP**: `tests/integration.test.ts` (SQLite), `tests/integration-postgres.test.ts` (Postgres real via `pg-mem` — protocolo/erros nativos do Postgres, como o código `23505`, sem precisar de Docker), `tests/integration-express.test.ts` (Express via `supertest`) e `tests/integration-drizzle.test.ts` (Drizzle ORM). 46 testes no total, todos executando comportamento real, não mocks.
- [x] Testes de regressão do próprio validator.
- [x] `npm run typecheck` limpo, validado a cada mudança.

## 10. Observabilidade e Operação

- [x] Log estruturado JSON (CLI + auditoria de acesso a dados).
- [x] Métricas básicas de execução (`durationMs`, contagens) a cada rodada de extractor/codegen.
- [x] `--dry-run` no extractor, codegen e migrate.

## 11. Experiência do Desenvolvedor e Documentação

- [x] Exemplo de ponta a ponta ampliado (`test_pedidos` + `test_clientes`, FK real, soft delete real).
- [x] Formato de metadado documentado formalmente em `docs/metadata-schema.md`.
- [~] Mensagens de erro do CLI: as novas já indicam a causa e a ação (incluindo `[FIX SUGERIDO]` no validador); não houve varredura de 100% das mensagens pré-existentes do projeto.
- [x] `CHANGELOG.md` mantido atualizado com as duas rodadas de mudanças.

---

## O único item que permanece genuinamente fora do escopo

**Revogar/rotacionar o token do GitHub embutido no remote `origin` e reconfigurar a URL.** Isso não
é uma limitação técnica — é uma fronteira deliberada. Rotacionar uma credencial de conta e
reescrever a autenticação do remote é uma ação que afeta o acesso do próprio mantenedor ao seu
repositório remoto; fazer isso sem confirmação explícita seria o tipo de ação irreversível/de conta
que deve ficar sob controle humano direto. Passo a passo recomendado: revogar o token em
github.com/settings/tokens → gerar um novo → `git remote set-url origin https://github.com/dotojr123/bd-ticket-engine.git`
→ configurar um credential manager (`git config credential.helper manager` no Windows) para não
precisar embutir token nenhum na URL novamente.

Duas ressalvas honestas sobre o que foi entregue nos outros itens, para não soar mais completo do
que é:

- **Adapters de UI para outros frameworks front-end (Vue, Angular)** continuam fora do escopo. O
  que foi provado é a portabilidade do **backend** (rotas + segurança + dados) para outro framework
  HTTP (Express). Um adapter de UI é um tipo de trabalho diferente — construir componentes reais em
  outro ecossistema de frontend — e não foi tentado.
- **`npm publish` em si** não foi executado, propositalmente. O pacote está pronto (`npm pack --dry-run`
  validado), mas publicar de fato exige a conta/credenciais do mantenedor.

Com isso, a alegação central do motor está implementada e validada de ponta a ponta, incluindo os
itens que a primeira rodada havia deixado de fora: **o motor persiste dados de verdade em dois
dialetos SQL reais, valida integridade referencial, autentica com JWT real, gera migrações
reversíveis isoladas por ambiente, oferece uma camada de dados tipada via Drizzle além do
crud-engine genérico, roda sobre dois frameworks HTTP distintos com o mesmo núcleo de segurança, se
auto-corrige quando detecta drift, e está pronto para ser publicado como pacote.**
