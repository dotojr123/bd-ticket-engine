# Actions: Fail-Fast Validator (Auditor)

> Identificador: `004-fail-fast-validator`
> Data: `2026-07-21`
> Roadmap: `_reversa_forward/004-fail-fast-validator/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 10 |
| Paralelizáveis (`[//]`) | 2 |
| Maior cadeia de dependência | 6 |

## Fase 1, Preparação

<!-- Setup, scaffolding, migrações iniciais, configuração de infraestrutura local. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Garantir instalação de dependências globais e utilitários da CLI (`commander`, `dotenv`). | - | `[//]` | `package.json` | 🟢 | `[X]` |
| T002 | Criar estrutura e arquivos da CLI do auditor. | - | `[//]` | Diretórios | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes que precisam existir antes ou logo após o núcleo. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Criar suíte de testes unitários para verificar a detecção estática de schemas órfãos e comportamento de flags no terminal. | T002 | - | `tests/validator.test.ts` | 🟢 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Implementar varredor de diretórios recursivo com filtros para ler arquivos fonte `.ts`, `.tsx`, `.js`, `.jsx` sob `src/`. | T002 | - | `src/lib/validator/scanner.ts` | 🟢 | `[X]` |
| T005 | Implementar analisador sintático (regex parser) de referências de schemas Zod/Hono para identificar apontamentos inválidos. | T004 | - | `src/lib/validator/parser.ts` | 🟢 | `[X]` |
| T006 | Implementar integrador de hashes SHA-256 acoplando validações de drift de arquivos listados no `manifest.json`. | T002 | - | `src/lib/validator/drift.ts` | 🟢 | `[X]` |
| T007 | Criar a CLI de validação `validator.ts` que carrega configurações e orquestra as checagens estáticas e de drifts. | T005, T006 | - | `src/bin/validator.ts` | 🟢 | `[X]` |
| T008 | Adicionar fluxos de controle de Exit Codes em caso de falha de validação e bypass com a flag `--warn-only`. | T007 | - | `src/bin/validator.ts` | 🟢 | `[X]` |

## Fase 4, Integração

<!-- Cola com outras partes do sistema, contratos externos, ganchos. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Registrar script CLI `db:validate` no `package.json` apontando para a execução do validador. | T008 | - | `package.json` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Logs, telemetria, mensagens de erro, documentação curta. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T010 | Adicionar logs informativos estruturados de conformidade com cores (chalk) facilitando identificação de erros de pre-commit. | T009 | - | `src/bin/validator.ts` | 🟢 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-07-21 | Versão inicial gerada por `/reversa-to-do` | reversa |
| 2026-07-21 | Todas as tarefas T001-T010 concluídas após validação | reversa |
