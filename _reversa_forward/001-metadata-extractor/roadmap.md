# Roadmap: Metadata Extractor (Extrator de Metadados)

> Identificador: `001-metadata-extractor`
> Data: `2026-07-21`
> Requirements: `_reversa_forward/001-metadata-extractor/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

O **Metadata Extractor** será implementado como um utilitário de linha de comando (CLI) em TypeScript. A CLI conectará no banco físico ativo (PostgreSQL via driver `pg` ou SQLite/D1 local via driver `better-sqlite3`), executará consultas em catálogos de metadados do sistema para extrair chaves primárias, estrangeiras e tabelas. As etiquetas (permissões, validações e UI) serão extraídas de comentários estruturados em JSON no banco de dados. Em caso de restrições de comentários (como no D1), o motor lerá e mesclará as etiquetas de um arquivo local de configuração (`bd-ticket.config.json`). O arquivo de saída `metadata.json` gerado passará por um processo de ordenação determinística recursiva de chaves antes de ser persistido.

## 2. Princípios aplicados

Não há princípios globais declarados em `.reversa/principles.md` no momento. O componente atende integralmente os princípios da arquitetura do BD-Ticket:
- **Schema-First:** Banco como fonte única.
- **Fail-Fast:** Erro determinístico imediato se JSON das etiquetas for inválido.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | JSON nos comentários do banco | Mantém as regras acopladas diretamente ao DDL de criação da tabela. | Tabela dedicada `sys_metadata` no banco. | 🟢 |
| D-02 | Ordenação alfabética profunda | Garante diffs limpos no git e evita conflitos de merge. | Gravar o JSON na ordem física gerada pelo banco. | 🟢 |
| D-03 | Fallback em 3 níveis para D1 | Proporciona facilidade no dev local (wrangler.toml) e flexibilidade em CI (envs). | Exigir flags CLI manuais obrigatórias. | 🟢 |

## 4. Premissas

Nenhuma. Todas as dúvidas do `requirements.md` foram totalmente esclarecidas e integradas na sessão anterior.

## 5. Delta arquitetural

Este é o primeiro componente do sistema greenfield, criando a fundação.

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `metadata-extractor` | `_reversa_sdd/sdd/metadata-extractor.md` | componente-novo | Cria a CLI do extrator de metadados do banco físico. |

## 6. Delta no modelo de dados

O componente não altera o banco físico de dados (apenas lê). Ele gera o arquivo estruturado intermediate `_reversa_sdd/metadata.json`.

- Detalhe completo em: `_reversa_forward/001-metadata-extractor/data-delta.md`

## 7. Delta de contratos externos

Não expõe contratos externos HTTP/API diretamente nesta fase (CLI interna).

## 8. Plano de migração

N/A. Componente de leitura e geração de arquivo estático local.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Banco de dados muito lento ou indisponível localmente | médio | média | Implementar timeout de conexão de 5 segundos no extrator com retry automático (3 tentativas). |
| Comentários de tamanho excessivo quebrando limites do SQLite | baixo | baixa | SQLite D1 tem limite de comentário pequeno; o arquivo `bd-ticket.config.json` de fallback é usado de forma prioritária em SQLite. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `metadata.json` gerado ordenado alfabeticamente
- [ ] Testes de conexão de banco e leitura de comentários JSON passando com sucesso

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-07-21 | Versão inicial gerada por `/reversa-plan` | reversa |
