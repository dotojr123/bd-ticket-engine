# Requirements: Metadata Extractor (Extrator de Metadados)

> Identificador: `001-metadata-extractor`
> Data: `2026-07-21`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O **Metadata Extractor** é uma ferramenta CLI (linha de comando) desenvolvida em TypeScript para automatizar a leitura do catálogo físico de bancos de dados PostgreSQL (Supabase) e SQLite (Cloudflare D1), decodificar metadados de negócios anotados diretamente nas tabelas (etiquetas) e consolidar todas as informações no formato universal `metadata.json` para apoiar a geração automática de contratos e telas.

## 2. Contexto a partir do legado

Este é um projeto greenfield estruturado a partir de especificações de design geradas no pipeline de novo projeto do Reversa:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/prd.md#4-escopo-in` | O extrator de metadados deve ler o banco e extrair etiquetas em um metadata.json | 🟡 |
| `_reversa_sdd/sdd/metadata-extractor.md#61-requisitos-principais` | O sistema deve ler tabelas, chaves e metadados estruturados em JSON de Postgres e D1 | 🟡 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Dev Solo / Arquiteto de IA | 🟡 Propagar mudanças de banco automaticamente | Alterar colunas e comentários locais, rodar a CLI e atualizar o metadata.json em 3 segundos. |
| Agente de IA / Assistente IDE | 🟡 Obter estrutura deterministicamente | Ler o metadata.json para criar novas rotas e componentes sem alucinar schemas. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01 (Single Source of Truth):** 🟡 A modelagem física e as etiquetas de comentários no banco são a única fonte de verdade para metadados de validação, permissões e componentes UI.
2. **RN-02 (Metadados Fallback):** 🟡 Caso o banco de dados físico não dê suporte a comentários estruturados complexos (como SQLite/D1 em ambientes locais), o extrator deve mesclar o esquema do banco com o arquivo local `bd-ticket.config.json` para compor as etiquetas.
3. **RN-03 (Fail-Fast de Sintaxe):** 🟡 Se qualquer comentário de metadado (etiqueta) contiver JSON malformado ou inválido, o extrator deve quebrar a execução imediatamente reportando o ponto com erro, a menos que executado sem validação estrita.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | O sistema deve ler schemas físicos (tabelas, colunas, chaves estrangeiras) de instâncias Postgres/Supabase. | Must | Mapear tabela de teste e obter o schema estruturado de forma idêntica. | 🟡 |
| RF-02 | O sistema deve ler schemas físicos de instâncias Cloudflare D1 localmente. | Must | Mapear tabela SQLite e gerar a assinatura de campos correta. | 🟡 |
| RF-03 | O sistema deve ler comentários de tabelas/colunas estruturados em JSON e convertê-los em tags no `metadata.json`. | Must | Ler comentário `{"permissions": {"read": ["admin"]}}` e popular a coluna. | 🟡 |
| RF-04 | O sistema deve emitir avisos (warnings) no console para tags de tipos incoerentes (ex: coluna inteira marcada com UI Textarea). | Should | Exibir mensagem no log do console alertando a discrepância lógica sem parar o fluxo. | 🟡 |
| RF-05 | O sistema deve ordenar alfabeticamente todas as tabelas, colunas, chaves e tags no `metadata.json` final para garantir diffs limpos no git e idempotência. | Must | Verificar ordenação no JSON gerado. | 🟢 |
| RF-06 | O sistema deve resolver credenciais do Cloudflare D1 seguindo o fallback: wrangler.toml local -> variáveis de ambiente -> argumentos/flags CLI. | Must | Testar conexões simulando ausência de cada nível do fallback. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | Execução completa em < 5 segundos. | `prd.md#3-métricas-de-sucesso` | 🟡 |
| Segurança | O extrator não deve expor credenciais de banco (DATABASE_URL) no JSON gerado. | `sdd/metadata-extractor.md#7-requisitos-não-funcionais` | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Extração de Metadados bem-sucedida do Postgres
  Dado que o banco Postgres está online com a tabela "pedidos"
  E a coluna "status" possui o comentário '{"metadata": {"label": "Status do Pedido", "ui_control": {"component": "Select"}}}'
  Quando eu executo "npx bd-ticket-extractor"
  Então o arquivo "_reversa_sdd/metadata.json" deve ser gerado
  E conter o schema de "pedidos.status" mapeado com a respectiva etiqueta de UI Select.

Cenário: Comentário de Metadado com JSON inválido
  Dado que a coluna "valor" possui o comentário '{"invalid_json'
  Quando eu executo "npx bd-ticket-extractor --strict"
  Então a CLI deve interromper a execução com Exit Code 1
  E exibir no console a mensagem indicando JSON inválido na tabela/coluna correspondente.
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 (Postgres) | Must | Banco de dados corporativo principal e de produção do projeto. |
| RF-02 (D1 local) | Must | Ambiente local/edge de testes rápidos com Cloudflare D1. |
| RF-03 (Extração comentários) | Must | Core da arquitetura para ler metadados sem duplicar código. |
| RF-04 (Warnings de incoerência) | Should | Auxilia na validação estática de tipos inconsistentes. |

## 9. Esclarecimentos

### Sessão 2026-07-21
- **Q:** O extrator deve classificar e ordenar deterministicamente as tabelas e chaves no arquivo `metadata.json` final?
- **R:** SIM. O extrator DEVE obrigatoriamente ordenar alfabeticamente todas as tabelas, colunas, chaves e tags no `metadata.json` final. Isso garante diffs limpos no Git, idempotência de execução e evita conflitos desnecessários de merge.
- **Q:** Como deve ser resolvida a credencial do Cloudflare D1: leitura de arquivo `wrangler.toml` local ou variável de ambiente específica?
- **R:** Estratégia de Fallback em 3 níveis:
  - Nível 1 (Padrão/Local): Ler automaticamente o arquivo `wrangler.toml` na raiz do projeto (extraindo o d1_databases binding).
  - Nível 2 (Variáveis de Ambiente): Se o `wrangler.toml` não existir, buscar as variáveis `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID` e `CLOUDFLARE_API_TOKEN`.
  - Nível 3 (Argumentos CLI): Permitir passar flags explícitas via terminal (ex: `--d1-binding DB` ou `--config wrangler.toml`).

## 10. Lacunas

Nenhuma identificada. Todos os marcadores `[DÚVIDA]` foram esclarecidos e resolvidos.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-07-21 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-07-21 | Dúvidas esclarecidas e integradas via `/reversa-clarify` | reversa |
