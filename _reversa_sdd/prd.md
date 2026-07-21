# PRD: BD-Ticket (Schema-Driven Engine)

> Selo 🟡 PLANEJADO. Documento gerado a partir de ideation + personas.

**Versão:** 1.0
**Data:** 2026-07-21
**Autor:** reversa-drafter
**Status:** rascunho

---

## 1. Problema

🟡 O desenvolvimento de sistemas complexos com múltiplos painéis (Usuário, Parceiro, Admin) sobrecarrega desenvolvedores solo, times enxutos e agentes de IA devido ao acoplamento cego e à falta de sincronização estrutural. Quando uma alteração ocorre no banco de dados ou backend, o frontend frequentemente falha em tempo de execução (runtime) por desalinhamento silencioso, causando bugs fantasmas difíceis de rastrear.

### Quem sente
- 🟡 **Desenvolvedores Solo / Fundadores Técnicos:** Que perdem alavancagem operacional e gastam horas caçando regressões de código e testando rotas manualmente.
- 🟡 **Agentes de IA (Cursor, Claude, etc.):** Que, por falta de contexto centralizado do contrato, alucinam esquemas de banco, duplicam validações e escrevem código rígido (hardcoded).
- 🟡 **Tech Leads / Engenheiros Fullstack:** Que gastam energia excessiva em code reviews manuais para verificar se um campo adicionado ou editado quebrou outros painéis colaterais.
- 🟡 **Usuários Finais:** Que encontram problemas graves em produção porque as falhas escaparam silenciosamente de todo o fluxo de desenvolvimento.

---

## 2. Personas-alvo

🟡 Referência completa em [`personas.md`](./personas.md). Resumo:

- **Dev Solo / Arquiteto de IA**: 🟡 Precisa de velocidade extrema e segurança para rodar sistemas complexos sem quebras em cascata colaterais ao alterar estruturas.
- **Agente de IA / Assistente de IDE**: 🟡 Precisa de esquemas estritos e determinísticos que impeçam alucinações e geração de validações hardcoded no frontend.
- **Tech Lead / Dev de Equipe Enxuta**: 🟡 Precisa automatizar a integridade das APIs e interfaces entre múltiplos painéis, otimizando code reviews e prevenindo deploys quebrados.

---

## 3. Métricas de sucesso

🟡 Indicadores mensuráveis para validar a eficácia da implementação do motor:

| Métrica | Unidade | Alvo | Prazo |
|---|---|---|---|
| 🟡 Tempo de propagação de schema | Segundos | < 60 segundos (de banco a painéis) | 3 meses |
| 🟡 Bugs de desalinhamento de tipo em produção | Porcentagem | 0% (travados no build/CI) | 3 meses |
| 🟡 Tempo de rastreamento de quebra de contrato | Segundos | < 5 segundos | 3 meses |
| 🟡 Validações redundantes/hardcoded na UI | Quantidade | Zero (UI inteiramente orientada a contrato) | 3 meses |

---

## 4. Escopo (in)

🟡 Funcionalidades e componentes a serem especificados no produto:

- 🟡 **Motor de Extração de Metadados (Metadata Extractor):** Utilitário CLI para mapear a estrutura física das tabelas (Postgres/SQLite) e ler as "etiquetas" (validações, permissões, componentes UI).
- 🟡 **Gerador de Contratos (Codegen Engine):** Conversor automático de metadados para esquemas de validação Zod e tipos TypeScript ponta a ponta.
- 🟡 **Mapeador de Segurança/Acesso (RBAC Mapper):** Tradutor das permissões das etiquetas diretamente na camada do roteador do backend (Hono) e na renderização condicional do frontend.
- 🟡 **Renderizador Headless Dinâmico (Dynamic Headless UI):** Coleção de componentes React agnósticos de estilo que leem a tipagem e metadados da API para montar inputs e formulários automaticamente.
- 🟡 **Validador de Contratos (Fail-Fast Tooling):** Script de terminal para rodar em ambiente dev e pipelines CI/CD, bloqueando deploys e compilações se houver divergências de contratos.

---

## 5. Não-objetivos (out)

🟡 Limites explícitos do escopo do projeto:

