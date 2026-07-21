# Roadmap: Codegen Engine (Gerador de Contratos)

> Identificador: `002-codegen-engine`
> Data: `2026-07-21`
> Requirements: `_reversa_forward/002-codegen-engine/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

O **Codegen Engine** será implementado como um utilitário CLI em TypeScript (`src/bin/codegen.ts`). A ferramenta carregará e fará o parse de `_reversa_sdd/metadata.json`. Para cada tabela do schema, ela escreverá arquivos de código dinâmicos nos subdiretórios da pasta compartilhada `src/contracts/`:
1. `schemas/` — Schemas Zod (`Insert`, `Update`, `Select`) gerados com base em tipo físico, nulidade e validações.
2. `types/` — Tipos TypeScript inferidos diretamente dos schemas.
3. `router/` — Definições de rotas do Hono vinculando validadores `zValidator` e injetando middlewares de validação de papéis (RBAC).

Adicionalmente, gerará um `manifest.json` com hashes SHA-256 de todos os arquivos gerados para prevenção de drift de código manual.

## 2. Princípios aplicados

O componente segue os pilares de design do BD-Ticket:
- **Schema-First:** Contratos e segurança derivados estritamente do `metadata.json`.
- **Fail-Fast:** Verificação de manifestos SHA-256 em tempo de build para apontar modificações manuais proibidas.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Diretório compartilhado `src/contracts/` | Facilita a importação imediata de tipos e esquemas tanto no Hono (BE) quanto no React (FE). | Gerar arquivos duplicados em pastas de build separadas para BE e FE. | 🟢 |
| D-02 | Rotas Hono lineares (Flat) | Simplifica a lógica de codegen eliminando relações aninhadas complexas. | Mapear endpoints aninhados (Nested). | 🟢 |
| D-03 | Manifesto de integridade SHA-256 | Impede atalhos hardcoded ou edições manuais por devs ou agentes de IA. | Monitoramento de data de alteração de arquivo. | 🟢 |

## 4. Premissas

Nenhuma. As dúvidas sobre layout de contratos e aninhamento de rotas foram resolvidas.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `codegen-engine` | `_reversa_sdd/sdd/codegen-engine.md` | componente-novo | Cria a CLI geradora de contratos Zod, tipos TS e rotas Hono. |

## 6. Delta no modelo de dados

O componente lê o `metadata.json` gerado e não modifica banco de dados físico. 

- Detalhe completo em: `_reversa_forward/002-codegen-engine/data-delta.md`

## 7. Delta de contratos externos

N/A. Componente CLI interno.

## 8. Plano de migração

N/A.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Conflitos na formatação de aspas e recuos no código TS gerado | baixo | média | Usar template literals limpos estruturados e rodar formatador Prettier opcional nas saídas. |
| Incompatibilidade de tipos complexos no Zod (ex: timestamps customizados) | médio | baixa | Mapear tipos temporais para `z.string().datetime()` ou `z.coerce.date()`. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] Schemas, types e rotas Hono auto-gerados para a tabela `test_pedidos`
- [ ] Testes unitários validando integridade de arquivo e geração correta passando

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-07-21 | Versão inicial gerada por `/reversa-plan` | reversa |
