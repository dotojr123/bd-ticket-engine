## O que este PR muda e por quê

<!-- Foco no "porquê" — o diff já mostra o "o quê" -->

## Checklist

- [ ] `npm run typecheck` passa sem erros
- [ ] `npm test` passa (inclui testes de integração end-to-end)
- [ ] `npm run db:validate` não acusa drift/referência órfã (se você tocou em `src/contracts/` ou nos geradores)
- [ ] Testes novos/atualizados cobrindo a mudança
- [ ] Documentação atualizada (`README.md`, `CHANGELOG.md`, `docs/`) se o comportamento público mudou
- [ ] Nenhum segredo/credencial commitado (`npm run scan:secrets`)

## Breaking changes?

- [ ] Não
- [ ] Sim — descreva o impacto e o caminho de migração para quem já usa o motor

## Como testar manualmente
<!-- Passos para o revisor validar localmente, se aplicável -->
