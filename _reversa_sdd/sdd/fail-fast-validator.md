# Spec: Fail-Fast Validator (Validador de Contratos)

**Versão:** 1.0
**Status:** Rascunho
**Autor:** reversa-spec-sdd
**Data:** 2026-07-21
**Reviewers:** N/A

---

## 1. Resumo

O **Fail-Fast Validator** é um utilitário de terminal (CLI) e validador estático de esteiras de CI/CD projetado para verificar a integridade estrutural e sincronia entre a modelagem de banco de dados, os contratos gerados pelo backend e as referências de chamadas presentes no código do frontend, forçando a interrupção imediata de builds ou deploys (Fail-Fast) se houver discrepância de tipos ou metadados.

---

## 2. Contexto e Motivação

**Problema:**
Alterações no banco de dados comumente causam erros colaterais em painéis negligenciados do frontend devido à falta de sincronização. Sem um validador proativo no build local e no CI/CD, esses erros passam silenciosamente e só são detectados em tempo de execução pelos usuários, gerando bugs graves.

**Evidências:**
Sistemas complexos com múltiplos painéis acumulam drift silencioso e quebras pós-deploy na integração entre a API e as telas do frontend, exigindo testes manuais massivos a cada nova release.

**Por que agora:**
Garantir o princípio fundamental de *Fail-Fast* exige uma ferramenta que valide a conformidade de ponta a ponta e impeça o empacotamento ou deploy de código que contenha discrepâncias de contrato.

---

## 3. Goals (Objetivos)

- [ ] G-01: 🟡 Validar se 100% das chamadas e schemas do frontend batem com a especificação do `metadata.json`.
- [ ] G-02: 🟡 Bloquear compilações locais e no CI/CD se for detectado drift de propriedades, tipos incompatíveis ou campos deletados do banco.
- [ ] G-03: 🟡 Executar o processo completo de validação em menos de 5 segundos no pipeline.
- [ ] G-04: 🟡 Emitir um relatório detalhado indicando o arquivo exato, a linha e o campo onde ocorreu o desalinhamento.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| 🟡 Tempo de validação no build | N/A | < 5 segundos | 3 meses |
| 🟡 Bugs de desalinhamento de contrato em produção | Alto | Zero | 3 meses |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: 🟡 O validador não corrige o código ou o banco automaticamente (apenas reporta e quebra o build).
- NG-02: 🟡 O validador não realiza testes de carga ou de performance da API.
- NG-03: 🟡 O validador não executa testes de comportamento E2E funcionais (como simular cliques de mouse ou fluxos em browsers).
- NG-04: 🟡 O validador não substitui o compilador TypeScript padrão (funciona como uma camada de análise estática complementar orientada a metadados).

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Dev Solo / Arquiteto de IA que executa o build local e obtém feedback imediato.
**Usuário secundário:** 🟡 Tech Lead que gerencia a integridade de deploys na esteira de CI/CD.

**Jornada atual (sem a feature):**
1. 🟡 Um desenvolvedor (ou IA) edita a coluna `status` no banco.
2. 🟡 O backend atualiza os DTOs, mas o frontend continua enviando a chave antiga.
3. 🟡 O build do projeto passa normalmente sem erros.
4. 🟡 O bug silencioso é detectado apenas pelo usuário em produção ao tentar salvar a informação.

**Jornada futura (com a feature):**
1. 🟡 Um desenvolvedor edita a coluna no banco.
2. 🟡 O backend e o frontend são atualizados parcialmente, mas um dos painéis esquece a alteração.
3. 🟡 Durante o pré-build ou CI/CD, o `fail-fast-validator` é disparado automaticamente.
4. 🟡 Ele detecta que o painel Admin está referenciando um campo incompatível, imprime o arquivo e a linha do erro, e encerra com exit code 1, abortando o deploy.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O validador deve ler o `metadata.json` e validar contra os arquivos TypeScript gerados pelo `codegen-engine`. | Must | Rodar a validação após alterar um arquivo de contrato e verificar que aponta a divergência. |
| RF-02 | 🟡 O validador deve varrer os arquivos do frontend e detectar se há chamadas ou referências a colunas e schemas que não existem no banco de dados. | Must | Criar um formulário referenciando `campo_inexistente` e verificar que a CLI aponta o erro de contrato. |
| RF-03 | 🟡 O validador deve retornar Exit Code 1 se encontrar qualquer discrepância estrutural ou de tipo. | Must | Executar em um projeto com erro e certificar que o script de build retorna código de saída diferente de zero. |
| RF-04 | 🟡 O validador deve retornar Exit Code 0 se todos os contratos estiverem em harmonia estrutural. | Must | Executar em um projeto alinhado e certificar que o build passa com sucesso. |
| RF-05 | 🟡 O validador deve expor a flag `--strict` para decidir se warnings de tipo (como incompatibilidade de representação UI) devem ou não quebrar o build. | Should | Rodar com e sem a flag para validar a severidade dos avisos. |
| RF-06 | 🟡 O validador deve exportar o relatório de auditoria final em formato markdown compatível com o histórico de logs do CI/CD. | Should | Gerar o arquivo `contracts-audit.md` após a execução bem-sucedida. |

