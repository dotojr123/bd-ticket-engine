# Spec: Dynamic Headless UI (Renderizador Dinâmico)

**Versão:** 1.0
**Status:** Rascunho
**Autor:** reversa-spec-sdd
**Data:** 2026-07-21
**Reviewers:** N/A

---

## 1. Resumo

O **Dynamic Headless UI** é uma biblioteca de componentes React e TypeScript que consome as definições de metadados geradas (contratos) para renderizar dinamicamente elementos de interface (como formulários de inserção, tabelas de listagem e botões de ação), aplicando automaticamente regras de visibilidade baseadas em roles (permissões) e validações no lado do cliente sem gerar estilos de CSS fixos (estritamente Headless).

---

## 2. Contexto e Motivação

**Problema:**
Desenvolver e manter formulários de entrada e exibições de dados em múltiplos painéis (Admin, Parceiro, Usuário) resulta em duplicação maciça de código. Se um campo é adicionado ao banco, o desenvolvedor precisa recriar a validação e o input em três painéis visuais diferentes. Qualquer erro nessa etapa gera divergências que podem corromper a entrada de dados.

**Evidências:**
Sistemas complexos frequentemente sofrem com drift visual e lógico onde o painel do parceiro valida um campo de forma mais frouxa do que o painel do usuário, salvando dados inconsistentes no banco.

**Por que agora:**
A adoção de componentes Headless dinâmicos e guiados a esquemas (Schema-Driven) resolve este problema centralizando a inteligência de renderização e validação. O visual (classes Tailwind) permanece nas páginas do projeto, mas a estrutura e regras derivam do banco de dados.

---

## 3. Goals (Objetivos)

- [ ] G-01: 🟡 Auto-montar formulários React a partir de um esquema JSON de metadados de tabelas.
- [ ] G-02: 🟡 Aplicar validação reativa no lado do cliente (via Zod/React Hook Form) utilizando o esquema gerado.
- [ ] G-03: 🟡 Ocultar ou desabilitar campos e ações automaticamente baseando-se no papel (role) do usuário logado e nas permissões da etiqueta.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| 🟡 Tempo para criar um formulário multi-painel | 2 horas | < 2 minutos (declaração de schema) | 3 meses |
| 🟡 Redundância de validação de formulários | Alta | Zero (derivada do contrato) | 3 meses |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: 🟡 A biblioteca não gera layouts de CSS, classes de posicionamento complexas ou temas visuais (é estritamente Headless, aceitando classes via propriedade `className`).
- NG-02: 🟡 A biblioteca não lida com requisições HTTP diretamente (consome as funções clientes geradas pelo `codegen-engine` ou TanStack Query).
- NG-03: 🟡 A biblioteca não gerencia o estado global de autenticação (JWT) da aplicação (apenas consome a role ativa do contexto do usuário).

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Dev Solo / Arquiteto de IA que consome os componentes dinâmicos para montar painéis rapidamente.
**Usuário secundário:** 🟡 Agentes de IA que apenas referenciam componentes genéricos (ex: `<DynamicForm schema={UserSchema} />`) ao criar novas páginas.

**Jornada atual (sem a feature):**
1. 🟡 O desenvolvedor precisa desenhar um formulário de cadastro de Parceiro para a UI.
2. 🟡 Cria os inputs HTML manuais, vincula estados, escreve validação manual no React Hook Form.
3. 🟡 Copia e adapta o formulário para o painel Admin com permissões específicas.
4. 🟡 Qualquer alteração de campo requer edição manual em ambos os painéis.

**Jornada futura (com a feature):**
1. 🟡 O desenvolvedor importa o componente `<DynamicForm schema={ParceiroSchema} />`.
2. 🟡 O componente lê a etiqueta do banco de dados e desenha os inputs e selects adequadamente.
3. 🟡 Se o usuário for admin, exibe campos restritos; se for parceiro comum, oculta-os automaticamente.
4. 🟡 A validação roda em tempo real baseada no Zod gerado pelo codegen.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve fornecer um componente `<DynamicForm>` que renderiza inputs baseando-se no tipo de controle de UI (`ui_control.component`) declarado na etiqueta. | Must | Passar um schema contendo um campo marcado como `SelectInput` e verificar que um elemento `<select>` é renderizado. |
| RF-02 | 🟡 O sistema deve integrar os esquemas Zod gerados pelo codegen com o React Hook Form para validação nativa de erros em tempo real. | Must | Tentar submeter um formulário vazio com campo obrigatório e verificar que a mensagem de erro é exibida. |
| RF-03 | 🟡 O sistema deve ocultar/exibir inputs baseando-se no array `ui_control.visible_in_views` do metadado. | Must | Definir que um campo é visível apenas no painel admin e verificar que ele não é renderizado no painel do usuário comum. |
| RF-04 | 🟡 O sistema deve desabilitar (read-only) inputs baseando-se nas permissões de escrita (`permissions.write`) da role ativa. | Must | Acessar um formulário como role `user` e verificar que campos restritos a `parceiro` estão desabilitados para digitação. |
| RF-05 | 🟡 O sistema deve expor estados de carregamento (loading), erro de requisição (error) e sucesso (success) em todos os componentes de formulário dinâmico. | Must | Verificar que a UI exibe elementos de fallback customizáveis fornecidos via slots/props em cada transição de estado. |

