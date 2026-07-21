# Regression Watch: Codegen Engine

> Identificador: `002-codegen-engine`
> Data: `2026-07-21`

---

## 1. Watch Principal

N/A. Sem regras de legado 🟢 extraídas para vigiar nesta feature (projeto greenfield).

---

## 2. Observações (Regras / RFs Implementados a Confirmar)

Estes requisitos funcionais foram implementados e devem ser confirmados como 🟢 em uma execução futura de `/reversa`:

| ID | Origem (spec, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|----------------------|-----------------------------|--------------------|-------------------|
| W001 | `sdd/codegen-engine.md#61` | O gerador traduz corretamente o catálogo para esquemas Zod (`z.object`) contendo validações e enums. | Presença | Validação Zod gerada falhar em aceitar payloads válidos ou aceitar dados inválidos. |
| W002 | `sdd/codegen-engine.md#61` | O gerador exporta tipos TypeScript inferidos diretamente utilizando `z.infer`. | Presença | Compilação estática do TS falhar nas views do frontend ao importar os tipos. |
| W003 | `sdd/codegen-engine.md#61` | O gerador de roteamento Hono monta endpoints lineares planos para cada tabela (`/api/pedidos`). | Presença | Assinatura de rotas Hono gerada fora dos padrões lineares definidos. |
| W004 | `sdd/codegen-engine.md#61` | O gerador acopla middlewares de verificação de permissões RBAC nas rotas conforme tags de metadados. | Presença | Acesso concedido a requisições com header de role inconsistente. |
| W005 | `sdd/codegen-engine.md#61` | A CLI do codegen gera e verifica manifestos SHA-256 e impede compilações locais se detectar modificações manuais (anti-drift). | Presença | Arquivo manual editado passar sem alertas na execução de checagem estrita da CLI. |

---

## 3. Histórico de re-extrações

*(Vazio)*

---

## 4. Arquivadas

*(Vazio)*
