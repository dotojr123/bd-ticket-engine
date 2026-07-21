# Spec: Codegen Engine (Gerador de Contratos)

**Versão:** 1.0
**Status:** Rascunho
**Autor:** reversa-spec-sdd
**Data:** 2026-07-21
**Reviewers:** N/A

---

## 1. Resumo

O **Codegen Engine** é o motor de geração de código encarregado de traduzir o arquivo intermediário `metadata.json` gerado pelo extrator em definições estáticas estritas de tipos, validações de esquemas Zod (backend/frontend) e esqueletos de rotas/middlewares com regras de controle de acesso baseadas em papéis (RBAC) para o framework web Hono.

---

## 2. Contexto e Motivação

**Problema:**
A sincronização manual de rotas de API, middlewares de controle de acesso (RBAC) e esquemas de validação de dados é um dos pontos onde mais ocorrem erros de digitação e esquecimento em sistemas complexos. Quando um novo papel de acesso é adicionado ou uma coluna é restrita, é fácil esquecer de ajustar o middleware da rota correspondente, abrindo brechas de segurança ou quebrando a integração de painéis específicos.

**Evidências:**
Em aplicações com múltiplos painéis (Admin, Parceiro, Usuário), é comum haver redundância na escrita de esquemas de validação em Zod no backend e schemas de formulário equivalentes no frontend.

**Por que agora:**
Para garantir o princípio de *Fail Fast*, a geração automática (codegen) em build-time cria a ponte lógica de tipos estáticos compartilhados. Se o banco mudar e o codegen rodar, qualquer diferença de assinatura na rota do Hono ou nas propriedades de permissão quebra a compilação instantaneamente.

---

## 3. Goals (Objetivos)

- [ ] G-01: 🟡 Gerar 100% dos esquemas Zod de entrada/saída a partir do `metadata.json`.
- [ ] G-02: 🟡 Gerar definições de tipos TypeScript compartilhados de ponta a ponta (Backend ↔ Frontend).
- [ ] G-03: 🟡 Gerar rotas e middlewares Hono injetando regras de RBAC baseadas nas permissões especificadas nas etiquetas do banco.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| 🟡 Cobertura de geração de validação Zod | 0% | 100% | 3 meses |
| 🟡 Cobertura de geração de rotas Hono | 0% | 100% | 3 meses |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: 🟡 O codegen não implementa regras de negócio complexas ou lógica customizada de bancos de dados (ex: processar pagamentos ou gerenciar webhooks). Ele gera apenas a estrutura do DTO, as rotas e os middlewares de segurança.
- NG-02: 🟡 O codegen não interage diretamente com o banco de dados físico (sua única entrada é o `metadata.json`).
- NG-03: 🟡 O codegen não cria ou gerencia a infraestrutura de servidores Hono (o bootstrap e configuração do runtime do Hono devem ser escritos pelo desenvolvedor).

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Dev Solo / Arquiteto de IA que necessita de geração automática de contratos de API e segurança.
**Usuário secundário:** 🟡 Agentes de IA que consomem as rotas e validações Zod geradas para implementar os handlers do backend e serviços do frontend.

**Jornada atual (sem a feature):**
1. 🟡 O desenvolvedor adiciona uma rota `/api/pedidos/cancelar` no backend.
2. 🟡 Escreve o DTO de entrada no Zod na mão.
3. 🟡 Escreve o middleware de RBAC no Hono na mão (ex: `if (user.role !== 'admin')`).
4. 🟡 Compartilha manualmente o tipo com o frontend, ou o recria lá. Alto risco de desalinhamento de propriedades.

**Jornada futura (com a feature):**
1. 🟡 O desenvolvedor roda a CLI do `codegen-engine`.
2. 🟡 O motor lê o `metadata.json` e gera os arquivos `contracts.ts`, `validation.ts` e `routes.ts` com tudo estruturado.
3. 🟡 O desenvolvedor apenas importa as rotas prontas e escreve os handlers (use cases) internos correspondentes.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve gerar esquemas Zod (`z.object`) contendo validações de obrigatoriedade, tamanho (min/max) e enums baseados nos metadados. | Must | Executar o gerador e obter esquemas Zod funcionais que rejeitam dados inválidos conforme o teste do Zod. |
| RF-02 | 🟡 O sistema deve gerar tipos TypeScript correspondentes a cada esquema gerado (`z.infer<typeof schema>`). | Must | Compilar os arquivos TypeScript gerados sem erros de tipagem. |
| RF-03 | 🟡 O sistema deve gerar arquivos de rotas Hono (`Hono()`) com definição automática de caminhos baseada no nome das tabelas mapeadas. | Must | Importar as rotas no app principal do Hono e verificar que as rotas aceitam requisições. |
| RF-04 | 🟡 O sistema deve injetar middlewares de verificação de papel (RBAC middleware) nas rotas Hono baseados nas permissões de leitura/escrita do metadado. | Must | Requisições sem o role especificado na etiqueta do banco para aquela rota devem receber HTTP 403 Forbidden automaticamente pelo middleware. |
| RF-05 | 🟡 O sistema deve gerar um manifesto de integridade com o SHA-256 de cada arquivo gerado para detectar modificações manuais acidentais (drift). | Should | Verificar que a ferramenta falha ou avisa se um arquivo gerado for editado manualmente. |