### 6.2 Fluxo Principal (Happy Path)

1. 🟡 O desenvolvedor cria uma página `DashboardAdmin.tsx` no frontend.
2. 🟡 Declara `<DynamicForm schema={pedidoSchema} onSubmit={handleSubmit} className="space-y-4" />`.
3. 🟡 O componente `<DynamicForm>` consulta o schema de tipos gerado pelo `codegen-engine`.
4. 🟡 Mapeia os metadados e renderiza os inputs com as classes CSS padrão recebidas.
5. 🟡 O usuário interage com os campos. A validação reativa valida os inputs em tempo real.
6. 🟡 Ao submeter, os dados validados são enviados para a API.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Acessibilidade | 🟡 Compatibilidade com WCAG 2.1 AA | Todos os inputs dinâmicos gerados devem possuir tags `<label>` associadas corretas (`htmlFor`). |
| RNF-02 | Peso da bundle | 🟡 Overhead menor que 20kb gzipped | Garantir tree shaking eficiente para não pesar na bundle final. |

---

## 8. Design e Interface

**Componentes afetados:**
- Biblioteca React (`src/frontend/components/DynamicForm.tsx`, `src/frontend/components/inputs/`)

---

## 9. Modelo de Dados

N/A. Este componente é puramente de interface (camada visual e de controle) e não gerencia persistência de banco de dados diretamente.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| `react` | Obrigatória | A biblioteca não funciona (componentes React). |
| `react-hook-form` | Obrigatória | A validação reativa e gerência de estado de formulário quebra. |
| `@hookform/resolvers` | Obrigatória | Não é possível acoplar esquemas de validação Zod no formulário. |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Componente UI não mapeado | Metadado define componente `MultiSelectSuper` mas o frontend não tem esse input implementado | 🟡 Renderizar um input de texto padrão (`TextInput`) como fallback seguro e emitir um log de warning no console em ambiente de dev. |
| EC-02: Erros de rede na validação | API rejeita um payload que o Zod local considerou válido | 🟡 Capturar o erro retornado da API (ex: restrição única no banco) e propagar de forma amigável para o input correspondente via formulário. |
| EC-03: Sem permissão de leitura | Usuário sem role válida acessa tela que lê o schema | 🟡 O formulário exibe uma tela vazia de erro "Permissão Negada" sem expor os inputs ou campos confidenciais. |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 Delega a validação para o contexto de autenticação global.
- **Autorização:** 🟡 Garante o controle visual de privilégios (RBAC) no lado do cliente ocultando e desabilitando campos de forma proativa, embora a validação final ocorra no backend.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 Publicação como pacote npm interno (`@bd-ticket/ui`).

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | 🟡 Devemos suportar layouts em colunas/grid baseando-se em metadados (ex: `"grid_cols": 6`) ou deixar que o desenvolvedor organize o wrapper visual manualmente? | Médio | Doto | TBD |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| 🟡 UI Estritamente Headless | Gerar componentes com visual pré-definido (Bootstrap/Material UI) | Componentes headless garantem flexibilidade total para que o mesmo motor funcione no painel Admin (geralmente mais árido/funcional) e na Landing Page principal (altamente personalizada). |

---

## Avaliação de Qualidade (Spec Scorer)

```
============================================================
  SPEC QUALITY REPORT
  SCORE TOTAL: 88.0/100 — ✅ Boa
============================================================
  Breakdown:
    Completude:    100/100 (peso 30%)
    Testabilidade: 88/100 (peso 25%)
    Clareza:       65/100 (peso 20%)
    Escopo:        100/100 (peso 15%)
    Edge Cases:    80/100 (peso 10%)
============================================================
```
