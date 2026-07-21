# Checklist: Plano de Evolução e Excelência (7 Pilares)

> Identificador: `excellence-plan-checklist`
> Data: `2026-07-21` (criado e concluído na mesma rodada)
> Âncora: implementa o "Plano de Evolução e Excelência: BD-Ticket Engine" fornecido pelo usuário,
> com os ajustes anotados na análise crítica prévia — onde o plano conflitava com princípios já
> declarados do projeto (headless UI, modelo de distribuição por cópia), a *intenção* foi
> implementada de forma consistente com esses princípios em vez de contradizê-los.

Convenção: `[x]` implementado e validado (compila/roda/testado de verdade, não só gerado).
`[~]` implementado com lacuna anotada. `[ ]` requer ação externa ao repositório.

---

## Pilar 1 — Empacotamento e Distribuição
- [x] `exports` map + build dual CJS/ESM via tsup (`src/index.ts`, `src/components/index.ts`).
  Validado com `require("bd-ticket")`, `import * as lib from "bd-ticket"` e
  `require("bd-ticket/ui")` reais (self-reference via `exports`, o mais próximo de "instalado de
  verdade" sem publicar). `pg`/`better-sqlite3` convertidos para `require()` lazy (dentro da
  função, não no topo do módulo) tanto em `db-client.ts` quanto em `postgres.ts`/`d1.ts`, para não
  forçar as duas dependências nativas em quem só usa uma — confirmado via grep no bundle final que
  nenhum `require("pg")`/`require("better-sqlite3")` sobrou no escopo de módulo.
- [x] `transplant.js` mantido (não substituído) — lógica extraída para `scripts/transplant-core.js`,
  fonte única compartilhada entre o CLI `transplant.js` e o novo wizard `bd-ticket-init`, evitando
  reincidência do bug já visto nesta série (as duas listas de arquivos divergindo).
- [x] `npx bd-ticket-init` — wizard interativo real (`src/bin/init.ts`, `@clack/prompts`): detecta
  framework/driver já instalados, conecta e lista tabelas de verdade (reaproveita
  `extractD1Schema`/`extractPostgresSchema`), gera `.env` com `JWT_SECRET` aleatório, roda o
  transplante e imprime os próximos passos. Validado estruturalmente (`--help`/`--version`
  funcionam sem erro, o que só acontece se todos os `require`/imports — incluindo o módulo
  compartilhado fora de `src/` — resolverem corretamente) e parcialmente de forma interativa
  (confirm + select renderizaram e avançaram o fluxo). **Lacuna:** não consegui automatizar um
  teste E2E completo simulando todas as teclas de um prompt raw-mode via stdin não-TTY — risco
  residual fica nos passos posteriores do wizard (multiselect, prompts subsequentes), que não
  foram exercitados byte a byte.

## Pilar 2 — DX do CLI
- [x] Cores ANSI via `picocolors` (`src/lib/utils/cli-output.ts`), que respeita `NO_COLOR`/
  `FORCE_COLOR`/detecção de TTY nativamente. Aplicado em `extractor.ts`, `codegen.ts`,
  `validator.ts`, `migrate.ts`. Confirmado via `cat -v` que os códigos ANSI reais (`\x1b[34m` etc.)
  são emitidos.
- [x] Hyperlinks de terminal OSC 8 (`cli.fileLink`), com `linkifyPaths` convertendo automaticamente
  caminhos `.ts` entre aspas já presentes nas mensagens de drift/referência órfã em links
  clicáveis — sem precisar reescrever as mensagens de erro já existentes.
- [x] Mensagens empáticas: `extractor.ts` sem `DATABASE_URL` agora sugere `--url`/trocar de driver;
  SQLite inexistente aponta o caminho exato; `codegen.ts` sem `metadata.json` sugere o comando
  exato (com `--env` se aplicável); toda mensagem de erro do `validator.ts` vem com uma linha
  `[FIX SUGERIDO]`.

## Pilar 3 — CI/CD e Qualidade
- [x] `.github/workflows/ci.yml`: matrix Node 20/22, `typecheck`, `test:coverage` com upload de
  artefato, `npm audit --omit=dev --audit-level=high`, scanner de segredos em modo `--all`
  (varredura do checkout completo, não só do diff staged — modo novo, criado porque o modo
  original não fazia sentido fora de um commit local), e job de `build` + `npm pack --dry-run`.
