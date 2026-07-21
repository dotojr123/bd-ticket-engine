# Requirements: Codegen Engine (Gerador de Contratos)

> Identificador: `002-codegen-engine`
> Data: `2026-07-21`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O **Codegen Engine** é uma ferramenta de automação em linha de comando desenvolvida em TypeScript para traduzir o arquivo intermediário `metadata.json` em schemas Zod de validação de dados, tipos TypeScript ponta a ponta e definições estruturais de rotas com middlewares de segurança de controle de acesso por papel (RBAC) para o framework Hono no backend.

## 2. Contexto a partir do legado

Este é um projeto greenfield estruturado a partir de especificações de design geradas no pipeline de novo projeto do Reversa:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/prd.md#4-escopo-in` | O gerador de contratos deve converter o metadata em validações Zod e types TS | 🟡 |
| `_reversa_sdd/sdd/codegen-engine.md#61-requisitos-principais` | O sistema deve gerar schemas Zod, tipos TS e rotas com RBAC no Hono | 🟡 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Dev Solo / Arquiteto de IA | 🟡 Sincronizar contratos automaticamente | Rodar a CLI e gerar automaticamente os arquivos de validação e rotas do backend. |
| Agente de IA / Assistente IDE | 🟡 Escrever handlers sem alucinar | Importar os contratos do Zod e tipos do Hono gerados para implementar regras sem erros de schema. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01 (Mapeamento Automatizado):** 🟡 A geração de esquemas Zod deve refletir com exatidão as regras contidas nas tags do `metadata.json` (required, options, min, max).
2. **RN-02 (RBAC Nativo Hono):** 🟡 Cada rota gerada deve receber um middleware de segurança correspondente que intercepta a requisição, analisa a role do usuário (fornecida no cabeçalho ou contexto) e valida contra as permissões lidas de `permissions` no `metadata.json`.
3. **RN-03 (Impedimento de Drift):** 🟡 O gerador criará um manifesto de integridade contendo o hash SHA-256 de cada arquivo gerado. Qualquer modificação manual acidental nesses arquivos será apontada como aviso ou erro em execuções subsequentes.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | O sistema deve ler o `metadata.json` e gerar esquemas Zod (`z.object`) contendo regras de validação por coluna. | Must | Rodar o gerador e testar um payload de teste contra o schema Zod gerado. | 🟡 |
| RF-02 | O sistema deve exportar tipos TypeScript correspondentes a cada tabela utilizando inferência de tipos do Zod. | Must | Compilar os tipos gerados sem erros no compilador do TypeScript. | 🟡 |
| RF-03 | O sistema deve gerar definições de rotas (`new Hono()`) baseadas nas tabelas extraídas do `metadata.json`. | Must | Inicializar o app Hono e registrar as rotas sem erros de instanciação. | 🟡 |
| RF-04 | O sistema deve acoplar middlewares de verificação de permissão (RBAC) às rotas geradas conforme as roles e ações do metadado. | Must | Fazer requisição simulando role inválida e verificar resposta 403 Forbidden. | 🟡 |
| RF-05 | O sistema deve gerar rotas lineares planas (/api/pedidos, /api/itens_pedido) por padrão, filtrando FKs via Query Parameters. | Must | Verificar a assinatura das rotas do Hono geradas. | 🟢 |
| RF-06 | O sistema deve exportar os schemas e tipos TypeScript em um diretório de contratos centralizado e compartilhado (ex: `src/contracts/`) para consumo conjunto de backend (Hono) e frontend (React). | Must | Importar o mesmo arquivo de contrato Zod no backend e frontend. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | Tempo de geração total < 2 segundos. | `sdd/codegen-engine.md#7-requisitos-não-funcionais` | 🟡 |
| Qualidade | O código gerado deve ser compatível com as regras padrão do ESLint. | `sdd/codegen-engine.md#7-requisitos-não-funcionais` | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Geração de validações Zod corretas
  Dado que o "metadata.json" possui a tabela "pedidos" com a coluna "status" do tipo "varchar"
  E as opções válidas são ["pendente", "concluido"]
  Quando eu executo "npx bd-ticket-codegen"
  Então o arquivo "src/shared/contracts/pedidos.ts" deve ser gerado
  E conter o validador `z.enum(["pendente", "concluido"])`.

Cenário: Bloqueio de acesso por middleware RBAC no Hono
  Dado que a tabela "pedidos" restringe escrita apenas para a role "admin"
  Quando uma requisição POST é feita para "/api/pedidos" com token de usuário comum ("user")
  Então o middleware Hono correspondente deve interceptar o fluxo
  E responder com HTTP 403 Forbidden antes de chamar o handler principal.
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 (Zod schemas) | Must | Essencial para garantir a validação estrita dos payloads na entrada da API. |
| RF-02 (TS Types) | Must | Base do type-safety ponta a ponta do projeto. |
| RF-03 (Rotas Hono) | Must | Componente estrutural do servidor de API. |
| RF-04 (RBAC Middleware) | Must | Garante segurança nativa baseada em metadados sem código repetitivo. |

## 9. Esclarecimentos

### Sessão 2026-07-21
- **Q:** O roteador Hono gerado deve expor rotas lineares planas para cada tabela (ex: `/api/pedidos`, `/api/itens_pedido`) ou rotas aninhadas em relações FK (ex: `/api/pedidos/:id/itens`)?
- **R:** Adotar **Rotas Lineares Planas** por padrão (`/api/pedidos`, `/api/itens_pedido`). Relacionamentos e filtros por Chave Estrangeira devem ser lidos via Query Parameters (ex: `/api/itens_pedido?pedido_id=123`). Isso torna a API previsível para codegen, testes e orquestração por IAs.
- **Q:** Como e onde os schemas Zod de validação devem ser exportados para serem compartilhados de forma limpa entre o projeto Backend (Hono) e o Frontend (React/Vite)?
- **R:** Os artefatos gerados devem ser exportados em um diretório de contratos centralizado e compartilhado (ex: `src/contracts/` ou `@/contracts`):
  - `schemas/` (Schemas Zod de validação para Insert, Update e Select)
  - `types/` (Tipos TypeScript inferidos diretamente via `z.infer<typeof schema>`)
  - `router/` (Definições de rotas do Hono com zValidator para validação de payload/query)

## 10. Lacunas

Nenhuma identificada. Todos os marcadores `[DÚVIDA]` foram esclarecidos e resolvidos.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-07-21 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-07-21 | Esclarecimentos de rotas e diretórios de contratos integrados via `/reversa-clarify` | reversa |
