# Adendo: Metadata Extractor (Extrator de Metadados)

> Identificador da feature: `001-metadata-extractor`
> Data: `2026-07-21`
> Cenário: `greenfield`

## 1. Vigência

Vigente desde 2026-07-21.

## 2. Resumo da entrega

O componente foi totalmente implementado como uma CLI TypeScript para extrair esquemas físicos de bancos PostgreSQL e SQLite (D1), decodificar comentários JSON das colunas (etiquetas) e exportar um arquivo unificado `metadata.json` ordenado alfabeticamente chave por chave de forma recursiva.
- **Progresso:** 10 de 10 ações concluídas com sucesso.

## 3. Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|----------|-------|-----------------|-------|
| `_reversa_sdd/prd.md` | `#4-escopo-in` | componente-novo | O utilitário CLI de extração foi codificado e integrado na pipeline local do Node. |
| `_reversa_sdd/sdd/metadata-extractor.md` | `#61-requisitos-principais` | componente-novo | Mapeamento completo de drivers físicos de Postgres e D1 com fallback de configuração JSON. |

## 4. Regras sob vigilância

Estes watch items foram registrados e devem ser observados contra regressões em re-extrações futuras:

- `W001`, `W002`, `W003`, `W004`, `W005` apontando para `_reversa_forward/001-metadata-extractor/regression-watch.md`.

## 5. Fontes

- `_reversa_forward/001-metadata-extractor/requirements.md`
- `_reversa_forward/001-metadata-extractor/legacy-impact.md`
- `_reversa_forward/001-metadata-extractor/regression-watch.md`
- `_reversa_forward/001-metadata-extractor/progress.jsonl`
