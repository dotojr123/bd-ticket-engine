# Legacy Impact: Metadata Extractor

> Feature greenfield, sem legado pré-existente.
> Âncora: `prd.md` + specs SDD.
> Data: `2026-07-21`

---

## 1. Arquivos Criados

| Arquivo afetado | Componente nas Specs | Tipo de Impacto | Severidade | Justificativa |
|-----------------|----------------------|-----------------|------------|---------------|
| `src/bin/extractor.ts` | `metadata-extractor` | componente-novo | LOW | Ponto de entrada CLI principal do extrator. |
| `src/lib/db/postgres.ts` | `metadata-extractor` | componente-novo | LOW | Driver de extração de schema e comentários do PostgreSQL. |
| `src/lib/db/d1.ts` | `metadata-extractor` | componente-novo | LOW | Driver de extração de schema do SQLite/D1 com merge. |
| `src/lib/utils/sort.ts` | `metadata-extractor` | componente-novo | LOW | Utilitário para ordenação alfabética profunda recursiva. |
| `tests/extractor.test.ts` | `metadata-extractor` | componente-novo | LOW | Suíte de testes unitários do extrator de metadados. |

---

## 2. Preservadas

N/A. Projeto greenfield, nenhum código legado foi preservado nesta feature.

---

## 3. Modificadas

N/A. Projeto greenfield, nenhum código legado foi modificado nesta feature.
