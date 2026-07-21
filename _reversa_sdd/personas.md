# Personas e Jornadas

> Selo 🟡 PLANEJADO em todos os itens.

## Persona 1: Dev Solo / Arquiteto de IA
- **Perfil:** 🟡 Desenvolvedor autônomo que orquestra múltiplos agentes de IA para construir sistemas SaaS complexos e precisa de sincronização automática e zero bugs de contrato.
- **Contexto:** 🟡 Atua como criador autônomo ou fundador técnico, orquestrando IDEs e assistentes de IA (Cursor, Claude, terminais automatizados) para tocar projetos SaaS e sistemas complexos com múltiplos painéis (Usuário, Parceiro, Admin). O problema surge no meio do desenvolvimento acelerado: ao pedir para a IA criar uma funcionalidade ou alterar um campo no banco de dados, o código quebra silenciosamente em outro painel ou rota que não estava em foco no momento.
- **Nível técnico:** 🟡 Avançado em arquitetura de software, desenvolvimento fullstack (TypeScript, Node, SQL/D1/Postgres, React) e orquestração de agentes de IA. Domina engenharia de sistemas, mas tem aversão a trabalho repetitivo, refatorações manuais e caça a bugs silenciosos.
- **Dor principal:** 🟡 O "efeito dominó" e a perda de tempo rastreando manualmente em múltiplos arquivos/painéis onde uma alteração de banco ou contrato quebrou o sistema.
- **Objetivo final:** 🟡 Construir e escalar produtos de nível enterprise com a estrutura e o custo de um time enxuto/solo, obtendo máxima alavancagem operacional e blindagem de crescimento.

### Jornada principal
1. 🟡 Definir ou alterar uma tabela e suas etiquetas (metadados) no banco de dados.
2. 🟡 Rodar o script de codegen do motor para gerar contratos tipados (DTOs, Zod schemas, Types).
3. 🟡 Verificar que o backend absorveu automaticamente as rotas e validações do novo campo.
4. 🟡 Confirmar que o frontend renderiza o campo no painel correto com o componente UI adequado.
5. 🟡 Pedir a um agente de IA para criar uma funcionalidade nova consumindo o contrato.
6. 🟡 Receber erro determinístico imediato no ambiente de desenvolvimento se qualquer ponta estiver desalinhada.
7. 🟡 Fazer deploy em produção com confiança absoluta de que nenhuma rota ou painel quebrou silenciosamente.

---

## Persona 2: Agente de IA / Assistente de IDE
- **Perfil:** 🟡 Entidade autônoma de código (como Cursor, Claude ou agentes customizados) que consome o motor de metadados para gerar APIs, rotas e telas sem inventar atalhos hardcoded.
- **Contexto:** 🟡 Opera integrado a IDEs e assistentes de código (como Cursor, Claude, Windmill ou terminais CLI com agentes autônomos). É acionado via prompts do desenvolvedor para criar novos endpoints, renderizar formulários/tabelas nos painéis, refatorar recursos ou ajustar regras de validação em repositórios multi-camada.
- **Nível técnico:** 🟡 Especialista em geração sintática acelerada, padronização local de código e algoritmos isolados. Porém, sofre de "amnésia de contexto amplo" sem um contrato estrito, tendendo a alucinar schemas e duplicar lógica.
- **Dor principal:** 🟡 Falta de contexto centralizado e contratos rígidos de ponta a ponta, o que o leva a inventar atalhos hardcoded no frontend e desalinhar os tipos da API com o banco.
- **Objetivo final:** 🟡 Gerar código 100% funcional e alinhado aos padrões do projeto na primeira tentativa (zero-shot), atuando de forma estritamente determinística e livre de alucinações.

### Jornada principal
1. 🟡 Receber prompt do desenvolvedor para criar ou alterar uma funcionalidade no projeto.
2. 🟡 Consultar o motor de metadados do banco para descobrir a estrutura exata, tipos e permissões da tabela.
3. 🟡 Gerar rota/endpoint no backend respeitando o contrato do schema (DTOs + validações geradas).
4. 🟡 Gerar componentes e views no frontend consumindo o contrato tipado sem adicionar campos hardcoded.
5. 🟡 Validar que o código gerado passa no type-check do build e no validador de integridade de contratos.
6. 🟡 Reportar ao desenvolvedor a conclusão das alterações com logs rastreáveis até a etiqueta-fonte.

---

## Persona 3: Tech Lead / Dev Fullstack de Equipe Enxuta
- **Perfil:** 🟡 Liderança técnica que gerencia aplicações de múltiplos painéis (Admin, Parceiro, Cliente) e precisa garantir que mudanças no banco não quebrem o trabalho de outros devs ou do frontend.
- **Contexto:** 🟡 Atua liderando um time enxuto de desenvolvimento (2 a 5 devs/agentes), gerenciando code reviews, pipelines de CI/CD e deploys de aplicações multi-painel. O problema aparece comumente em code reviews ou pós-deploy: outro desenvolvedor (ou uma IA) altera um campo no banco de dados para atender a uma demanda do painel do Usuário, e isso quebra o painel do Admin ou do Parceiro silenciosamente em produção sem que o PR tenha apontado o erro.
- **Nível técnico:** 🟡 Avançado em desenvolvimento fullstack, modelagem de banco de dados, arquitetura de APIs e governança de código (Git workflows, CI/CD, testes). Possui visão sistêmica apurada.
- **Dor principal:** 🟡 Gasto excessivo de energia e tempo revisando PRs manualmente e caçando regressões de contrato que deveriam ser automatizadas e bloqueadas por padrão.
- **Objetivo final:** 🟡 Garantir estabilidade absoluta e previsibilidade no ciclo de vida do software, reduzindo drasticamente o tempo gasto em code reviews e onboarding técnico.

### Jornada principal
1. 🟡 Receber PR de um dev ou agente contendo alteração ou adição de campo no banco de dados.
2. 🟡 Verificar no CI/CD que o pipeline de validação de contratos rodou e passou com sucesso.
3. 🟡 Confirmar que a alteração propagou automaticamente e com segurança para os painéis de Admin, Parceiro e Usuário.
4. 🟡 Aprovar o PR com confiança sabendo que regressões de contrato silenciosas foram impossibilitadas na pipeline.
5. 🟡 Executar deploy e monitorar que nenhum bug silencioso de desalinhamento de schema surgiu em produção.
6. 🟡 Integrar novos desenvolvedores ou agentes ao projeto usando o motor de metadados como documentação e onboarding vivo do sistema.

---
Gerado por reversa-researcher em 2026-07-21T03:36:00-03:00
Fonte: ideation.md
