# Roadmap: Fail-Fast Validator (Auditor)

> Identificador: `004-fail-fast-validator`
> Data: `2026-07-21`
> Requirements: `_reversa_forward/004-fail-fast-validator/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

O **Fail-Fast Validator** será implementado como um script de linha de comando (`src/bin/validator.ts`). Ele executará duas validações estáticas fundamentais:
1. **Auditoria de Integridade de Contratos (Drift Check):** Invoca a lógica de hashes SHA-256 e validação contra o manifesto para assegurar que nenhum contrato em `src/contracts/` foi violado manualmente.
2. **Auditoria de Código da Aplicação (Static App Check):** Varre recursivamente todos os arquivos sob `src/` (excluindo testes/scripts) procurando por referências obsoletas ou inexistentes de schemas e tabelas lidas de `metadata.json`.

Se qualquer erro for identificado, o script encerra retornando Exit Code 1 (bloqueando commits ou builds), exceto se a flag `--warn-only` estiver ativa.

## 2. Princípios aplicados

- **Fail-Fast:** Antecipa erros estruturais de integração antes mesmo da execução de build ou deploy físico.
- **Isolamento de Testes:** Ignora pastas de mocks ou testes locais para evitar falsos positivos de validação.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Varredura estática por Regex | Varre rapidamente arquivos na pasta `src/` buscando invocações de schemas e acessos a tabelas inválidas de forma leve. | Parsing AST completo via compiler API. | 🟢 |
| D-02 | Flag `--warn-only` | Oferece flexibilidade de transição local durante refatorações intensas sem impedir o fluxo. | Bloqueio fixo incondicional. | 🟢 |
| D-03 | Integração de CLI Unificada | Mapeia o script no pipeline do npm (`npm run db:validate`) simplificando setup de CI/CD. | Scripts shells avulsos. | 🟢 |

## 4. Premissas

O arquivo `_reversa_sdd/metadata.json` e o `src/contracts/manifest.json` devem existir no workspace.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `fail-fast-validator` | `_reversa_sdd/sdd/fail-fast-validator.md` | componente-novo | Cria o validador e script de CI para bloquear modificações indevidas. |

## 6. Delta no modelo de dados

N/A. Componente de checagem estática, não altera banco.

- Detalhe completo em: `_reversa_forward/004-fail-fast-validator/data-delta.md`

## 7. Delta de contratos externos

N/A. CLI interna.

## 8. Plano de migração

N/A.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Falsos positivos em arquivos gerados por terceiros | baixo | média | Ignorar arquivos em `node_modules` e pastas explícitas de build. |
| Lentidão na varredura de diretórios grandes | baixo | baixa | Filtrar buscas estritamente para extensões `.ts`, `.tsx`, `.js`, `.jsx` sob `src/`. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] Script CLI do validador integrado e executando checagem
- [ ] Testes unitários Jest validando detecção de erro passando
- [ ] CLI abortando com Exit Code 1 (ou 0 com `--warn-only`) em caso de drift

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-07-21 | Versão inicial gerada por `/reversa-plan` | reversa |