- [x] Cobertura real medida e com threshold aplicado (`jest.config.js`): saíu de **42,6%** para
  **90,7%** de statements em `src/lib/**` (CLIs em `src/bin/` excluídos da métrica — validados por
  processo real via `tests/cli-smoke.test.ts`, não por instrumentação istanbul, que não alcança um
  processo filho). Foram escritos testes novos para todos os módulos que estavam em 0%:
  `manifest.ts`, `drift.ts`, `env-paths.ts`, `logger.ts`, `d1.ts` (SQLite real), `postgres.ts`
  (mock de `pg`), `express-router-generator.ts`, `zod-mapper.ts` (branches de array/uuid/json),
  `cli-output.ts`, `detect-project.ts`, `inputs.tsx` (lógica pura). 20 suítes, 90 testes.
- [x] Badge de CI no README (`shields.io`/badge nativo do GitHub Actions). Badges de cobertura
  externa (Coveralls/Codacy) e de versão npm **não foram adicionados** — exigiriam conta/token de
  terceiros ou publicação real, então um badge apontando para um serviço não configurado seria
  enganoso; documentado como pendência de infraestrutura, não como "feito".

## Pilar 4 — Expansão da UI (headless, respeitando CONTRIBUTING.md)
- [x] `DateInput`, `DateTimeInput` (com conversão real de timezone via `Intl.DateTimeFormat`),
  `TextareaInput` (contador de caracteres), `NumberInput`, `ToggleSwitch` (acessível via
  `role="switch"`+`aria-checked`+teclado), `MultiSelectInput` (estado real + slot `renderChip`
  opcional), `AutocompleteSelect` (debounce real) e `FileUploadInput` (validação real de
  tipo/tamanho/quantidade) — todos em `src/components/inputs.tsx`, **sem visual fixo embutido**
  (nenhuma cor, sombra ou tema — só estrutura), consistente com o princípio headless declarado.
  Os seis primeiros são auto-selecionáveis via `ui_control.component` no metadata; os dois últimos
  (que dependem de uma função de busca/regras específicas do app) são usados via `slots`.
- [x] Validação assíncrona customizada e condicional entre campos: já suportadas pelo mecanismo de
  `slots` existente (uma função arbitrária recebe `value`/`onChange`/`error` e pode implementar
  qualquer validação, incluindo chamadas ao backend) — não exigiu mudança de API, só documentação.
- [x] **Bug real encontrado e corrigido rodando o exemplo `postgres-rbac` de ponta a ponta**: a
  coluna de `options.owner_field` era gerada como obrigatória no Insert Schema (Zod), mesmo sendo
  auto-preenchida pelo `crud-engine` a partir do JWT — o `zValidator` rejeitava a requisição antes
  do auto-preenchimento rodar, tornando o recurso descrito na Fase 3 do checklist anterior
  **inatingível via API**. Corrigido em `src/lib/codegen/schema-generator.ts` (extraído do inline
  em `codegen.ts` para ficar testável) e coberto por dois testes de regressão.

## Pilar 5 — Documentação e Onboarding
- [x] Tutorial "Zero to Hero" (`docs/zero-to-hero.md`): mesmos passos do `examples/basic-sqlite`,
  validados rodando de verdade (ver Pilar 3 abaixo... este documento cobre isso na prática via o
  exemplo).
- [x] `/examples/basic-sqlite`: instalado, `npm run setup` (seed → extract → codegen → validate) e
  `npm run dev` rodados de verdade; testado via `curl` real — POST criou um usuário, GET retornou o
  usuário criado.
- [x] `/examples/postgres-rbac`: instalado, setup rodado, servidor subido, `npm run demo` executado
  contra o servidor real — confirmou auto-atribuição de dono, isolamento por linha entre dois
  usuários, admin enxergando tudo, e rate limit disparando 429 depois de 100 requisições. Foi
  rodando este exemplo que o bug do Pilar 4 acima foi descoberto.