### 6.2 Fluxo Principal (Happy Path)

1. 🟡 O desenvolvedor executa a CLI `npx bd-ticket-codegen`.
2. 🟡 O codegen carrega `_reversa_sdd/metadata.json`.
3. 🟡 O codegen processa cada tabela e cria o mapeamento Zod das colunas.
4. 🟡 O codegen analisa as permissões (ex: `"permissions": {"write": ["admin"]}`) e gera o middleware RBAC correspondente no arquivo de rotas.
5. 🟡 O codegen grava os arquivos gerados em pastas designadas do backend e frontend (ex: `src/shared/contracts/` e `src/backend/routes/`).

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | 🟡 Tempo de geração total < 2 segundos | Para um esquema contendo 100 colunas em 10 tabelas. |
| RNF-02 | Qualidade do Código | 🟡 Código limpo auto-gerado | O código gerado deve passar em verificações padrão do ESLint sem warnings de sintaxe. |

---

## 8. Design e Interface

**Componentes afetados:**
- CLI Codegen (`bin/codegen.js`)
- Módulos geradores (`lib/generators/zod.js`, `lib/generators/hono.js`, `lib/generators/types.js`)

---

## 9. Modelo de Dados

Este componente não cria novas entidades no banco de dados, mas manipula a leitura do `metadata.json` (esquema na Spec do Extrator) e gera arquivos `.ts`.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| `zod` | Obrigatória | O backend gerado não compila por falta da biblioteca de validação. |
| `hono` | Obrigatória | As definições de rotas e middlewares do backend falham ao compilar. |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Metadata em branco | Arquivo `metadata.json` corrompido ou vazio | 🟡 Encerrar o processo com erro de parsing claro e abortar a gravação de arquivos de código parcial. |
| EC-02: Colisões de nome | Duas tabelas ou colunas com nomes equivalentes que geram colisões de classes TypeScript | 🟡 Lançar um erro de compilação indicando o conflito e sugerindo o uso de namespaces ou prefixos de tabela. |
| EC-03: Falha no disco (Sem espaço ou permissão) | Executar codegen com disco cheio ou pasta de output protegida por permissão de root | 🟡 Abortar imediatamente a execução, logar erro de IO e não gravar arquivos quebrados/incompletos. |
| EC-04: Metadado de tipo desconhecido | Coluna com tipo físico não reconhecido pelo extrator | 🟡 Usar fallback para tipo Zod genérico (`z.unknown()`) e emitir um aviso amarelo no console, sem quebrar o build. |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 N/A.
- **Autorização:** 🟡 Os middlewares gerados são responsáveis por aplicar o controle de acesso RBAC a nível de campo/rota baseando-se nas tags lidas do banco.
- **Dados sensíveis:** 🟡 Os contratos gerados não expõem senhas ou credenciais de banco.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 Publicação como pacote npm interno ou escopado (`@bd-ticket/codegen`).
- **Como reverter:** 🟡 Rollback de versão do pacote npm.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | 🟡 Devemos gerar esqueletos de controllers vazios ou apenas as definições de rotas e middlewares? | Alto | Doto | TBD |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| 🟡 Gerar middlewares RBAC nativos do Hono | Fazer a validação RBAC manual dentro de cada controller | Colocar a segurança na definição da rota (middleware) reduz o risco de esquecimento por parte do desenvolvedor e blinda a rota antes de executar qualquer controller. |

---

## Avaliação de Qualidade (Spec Scorer)

```
============================================================
  SPEC QUALITY REPORT
  SCORE TOTAL: 90.0/100 — ⭐ Excelente
============================================================
  Breakdown:
    Completude:    100/100 (peso 30%)
    Testabilidade: 88/100 (peso 25%)
    Clareza:       65/100 (peso 20%)
    Escopo:        100/100 (peso 15%)
    Edge Cases:    100/100 (peso 10%)
============================================================
```
