# Actions: Codegen Engine (Gerador de Contratos)

> Identificador: `002-codegen-engine`
> Data: `2026-07-21`
> Roadmap: `_reversa_forward/002-codegen-engine/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 10 |
| Paralelizáveis (`[//]`) | 2 |
| Maior cadeia de dependência | 5 |

## Fase 1, Preparação

<!-- Setup, scaffolding, migrações iniciais, configuração de infraestrutura local. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Instalar dependências necessárias para roteamento, middlewares de validação e types (`hono`, `@hono/zod-validator`, `zod`). | - | `[//]` | `package.json` | 🟢 | `[X]` |
| T002 | Criar estrutura de pastas de contratos compartilhados (`src/contracts/schemas`, `src/contracts/types`, `src/contracts/router`). | - | `[//]` | Diretórios | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes que precisam existir antes ou logo após o núcleo. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Criar script de testes locais para simular e verificar a geração de schemas Zod, tipos TS e integridade do manifesto SHA-256. | T002 | - | `tests/codegen.test.ts` | 🟢 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Implementar utilitário mapeador que traduz tipos físicos e opções do `metadata.json` para string estruturada do Zod schema. | T002 | - | `src/lib/codegen/zod-mapper.ts` | 🟢 | `[X]` |
| T005 | Implementar gerador de tipos TS inferidos a partir dos schemas de validação Zod mapeados. | T004 | - | `src/lib/codegen/types-generator.ts` | 🟢 | `[X]` |
| T006 | Implementar gerador de rotas Hono com validadores `zValidator` e controle de permissões por role (RBAC) em formato de string. | T004 | - | `src/lib/codegen/router-generator.ts` | 🟢 | `[X]` |
| T007 | Criar utilitário de hash SHA-256 e gravação/verificação do arquivo `manifest.json`. | T002 | - | `src/lib/codegen/manifest.ts` | 🟢 | `[X]` |
| T008 | Criar o entry point da CLI `codegen.ts` que lê o `metadata.json`, dispara os geradores, verifica o manifest anti-drift e escreve arquivos de forma atômica. | T005, T006, T007 | - | `src/bin/codegen.ts` | 🟢 | `[X]` |

## Fase 4, Integração

<!-- Cola com outras partes do sistema, contratos externos, ganchos. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Registrar script CLI `db:codegen` no `package.json` apontando para a execução do gerador TS. | T008 | - | `package.json` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Logs, telemetria, mensagens de erro, documentação curta. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T010 | Adicionar logs informativos coloridos de progresso, relatórios do manifesto de integridade e tratamento de erros de escrita. | T009 | - | `src/bin/codegen.ts` | 🟢 | `[X]` |

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