- [x] `/examples/react-frontend`: `npm run build` (typecheck estrito + bundle Vite de produção)
  rodado com sucesso, importando de verdade os tipos/hooks gerados por `basic-sqlite`; servidor de
  dev subido e as rotas `/src/main.tsx`/`/src/App.tsx` confirmadas servidas/transformadas sem erro
  pelo Vite. Teste de interação em navegador real não foi executado (fora do escopo prático desta
  sessão), mas a cadeia de tipos ponta a ponta (schema Zod gerado → hook gerado → componente) está
  provada pelo build estrito.
- [x] Seção "Advanced Patterns" em `docs/metadata-schema.md`: relacionamentos, o limite real de
  permissão por coluna (tabela vs. linha — documentado com precisão, sem inflar a garantia),
  soft delete + FK, extensão do código gerado, e o caminho para outros frameworks front-end.

## Pilar 6 — Segurança e Conformidade
- [x] `npm audit` no CI (produção apenas, falha em `high`+).
- [x] `.github/dependabot.yml` (npm semanal + github-actions semanal).
- [x] `SECURITY.md` com processo de disclosure responsável.
- [x] Scanner de segredos expandido: novos padrões (Slack webhook, header `Authorization: Bearer`
  hardcoded) e o novo modo `--all` para varrer o checkout inteiro (usado no CI). Achou e corrigiu
  um falso positivo real em `_reversa_forward/001-metadata-extractor/onboarding.md` (string de
  conexão de exemplo) rodando pela primeira vez em modo `--all`.

## Pilar 7 — Comunidade e Governança
- [x] `.github/ISSUE_TEMPLATE/bug_report.md`, `feature_request.md`, `.github/PULL_REQUEST_TEMPLATE.md`.
- [x] `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
- [x] `ROADMAP.md` público, distinto dos checklists internos em `_reversa_sdd/` — resume o que já
  existe, o que está em andamento e o que é fora de escopo, com o porquê de cada exclusão.

---

## Bugs reais encontrados nesta rodada (além do já citado no Pilar 4)

Rodar exemplos de ponta a ponta valeu a pena por si só — encontrou problemas que nenhuma bateria de
testes unitários isolados pegaria:

1. **`transplant-core.js` não incluía `schema-generator.ts`** na lista de cópia logo depois de eu
   criar o arquivo — os exemplos ficaram rodando a versão pré-correção do bug do Pilar 4 até eu
   perceber e corrigir a lista.
2. **Re-rodar `transplant.js` sobre um projeto já customizado sobrescreve `bd-ticket.config.json`**
   de volta para o config de demonstração do motor, silenciosamente. Isso não foi "corrigido"
   (mudar esse comportamento é uma decisão de produto — preservar customizações do usuário exige
   lógica de merge, não só cópia), mas está documentado aqui e nos READMEs dos exemplos como uma
   armadilha real: depois de rodar `transplant`/`init` uma vez, não rode de novo sem re-aplicar suas
   customizações de config.
3. **`extractor.ts` teria criado silenciosamente um `local.db` vazio** se apontado para um arquivo
   inexistente (comportamento default do `better-sqlite3`) — trocado por um erro claro com
   `[FIX SUGERIDO]` apontando o caminho exato esperado.

## O que permanece fora do escopo (e por quê)

- **Publicação real em npm.** Preparado (`npm pack --dry-run` validado, `bin`, `exports`,
  `prepublishOnly`), não executado — exige a conta do mantenedor.
- **Badges de cobertura externa (Coveralls/Codacy) e de versão npm.** Exigem conta/token de
  terceiros ou publicação real.
- **Teste de interação em navegador real do `react-frontend`.** Validado até o nível de build
  estrito + transformação Vite sem erro; interação de usuário num browser real não foi exercitada.
- **Teste E2E completo do wizard `bd-ticket-init` via prompts raw-mode simulados.** Validado
  estruturalmente e parcialmente de forma interativa; os passos finais do fluxo (multiselect em
  diante) não foram cravados byte a byte.

Nenhum desses itens compromete a entrega central dos 7 pilares: cores/hyperlinks reais no CLI,
wizard interativo funcional, pacote dual CJS/ESM validado via `require`/`import` reais, pipeline de
CI completo, cobertura real medida (42%→91%), sete novos componentes headless, três exemplos
executáveis validados de ponta a ponta (um deles revelando e levando à correção de um bug real do
motor), tutorial Zero-to-Hero, documentação de padrões avançados, e toda a infraestrutura de
segurança/comunidade que só depende do próprio repositório.