### 6.2 Fluxo Principal (Happy Path)

1. 🟡 O pipeline de CI/CD inicia no GitHub Actions / Cloudflare Pages.
2. 🟡 A esteira dispara `npx bd-ticket-validate --strict`.
3. 🟡 O validador lê a estrutura do banco gerada localmente no build.
4. 🟡 Varre os componentes do frontend analisando as tipagens em busca de inconsistências de campos e permissões.
5. 🟡 Tudo coincide perfeitamente. O validador exibe logs verdes e encerra com Exit Code 0.
6. 🟡 O deploy de produção prossegue.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | 🟡 Tempo de execução total < 4 segundos | Para projetos com até 100 arquivos no frontend. |
| RNF-02 | Compatibilidade | 🟡 Funcionar sem conexão de rede ativa | A validação de arquivos deve ser inteiramente offline/estática. |

---

## 8. Design e Interface

**Componentes afetados:**
- CLI Validator (`bin/validate.js`)
- Módulos analisadores de AST (`lib/analyzers/ts-parser.js`, `lib/analyzers/ast-mapper.js`)

---

## 9. Modelo de Dados

N/A. Este componente é de validação estática e não persiste dados no banco.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| `typescript` | Obrigatória | A análise de árvore sintática (AST) e verificação de tipos quebra. |
| `glob` | Obrigatória | O validador não consegue varrer a pasta do frontend de forma dinâmica. |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Metadata corrompido | Arquivo `metadata.json` com sintaxe JSON malformada ou truncado | 🟡 Quebrar a validação imediatamente informando erro de parsing e retornando Exit Code 1. |
| EC-02: Falha ao carregar TypeScript | Configuração de tsconfig do projeto ausente ou mal configurada | 🟡 Emitir aviso claro sobre a falta de arquivo de config e realizar a validação aproximada de arquivos globais. |
| EC-03: Timeout ou esgotamento de recursos | Projetos gigantescos consumindo mais memória do que o limite do node | 🟡 Implementar garbage collection e liberação de memória interna no parser para suportar execuções em máquinas enxutas de CI. |
| EC-04: Inputs nulos em campos obrigatórios | Metadados sem dados suficientes para preencher os esquemas mínimos | 🟡 Abortar com aviso de inconsistência no metadata.json. |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 N/A.
- **Autorização:** 🟡 N/A.
- **Dados sensíveis:** 🟡 A análise estática não lê ou transmite dados reais de negócio ou chaves secretas.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 Integração na dependência `@bd-ticket/validator` no npm.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | 🟡 Devemos gerar relatórios XML compatíveis com formatos JUnit para relatar erros no dashboard de CI/CD? | Baixo | Doto | TBD |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| 🟡 Análise estática offline | Consultar a API ativa de staging para comparar os esquemas | Fazer a validação de forma 100% offline e estática garante velocidade (menos de 5 segundos), previne problemas se a API estiver fora do ar e elimina riscos de segurança. |

---

## Avaliação de Qualidade (Spec Scorer)

```
============================================================
  SPEC QUALITY REPORT
  SCORE TOTAL: 89.0/100 — ✅ Boa
============================================================
  Breakdown:
    Completude:    100/100 (peso 30%)
    Testabilidade: 88/100 (peso 25%)
    Clareza:       60/100 (peso 20%)
    Escopo:        100/100 (peso 15%)
    Edge Cases:    100/100 (peso 10%)
============================================================
```
