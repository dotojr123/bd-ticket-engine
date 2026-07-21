# Regression Watch: Metadata Extractor

> Identificador: `001-metadata-extractor`
> Data: `2026-07-21`

---

## 1. Watch Principal

N/A. Sem regras de legado 🟢 extraídas para vigiar nesta feature (projeto greenfield).

---

## 2. Observações (Regras / RFs Implementados a Confirmar)

Estes requisitos funcionais foram implementados e devem ser confirmados como 🟢 em uma execução futura de `/reversa`:

| ID | Origem (spec, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|----------------------|-----------------------------|--------------------|-------------------|
| W001 | `sdd/metadata-extractor.md#61` | O extrator CLI consegue ler a tabela, chaves e comentários JSON de instâncias Postgres/Supabase. | Presença | CLI falhar ao conectar ou retornar propriedades vazias do Postgres. |
| W002 | `sdd/metadata-extractor.md#61` | O extrator CLI consegue ler chaves e tabelas físicas de instâncias SQLite/D1 locais. | Presença | CLI falhar ao ler o arquivo SQLite `local.db` fornecido. |
| W003 | `sdd/metadata-extractor.md#61` | O extrator CLI mescla o schema físico do SQLite com o arquivo local de configuração `bd-ticket.config.json` de forma correta. | Presença | Campos de metadados de negócios ausentes para tabelas do SQLite. |
| W004 | `sdd/metadata-extractor.md#61` | O arquivo gerado `metadata.json` é ordenado alfabeticamente chave por chave recursivamente. | Presença | Chaves fora de ordem alfabética profunda. |
| W005 | `sdd/metadata-extractor.md#61` | A CLI aborta com Exit Code 1 se a flag `--strict` estiver ativa e houver comentário JSON inválido. | Presença | CLI terminar com Exit Code 0 mesmo se houver erro crítico de parsing de JSON de metadados. |

---

## 3. Histórico de re-extrações

*(Vazio)*

---

## 4. Arquivadas

*(Vazio)*
