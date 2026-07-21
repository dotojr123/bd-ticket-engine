# Requirements: Dynamic Headless UI (Renderizador Dinâmico)

> Identificador: `003-dynamic-headless-ui`
> Data: `2026-07-21`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O **Dynamic Headless UI** é uma biblioteca de componentes React desenvolvida em TypeScript para automatizar a renderização de formulários e exibições a partir das tags e restrições de esquemas de banco de dados gerados. Ela valida dados no lado do cliente com o Zod associado e aplica controle de visibilidade (RBAC) dinâmico sem introduzir estilos de CSS rígidos, operando como uma fundação Headless customizável.

## 2. Contexto a partir do legado

Este é um projeto greenfield estruturado a partir de especificações de design geradas no pipeline de novo projeto do Reversa:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/prd.md#4-escopo-in` | O renderizador dinâmico deve auto-montar inputs e views baseadas em metadados | 🟡 |
| `_reversa_sdd/sdd/dynamic-headless-ui.md#61-requisitos-principais` | O sistema deve fornecer <DynamicForm> acoplado ao React Hook Form e Zod | 🟡 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Dev Solo / Arquiteto de IA | 🟡 Criar formulários em segundos | Chamar o `<DynamicForm schema={testPedidosInsertSchema} />` e vê-lo desenhar a interface completa. |
| Agente de IA / Assistente IDE | 🟡 Evitar injeção de código duplicado | Apenas declarar wrappers do formulário referenciando schemas Zod gerados sem criar lógica manual. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01 (Mapeamento Dinâmico de Componentes):** 🟡 A montagem do input físico (TextInput, SelectInput, etc.) deve respeitar estritamente a tag de componente declarada no `metadata.json` (`ui_control.component`).
2. **RN-02 (Validação Integrada):** 🟡 Os erros sintáticos capturados pelo esquema Zod associado (ex: formato de e-mail inválido) devem ser exibidos de forma reativa sob o campo correspondente em tempo de digitação.
3. **RN-03 (Segurança de Interface - RBAC):** 🟡 Elementos de escrita ou tabelas inteiras cujas credenciais de privilégios (`permissions.write`) não coincidam com a role do usuário logado devem ser marcados automaticamente como desabilitados (read-only) ou omitidos da view do frontend.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | O sistema deve expor o componente `<DynamicForm>` que interpreta as definições do schema e renderiza elementos de input corretos. | Must | Passar um schema contendo enums e validar que ele renderiza um `<select>` ou radio list. | 🟡 |
| RF-02 | O sistema deve integrar o esquema Zod gerado com o `react-hook-form` e `@hookform/resolvers` para validação local. | Must | Tentar submeter dados em branco em campos marcados com required e verificar bloqueio. | 🟡 |
| RF-03 | O sistema deve ocultar ou desabilitar inputs reativamente de acordo com a role do usuário injetada no contexto do formulário. | Must | Passar role "user" para formulário contendo campo restrito a "admin" e verificar se o campo está disabled. | 🟡 |
| RF-04 | O sistema deve disponibilizar slots de renderização customizados (custom inputs) para sobrescrever componentes padrão da UI. | Should | Passar um componente React customizado via prop de slot e verificar se ele substitui o input padrão. | 🟡 |
| RF-05 | O componente de formulário deve utilizar internamente a função `cn()` (`clsx` + `tailwind-merge`) para resolver e mesclar conflitos de classes Tailwind injetadas via `className`. | Must | Injetar classes customizadas e verificar mesclagem correta sem duplicações de paddings/cores. | 🟢 |
| RF-06 | O formulário deve aceitar a role de privilégios de forma híbrida: herdada via contexto global `<BDTicketProvider>` ou sobrescrita via prop `role` local. | Must | Passar prop local e verificar se ela sobrescreve as restrições herdadas do Provider. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Acessibilidade | Elementos gerados devem conter tags `aria-*` correspondentes e labels funcionais para leitores de tela. | `sdd/dynamic-headless-ui.md#7-requisitos-não-funcionais` | 🟡 |
| Bundle | O componente deve ser leve e suportar tree-shaking no empacotamento com Vite. | `sdd/dynamic-headless-ui.md#7-requisitos-não-funcionais` | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Renderização do formulário reativo Zod
  Dado que eu importo o `<DynamicForm schema={test_pedidosInsertSchema} />`
  Quando a página React renderiza a tela
  Então um campo do tipo select deve ser exibido com as opções "pendente", "concluido" e "cancelado".

Cenário: Erro de preenchimento reativo
  Dado que o campo "status" é obrigatório no Zod
  Quando o usuário clica em submeter sem selecionar nenhuma opção
  Então o formulário impede o envio do evento
  E exibe a mensagem de erro "Required" abaixo do input.
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 (Mapeamento inputs) | Must | Core do renderizador guiado a esquemas. |
| RF-02 (Validação Zod) | Must | Evita submissão de dados quebrados na entrada. |
| RF-03 (RBAC UI) | Must | Protege a experiência visual do usuário conforme credenciais. |
| RF-04 (Slots customizados) | Should | Permite flexibilidade de UI e campos ricos complexos. |

## 9. Esclarecimentos

### Sessão 2026-07-21
- **Q:** O componente de formulário deve utilizar `tailwind-merge` de forma embutida para tratar classes CSS do Tailwind enviadas por propriedades ou deixar o tratamento de concatenação de strings para o projeto do usuário?
- **R:** SIM. O componente deve utilizar um utilitário interno com `clsx` + `tailwind-merge` (a famosa função `cn()`) para combinar e resolver conflitos de classes Tailwind passadas via prop `className`. Isso garante previsibilidade estilística e impede colisões indesejadas.
- **Q:** Como a role de autenticação do usuário logado deve ser transmitida para os componentes de input reativos: via Contexto do React (Provider global) ou via prop direta em cada formulário `<DynamicForm role={activeRole} />`?
- **R:** Adoção do **Modelo Híbrido** (Provider + Prop Override):
  - *Provider Global:* Criar um `<BDTicketProvider role={currentRole}>` para envolver a árvore de componentes da aplicação e evitar prop drilling.
  - *Prop Local:* Permitir que o `<DynamicForm role={customRole} />` receba uma prop `role` opcional para sobrescrever pontualmente a role do contexto se necessário.

## 10. Lacunas

Nenhuma identificada. Todos os marcadores `[DÚVIDA]` foram esclarecidos e resolvidos.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-07-21 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-07-21 | Esclarecimentos de tailwind-merge e propagação de role de autenticação integrados via `/reversa-clarify` | reversa |
