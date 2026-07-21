# Legacy Impact: Fail-Fast Validator

> Feature greenfield, sem legado pré-existente.
> Âncora: `prd.md` + specs SDD.
> Data: `2026-07-21`

---

## 1. Arquivos Criados

| Arquivo afetado | Componente nas Specs | Tipo de Impacto | Severidade | Justificativa |
|-----------------|----------------------|-----------------|------------|---------------|
| `src/bin/validator.ts` | `fail-fast-validator` | componente-novo | LOW | Ponto de entrada CLI principal do auditor de CI. |
| `src/lib/validator/scanner.ts` | `fail-fast-validator` | componente-novo | LOW | Driver de varredura recursiva de diretórios ignorando testes. |
| `src/lib/validator/parser.ts` | `fail-fast-validator` | componente-novo | LOW | Analisador estático Regex que intercepta referências órfãs. |
| `src/lib/validator/drift.ts` | `fail-fast-validator` | componente-novo | LOW | Validador de drifts SHA-256 contra manifesto físico. |
| `tests/validator.test.ts` | `fail-fast-validator` | componente-novo | LOW | Suíte de testes unitários do auditor estático. |

---

## 2. Preservadas

N/A. Projeto greenfield, nenhum código legado foi preservado nesta feature.

---

## 3. Modificadas

N/A. Projeto greenfield, nenhum código legado foi modificado nesta feature.
