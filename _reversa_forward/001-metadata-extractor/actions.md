# Actions: Metadata Extractor (Extrator de Metadados)

> Identificador: `001-metadata-extractor`
> Data: `2026-07-21`
> Roadmap: `_reversa_forward/001-metadata-extractor/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 10 |
| Paralelizáveis (`[//]`) | 3 |
| Maior cadeia de dependência | 6 |

## Fase 1, Preparação

<!-- Setup, scaffolding, migrações iniciais, configuração de infraestrutura local. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Instalar dependências necessárias para banco de dados e gerenciamento de CLI (`pg`, `better-sqlite3`, `commander`, `dotenv`). | - | `[//]` | `package.json` | 🟢 | `[X]` |
| T002 | Criar estrutura de pastas do extrator (`src/bin/` para CLI, `src/lib/db/` para conectores, `src/lib/utils/`). | - | `[//]` | Diretórios | 🟢 | `[X]` |
| T003 | Criar arquivo de variáveis de ambiente de teste `.env` e o arquivo fallback padrão `bd-ticket.config.json` de exemplo na raiz do projeto. | T002 | - | `.env` e `bd-ticket.config.json` | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes que precisam existir antes ou logo após o núcleo. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Criar script de testes locais para simular e verificar a conexão e leitura de schemas no Postgres e D1. | T003 | - | `tests/extractor.test.ts` | 🟢 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T005 | Implementar conector do PostgreSQL executando queries no catálogo `information_schema` e decodificando comentários JSON de colunas. | T003 | - | `src/lib/db/postgres.ts` | 🟢 | `[X]` |
| T006 | Implementar conector do SQLite/D1 obtendo dados com `PRAGMA table_info` e mesclando com metadados do `bd-ticket.config.json`. | T003 | - | `src/lib/db/d1.ts` | 🟢 | `[X]` |
| T007 | Criar utilitário de ordenação recursiva alfabética de chaves de objetos JSON. | T002 | `[//]` | `src/lib/utils/sort.ts` | 🟢 | `[X]` |
| T008 | Criar o entry point da CLI `extractor.ts` tratando argumentos, instanciando os drivers de banco e exportando o `metadata.json` ordenado recursivamente. | T005, T006, T007 | - | `src/bin/extractor.ts` | 🟢 | `[X]` |

## Fase 4, Integração

<!-- Cola com outras partes do sistema, contratos externos, ganchos. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Registrar script CLI `db:extract-metadata` no `package.json` mapeando a chamada do build TypeScript. | T008 | - | `package.json` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Logs, telemetria, mensagens de erro, documentação curta. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T010 | Adicionar spinners de loading (ora), mensagens amigáveis no console com cores (chalk) e tratamento de erros do parser de JSON. | T009 | - | `src/bin/extractor.ts` | 🟢 | `[X]` |

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
