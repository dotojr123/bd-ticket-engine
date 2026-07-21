# Spec: Metadata Extractor (Extrator de Metadados)

**Versão:** 1.0
**Status:** Rascunho
**Autor:** reversa-spec-sdd
**Data:** 2026-07-21
**Reviewers:** N/A

---

## 1. Resumo

O **Metadata Extractor** é uma ferramenta de linha de comando (CLI) projetada para ler o esquema de banco de dados físico (PostgreSQL/Supabase e Cloudflare D1) e extrair os metadados de negócios associados a cada tabela e coluna (as "etiquetas" como rótulos, validações e permissões) para um arquivo JSON intermediário unificado chamado `metadata.json`.

---

## 2. Contexto e Motivação

**Problema:**
Atualmente, as informações do banco de dados ficam limitadas à estrutura estática física de tipos (ex: `varchar`, `integer`), não expressando metadados de negócios essenciais para a montagem de interfaces dinâmicas de múltiplos painéis e regras de acesso avançadas. Sem um extrator unificado, os metadados precisam ser escritos manualmente no backend e no frontend, gerando redundância e inconsistências catastróficas.

**Evidências:**
Sistemas complexos com múltiplos painéis (Usuário, Parceiro, Admin) sofrem com desatualização de documentação (drift) sempre que o banco de dados é alterado, porque não há uma ponte que exporte as novas definições para as camadas de código.

**Por que agora:**
Para viabilizar o princípio *Schema-First* do BD-Ticket, a camada de banco de dados física com comentários estruturados ou tabelas de metadados deve ser a fonte absoluta que alimenta os scripts de automação.

---

## 3. Goals (Objetivos)

- [ ] G-01: 🟡 Mapear 100% da estrutura física e lógica das tabelas e colunas.
- [ ] G-02: 🟡 Ler comentários de esquema estruturados (com sintaxe JSON) nas tabelas físicas para capturar as etiquetas dos metadados.
- [ ] G-03: 🟡 Gerar um arquivo intermediário `metadata.json` completo e padronizado em menos de 5 segundos de execução.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| 🟡 Tempo de extração de schema | N/A | < 5 segundos | 3 meses |
| 🟡 Cobertura de extração física e de etiquetas | 0% | 100% | 3 meses |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: 🟡 O extrator não executa migrations físicas ou altera o estado estrutural das tabelas.
- NG-02: 🟡 O extrator não cria arquivos de validação Zod ou rotas Hono (isso é tarefa do `codegen-engine`).
- NG-03: 🟡 O extrator não valida credenciais de acesso ou gerencia senhas das conexões de banco de dados (deve receber credenciais prontas via variáveis de ambiente).

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Dev Solo / Arquiteto de IA que executa a ferramenta localmente após alterar o banco.
**Usuário secundário:** 🟡 Agentes de IA que leem o arquivo gerado para entender o schema.

**Jornada atual (sem a feature):**
1. 🟡 O desenvolvedor altera a estrutura física do banco.
2. 🟡 O desenvolvedor precisa acessar o banco e documentar cada tabela, coluna e regra de negócio manualmente no PRD e nos códigos.
3. 🟡 Modificações e novos campos exigem que todas as camadas sejam ajustadas na mão, com alto risco de drift.

**Jornada futura (com a feature):**
1. 🟡 O desenvolvedor altera o banco e insere os metadados (como comentários estruturados no banco ou em arquivo adjacente).
2. 🟡 O desenvolvedor roda a CLI do `metadata-extractor`.
3. 🟡 O arquivo `metadata.json` é atualizado em segundos e serve de entrada direta para o gerador de código.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema CLI deve se conectar ao banco de dados PostgreSQL/Supabase e extrair tabelas, colunas, chaves primárias e estrangeiras. | Must | Executar comando contra um banco Postgres local e obter o JSON com a estrutura idêntica. |
| RF-02 | 🟡 O sistema CLI deve se conectar ao Cloudflare D1 usando as credenciais/Wrangler local e extrair a estrutura equivalente. | Must | Executar comando contra um arquivo sqlite/D1 local e gerar a estrutura correspondente. |
| RF-03 | 🟡 O sistema deve decodificar comentários de colunas estruturados em formato JSON (etiquetas) e integrá-los como propriedades do metadado. | Must | Um comentário no banco contendo `{"permissions": {"read": ["admin"]}}` deve aparecer decodificado no JSON final sob a coluna correspondente. |
| RF-04 | 🟡 O sistema deve suportar um arquivo fallback de configuração (`bd-ticket.config.json`) para definir metadados de colunas cujos bancos não suportem comentários complexos. | Should | Se a coluna não tiver comentário estruturado no banco, o sistema mescla as definições encontradas no arquivo local. |
| RF-05 | 🟡 O sistema CLI deve validar sintaticamente os metadados JSON das etiquetas e lançar erros claros se houver sintaxe inválida. | Must | Se um comentário possuir JSON malformado, o processo quebra com a indicação da tabela, coluna e o erro de parsing. |

### 6.2 Fluxo Principal (Happy Path)

