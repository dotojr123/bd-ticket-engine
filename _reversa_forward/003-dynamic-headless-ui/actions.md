# Actions: Dynamic Headless UI (Renderizador Dinâmico)

> Identificador: `003-dynamic-headless-ui`
> Data: `2026-07-21`
> Roadmap: `_reversa_forward/003-dynamic-headless-ui/roadmap.md`

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
| T001 | Instalar dependências necessárias para montagem de formulários, validações e estilização (`react-hook-form`, `@hookform/resolvers`, `clsx`, `tailwind-merge`). | - | `[//]` | `package.json` | 🟢 | `[X]` |
| T002 | Criar estrutura de pastas visuais de componentes (`src/components/`, `src/lib/ui/`). | - | `[//]` | Diretórios | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes que precisam existir antes ou logo após o núcleo. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Criar suíte de testes unitários para validar utilitários visuais de estilo, regras lógicas de visibilidade (RBAC) e slots do formulário. | T002 | - | `tests/ui.test.ts` | 🟢 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Implementar utilitário `cn` para combinação e resolução inteligente de classes CSS com `clsx` e `tailwind-merge`. | T002 | - | `src/lib/ui/utils.ts` | 🟢 | `[X]` |
| T005 | Criar o Context Provider global `<BDTicketProvider>` e o hook de acesso `useBDTicket` para propagação da role ativa. | T002 | - | `src/lib/ui/provider.tsx` | 🟢 | `[X]` |
| T006 | Implementar resolvedor estrutural que mapeia tags `ui_control.component` para tags físicas de inputs no `DynamicForm.tsx`. | T005 | - | `src/components/DynamicForm.tsx` | 🟢 | `[X]` |
| T007 | Integrar o formulário com o React Hook Form associando schemas Zod e resolvers na montagem de formulários dinâmicos. | T006 | - | `src/components/DynamicForm.tsx` | 🟢 | `[X]` |
| T008 | Adicionar filtros de visibilidade (`permissions.read`) e habilitação (`permissions.write`) baseados nas permissões de papéis lidas do metadado. | T007 | - | `src/components/DynamicForm.tsx` | 🟢 | `[X]` |

## Fase 4, Integração

<!-- Cola com outras partes do sistema, contratos externos, ganchos. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Prover suporte a slots customizados (Render Props) para permitir injeção de componentes visuais externos customizados por campo. | T008 | - | `src/components/DynamicForm.tsx` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Logs, telemetria, mensagens de erro, documentação curta. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T010 | Integrar a exibição de mensagens de erro reativas e tratamentos visuais abaixo de cada campo do formulário. | T009 | - | `src/components/DynamicForm.tsx` | 🟢 | `[X]` |

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
