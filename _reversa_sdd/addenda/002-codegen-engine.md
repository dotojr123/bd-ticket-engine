# Adendo: Codegen Engine (Gerador de Contratos)

> Identificador da feature: `002-codegen-engine`
> Data: `2026-07-21`
> Cenário: `greenfield`

## 1. Vigência

Vigente desde 2026-07-21.

## 2. Resumo da entrega

O componente foi totalmente implementado como uma CLI TypeScript para carregar e converter o `metadata.json` em esquemas de validação Zod, tipos TypeScript estáticos e definições de rotas com middlewares RBAC para o Hono na pasta compartilhada `src/contracts/`. Inclui um manifesto de integridade SHA-256 para prevenção de drift de código manual.
- **Progresso:** 10 de 10 ações concluídas com sucesso.

## 3. Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|----------|-------|-----------------|-------|
| `_reversa_sdd/prd.md` | `#4-escopo-in` | componente-novo | O gerador de contratos compartilhado foi codificado e integrado na pipeline do Node. |
| `_reversa_sdd/sdd/codegen-engine.md` | `#61-requisitos-principais` | componente-novo | Mapeamento completo de geradores Zod, inferência de tipos TS, rotas do Hono com RBAC e manifesto SHA-256. |

## 4. Regras sob vigilância

Estes watch items foram registrados e devem ser observados contra regressões em re-extrações futuras:

- `W001`, `W002`, `W003`, `W004`, `W005` apontando para `_reversa_forward/002-codegen-engine/regression-watch.md`.

## 5. Fontes

- `_reversa_forward/002-codegen-engine/requirements.md`
- `_reversa_forward/002-codegen-engine/legacy-impact.md`
- `_reversa_forward/002-codegen-engine/regression-watch.md`
- `_reversa_forward/002-codegen-engine/progress.jsonl`