1. 🟡 O desenvolvedor configura a string de conexão na variável de ambiente `DATABASE_URL`.
2. 🟡 O desenvolvedor roda a CLI `npx bd-ticket-extractor`.
3. 🟡 O extrator conecta-se ao banco, varre o catálogo de tabelas (ex: `information_schema`).
4. 🟡 O extrator lê os tipos de dados físicos e os comentários de cada tabela e coluna.
5. 🟡 O extrator valida a sintaxe dos metadados e gera um arquivo unificado `_reversa_sdd/metadata.json` contendo toda a modelagem.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Mesclagem com Configuração Local:**
1. 🟡 O extrator conecta-se ao banco de dados SQLite local (D1).
2. 🟡 Como o SQLite não possui suporte robusto a comentários complexos de coluna, o extrator carrega as definições locais do arquivo de fallback `bd-ticket.config.json`.
3. 🟡 O extrator mescla o esquema físico extraído do D1 com as etiquetas do arquivo de fallback local e gera o `metadata.json` final.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | 🟡 Tempo de execução total < 3 segundos | Em banco de dados local com até 50 tabelas. |
| RNF-02 | Compatibilidade | 🟡 Suporte a Node.js >= 18 | Executável em qualquer ambiente JS moderno. |
| RNF-03 | Segurança | 🟡 Zero exposição de segredos | A CLI nunca deve logar ou salvar a string de conexão no `metadata.json` gerado. |

---

## 8. Design e Interface

**Componentes afetados:**
- CLI Extractor (`bin/extractor.js`)
- Módulos de conexão de banco (`lib/db/postgres.js`, `lib/db/d1.js`)

**Comportamento esperado:**
- A CLI opera puramente via interface de linha de comando.
- Ao rodar, exibe um spinner e logs detalhados:
  ```bash
  $ npx bd-ticket-extractor
  ℹ Conectando ao banco de dados...
  ✔ Banco conectado com sucesso.
  ℹ Extraindo estrutura de tabelas...
  ✔ 12 tabelas encontradas.
  ℹ Decodificando etiquetas e metadados...
  ✔ Metadados decodificados (100% de cobertura).
  ✔ Contrato salvo em _reversa_sdd/metadata.json
  ```

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

Este componente gera o arquivo estruturado `metadata.json`:

```json
{
  "project": "String",
  "version": "String",
  "tables": {
    "[tableName]": {
      "columns": {
        "[columnName]": {
          "type": "String",
          "isNullable": "Boolean",
          "isPrimaryKey": "Boolean",
          "isForeignKey": "Boolean",
          "references": "String | null",
          "metadata": {
            "label": "String",
            "validation": {
              "required": "Boolean",
              "options": "Array<String> | null",
              "min": "Number | null",
              "max": "Number | null"
            },
            "permissions": {
              "read": "Array<String>",
              "write": "Array<String>"
            },
            "ui_control": {
              "component": "String",
              "visible_in_views": "Array<String>"
            }
          }
        }
      }
    }
  }
}
```

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| `pg` (driver do PostgreSQL) | Obrigatória | O extrator falha se o alvo for PostgreSQL/Supabase. |
| `better-sqlite3` (SQLite local) | Opcional | O extrator falha se o alvo for Cloudflare D1 local. |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Conexão caídas | Banco de dados offline ou credencial errada | 🟡 A CLI exibe erro amigável "Conexão rejeitada" e encerra com exit code 1. |
| EC-02: JSON inválido no comentário | Comentário no banco não-nulo mas que não é um JSON válido | 🟡 Exibir aviso no terminal e usar metadados vazios/fallback, sem quebrar o fluxo geral a menos que a flag `--strict` esteja ativa. |
| EC-03: Drift de tipo físico | Tipo físico e etiqueta incompatíveis (ex: tipo `integer` marcado com ui_control `TextArea`) | 🟡 Emitir aviso de inconsistência lógica durante a análise. |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 Exige credenciais de leitura do banco de dados (ex: `DATABASE_URL` ou arquivo de credenciais local).
- **Dados sensíveis:** 🟡 O motor varre schemas e metadados, nunca os dados das linhas em si, garantindo que PII e segredos de clientes nunca saiam do banco.
- **Auditoria:** 🟡 N/A.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 Publicação como pacote npm interno ou escopado (`@bd-ticket/extractor`).
- **Como reverter:** 🟡 Rollback de versão do pacote.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | 🟡 Devemos suportar leitura de banco de dados ativo em produção ou focar 100% em local/dev? | Médio | Doto | TBD |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| 🟡 JSON nos comentários do banco | Criar uma tabela separada `sys_metadata` | O comentário da coluna fica acoplado ao schema no DDL, facilitando migrations e versionamento no Git. |

---

## Avaliação de Qualidade (Spec Scorer)

```
============================================================
  SPEC QUALITY REPORT
  SCORE TOTAL: 84.0/100 — ✅ Boa
============================================================
  Breakdown:
    Completude:    70/100 (peso 30%)
    Testabilidade: 100/100 (peso 25%)
    Clareza:       75/100 (peso 20%)
    Escopo:        100/100 (peso 15%)
    Edge Cases:    80/100 (peso 10%)
============================================================
```