- 🟡 **Geração de Estilos, Temas Visuais ou Layout CSS:** O motor lida apenas com a lógica de renderização, tipos, componentes headless e estrutura. Estilo visual (Tailwind classes) é aplicado externamente.
- 🟡 **Substituição de Motores de Migration:** O motor lê metadados, mas não gerencia a execução física de migrations de banco (Prisma Migrate, Wrangler D1 migrations, etc.).
- 🟡 **Implementação de Fluxos de Autenticação Primária:** O motor não cria sistemas de login, JWT tokens, hashes de senha ou OAuth do zero (consome permissões de middlewares existentes).

---

## 6. Restrições

🟡 Condições tecnológicas, de design e infraestrutura impostas:

| Tipo | Descrição |
|---|---|
| 🟡 Técnica | 100% da stack em TypeScript para type safety ponta a ponta nativo. |
| 🟡 Banco | PostgreSQL (Supabase) e Cloudflare D1 (SQLite na edge). |
| 🟡 Servidor | Hono (Cloudflare Workers) ou Node.js/Express. |
| 🟡 Validação | Schemas Zod para contratos BE e validação de payloads. |
| 🟡 UI Library | React + Vite + TypeScript. |
| 🟡 UI Data Sync | TanStack Query (React Query) para controle de cache e estado de rede. |
| 🟡 Visual | Tailwind CSS em interface modular headless agnóstica de design. |

---

## 7. Dependências externas

🟡 Serviços ou infraestruturas externas de terceiros requeridos pelo sistema:

- 🟡 **Engine runtime das edges / servidores:** Cloudflare Workers (para hospedagem Hono/D1) ou Node.js runtime estável.
- 🟡 **Provedores de Identidade/Auth:** Supabase Auth, Clerk ou Lucia (para injetar roles de usuário no cabeçalho e validar contra o RBAC).

---

## 8. Riscos

🟡 Análise de incertezas e propostas de mitigação:

| Risco | Impacto | Probabilidade | Mitigação proposta |
|---|---|---|---|
| 🟡 Modelagem de regras de negócio muito complexas que não caibam em metadados simples | 🟡 Alto | 🟡 Média | Criar suporte para ganchos (hooks) ou tags de escape nos metadados que deleguem lógica a funções customizadas. |
| 🟡 Agentes de IA ignorarem o motor de metadados e escreverem UI manual hardcoded | 🟡 Alto | 🟡 Alta | Configurar ferramentas estritas de linting e regras nos prompts de IDE (`.cursorrules`) bloqueando validações diretas na UI. |
| 🟡 Latência de rede ou processamento ao carregar schemas de metadados em runtime | 🟡 Médio | 🟡 Baixa | Realizar codegen estático em build-time dos metadados, guardando-os compilados junto ao frontend para leitura imediata. |

---

## 9. Critérios de aceite (alto nível)

🟡 Condições críticas a serem verificadas para cada persona principal:

- 🟡 **Critério Arquiteto de IA:** **Dado** que uma coluna do banco (ex: `email`) teve seu tipo ou label de validação alterado, **Quando** o script de build/codegen for executado, **Então** o TypeScript deve grifar em vermelho imediatamente todos os arquivos de UI e endpoints antigos, e a build de produção deve falhar.
- 🟡 **Critério Agente de IA:** **Dado** que a IA precisa gerar uma tela de cadastro para uma nova tabela do banco, **Quando** ler a pasta de componentes headless e o contrato gerado pelo motor, **Então** ela deve apenas declarar o componente Headless correspondente ao endpoint do banco, sem escrever nenhuma linha de validação manual.
- 🟡 **Critério Tech Lead:** **Dado** que um desenvolvedor submeteu um PR contendo um desalinhamento de campo na API, **Quando** a esteira de CI/CD executar, **Então** o validador de contratos deve falhar o build em menos de 5 segundos, exibindo o log exato da chave e da tabela discrepantes.

---

## Pendências de cobertura

🟡 Nenhuma identificada. As restrições tecnológicas e os limites do escopo (não-objetivos) foram respondidos pelo usuário e integrados com sucesso.

---

Gerado por reversa-drafter em 2026-07-21
Fontes: ideation.md, personas.md
