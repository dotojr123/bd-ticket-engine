# Regression Watch: Fail-Fast Validator

> Identificador: `004-fail-fast-validator`
> Data: `2026-07-21`

---

## 1. Watch Principal

N/A. Sem regras de legado 🟢 extraídas para vigiar nesta feature (projeto greenfield).

---

## 2. Observações (Regras / RFs Implementados a Confirmar)

Estes requisitos funcionais foram implementados e devem ser confirmados como 🟢 em uma execução futura de `/reversa`:

| ID | Origem (spec, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|----------------------|-----------------------------|--------------------|-------------------|
| W001 | `sdd/fail-fast-validator.md#61` | O auditor de CI compara chaves físicas no `metadata.json` com os contratos em `src/contracts/`. | Presença | Falha ao carregar metadados ou ignorar incompatibilidades na CLI. |
| W002 | `sdd/fail-fast-validator.md#61` | A CLI varre recursivamente a pasta `src/` ignorando as pastas `tests/` e build. | Presença | Detecção incorreta de referências em mocks ou fixtures de testes locais. |
| W003 | `sdd/fail-fast-validator.md#61` | O validador acusa referências a schemas Zod/Hono de tabelas inexistentes no banco. | Presença | Compilação passar com chamadas órfãs sem reportar erro estático no terminal. |
| W004 | `sdd/fail-fast-validator.md#61` | A CLI bloqueia a execução local e CI/CD retornando Exit Code 1 se identificar drifts ou erros. | Presença | Pipeline completar com sucesso (Exit Code 0) na presença de erros críticos. |
| W005 | `sdd/fail-fast-validator.md#61` | O auditor aceita o bypass `--warn-only` e retorna Exit Code 0 exibindo apenas avisos. | Presença | Bloqueio (Exit Code 1) de builds locais com a flag de aviso ativada. |

---

## 3. Histórico de re-extrações

*(Vazio)*

---

## 4. Arquivadas

*(Vazio)*
