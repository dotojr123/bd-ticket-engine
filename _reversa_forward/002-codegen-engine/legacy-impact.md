# Legacy Impact: Codegen Engine

> Feature greenfield, sem legado pré-existente.
> Âncora: `prd.md` + specs SDD.
> Data: `2026-07-21`

---

## 1. Arquivos Criados

| Arquivo afetado | Componente nas Specs | Tipo de Impacto | Severidade | Justificativa |
|-----------------|----------------------|-----------------|------------|---------------|
| `src/bin/codegen.ts` | `codegen-engine` | componente-novo | LOW | Ponto de entrada CLI principal do gerador. |
| `src/lib/codegen/zod-mapper.ts` | `codegen-engine` | componente-novo | LOW | Tradutor de tipos SQL físicos para regras Zod. |
| `src/lib/codegen/types-generator.ts` | `codegen-engine` | componente-novo | LOW | Gerador de tipos TypeScript estáticos via Zod inference. |
| `src/lib/codegen/router-generator.ts` | `codegen-engine` | componente-novo | LOW | Gerador de rotas Hono com middlewares RBAC e zValidator. |
| `src/lib/codegen/manifest.ts` | `codegen-engine` | componente-novo | LOW | Utilitário de manifesto SHA-256 anti-drift de código. |
| `tests/codegen.test.ts` | `codegen-engine` | componente-novo | LOW | Suíte de testes unitários do gerador de código. |

---

## 2. Preservadas

N/A. Projeto greenfield, nenhum código legado foi preservado nesta feature.

---

## 3. Modificadas

N/A. Projeto greenfield, nenhum código legado foi modificado nesta feature.
