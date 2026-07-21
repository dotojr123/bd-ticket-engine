# Roadmap: Dynamic Headless UI (Renderizador Dinâmico)

> Identificador: `003-dynamic-headless-ui`
> Data: `2026-07-21`
> Requirements: `_reversa_forward/003-dynamic-headless-ui/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

O **Dynamic Headless UI** será implementado como um conjunto de componentes React e utilitários exportados em `src/components/` e `src/lib/ui/`.
O fluxo consiste em:
1. `src/lib/ui/provider.tsx` — Prover o contexto React global contendo a role ativa do usuário.
2. `src/lib/ui/utils.ts` — Exportar a função `cn()` unindo `clsx` e `tailwind-merge` para estilização flexível livre de colisões.
3. `src/components/DynamicForm.tsx` — Componente funcional que lê a assinatura do metadado e do schema Zod correspondente, mapeia controles de formulário, valida payloads com React Hook Form e esconde/desabilita campos conforme permissões.

## 2. Princípios aplicados

- **Headless-First:** Nenhum layout visual fixo ou cores embutidas. Toda estilização externa é estritamente opcional e injetada via classes Tailwind.
- **Fail-Fast (Form Validation):** Erros de preenchimento do Zod capturados em tempo real e expostos abaixo de cada input individual.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Modelo Híbrido de Roles | Provider global evita prop drilling exaustivo; prop local permite overrides em painéis administrativos avançados. | Contexto exclusivo ou Prop exclusiva. | 🟢 |
| D-02 | Slots de Customização | Permite que o desenvolvedor substitua um `<input>` básico por componentes complexos (ex: Rich Editor, Datepickers) mantendo a validação Zod. | Formulário estritamente rígido não customizável. | 🟢 |
| D-03 | tailwind-merge embutido | Evita colisões de estilo no runtime se o desenvolvedor passar classes conflitantes. | Concatenação simples por template strings. | 🟢 |

## 4. Premissas

Assume-se que o React v18 e TypeScript estejam instalados no ambiente de frontend.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `dynamic-headless-ui` | `_reversa_sdd/sdd/dynamic-headless-ui.md` | componente-novo | Cria a biblioteca de auto-montagem de formulários baseada em esquemas e controle de acesso visual. |

## 6. Delta no modelo de dados

N/A. Componente puramente de apresentação visual.

- Detalhe completo em: `_reversa_forward/003-dynamic-headless-ui/data-delta.md`

## 7. Delta de contratos externos

N/A. Componente de UI cliente interno.

## 8. Plano de migração

N/A.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Incompatibilidade de renderização no React SSR (Next.js) | baixo | média | Garantir compatibilidade usando diretivas de `use client` se necessário na raiz do arquivo. |
| Colisões de estados nos slots de inputs customizados | médio | baixa | Padronizar as propriedades passadas para a função de renderização do slot (value, onChange, errors). |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] Componente `<DynamicForm>` renderizando e validando campos de teste
- [ ] Slots de customização e controle de visibilidade (RBAC) testados e validados com sucesso
- [ ] Compilação do TypeScript e testes passando sem erros

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-07-21 | Versão inicial gerada por `/reversa-plan` | reversa |
