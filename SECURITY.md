# Política de Segurança

## Versões suportadas

Enquanto o projeto estiver na série `1.x`, apenas a última versão publicada recebe correções de
segurança.

## Reportando uma vulnerabilidade

**Não abra uma issue pública para vulnerabilidades de segurança.** Issues públicas são indexadas e
podem ser exploradas antes de uma correção existir.

Em vez disso:

1. Use a aba **Security → Report a vulnerability** deste repositório no GitHub (Private Vulnerability
   Reporting), se estiver habilitada; ou
2. Abra uma issue com o mínimo de detalhes possível pedindo um canal privado de contato, sem
   descrever a vulnerabilidade em si.

Inclua, no relatório privado:

- Versão afetada e driver de banco (Postgres/SQLite) envolvido, se relevante.
- Passos para reproduzir, incluindo `metadata.json`/config mínimos que disparam o problema.
- Impacto esperado (ex.: bypass de RBAC, injeção de SQL, vazamento de dados entre tenants).

## Escopo

Áreas particularmente sensíveis deste projeto, onde uma falha tem impacto direto em dados de
produção de quem adota o motor:

- `src/lib/runtime/core/auth-core.ts` e `express-adapters.ts`/`auth.ts` (verificação de JWT/RBAC).
- `src/lib/runtime/crud-engine.ts` e `db-client.ts` (construção de SQL parametrizado).
- `src/lib/validator/parser.ts` e `scripts/scan-secrets.js` (detecção de drift/segredos).

## O que esperar

Um reconhecimento inicial em até alguns dias úteis. Não há SLA formal de correção neste estágio do
projeto (mantido por um único mantenedor) — mas vulnerabilidades críticas (bypass de autenticação,
injeção de SQL) recebem prioridade sobre qualquer outro trabalho em andamento.
