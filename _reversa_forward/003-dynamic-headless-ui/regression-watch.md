# Regression Watch: Dynamic Headless UI

> Identificador: `003-dynamic-headless-ui`
> Data: `2026-07-21`

---

## 1. Watch Principal

N/A. Sem regras de legado 🟢 extraídas para vigiar nesta feature (projeto greenfield).

---

## 2. Observações (Regras / RFs Implementados a Confirmar)

Estes requisitos funcionais foram implementados e devem ser confirmados como 🟢 em uma execução futura de `/reversa`:

| ID | Origem (spec, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|----------------------|-----------------------------|--------------------|-------------------|
| W001 | `sdd/dynamic-headless-ui.md#61` | O componente `<DynamicForm>` mapeia corretamente tags `ui_control.component` para inputs. | Presença | Falha ao instanciar ou renderizar selects/checkboxes dinâmicos de schema. |
| W002 | `sdd/dynamic-headless-ui.md#61` | O formulário acopla Zod schemas com React Hook Form para validações em tempo real. | Presença | Validação de formulários React falhar ou submeter payloads inválidos. |
| W003 | `sdd/dynamic-headless-ui.md#61` | O formulário esconde/exibe e desabilita inputs de acordo com a role do usuário. | Presença | Inputs visíveis ou editáveis para perfis não autorizados em metadados. |
| W004 | `sdd/dynamic-headless-ui.md#61` | O formulário oferece suporte a slots de customização (Render Props) para override de campos. | Presença | Custom inputs injetados não atualizarem o estado do formulário React. |
| W005 | `sdd/dynamic-headless-ui.md#61` | O componente resolve colisões de classes Tailwind dinamicamente com o helper `cn()`. | Presença | Sobrescritas e redundâncias em layouts de formulário gerados no DOM. |

---

## 3. Histórico de re-extrações

*(Vazio)*

---

## 4. Arquivadas

*(Vazio)*
