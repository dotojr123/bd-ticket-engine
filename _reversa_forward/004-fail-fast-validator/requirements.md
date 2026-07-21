# Requirements: Fail-Fast Validator (Validador de Contratos / Auditor)

> Identificador: `004-fail-fast-validator`
> Data: `2026-07-21`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O **Fail-Fast Validator** é um utilitário CLI complementar ao motor do BD-Ticket cuja finalidade é atuar como auditor estático e validador de integridade nos pipelines de integração local e CI/CD. Ele compara a modelagem física (`metadata.json`) com os contratos TypeScript gerados (`src/contracts/`) e varre referências a esquemas no código da UI, quebrando o build (Exit Code 1) imediatamente caso seja identificada qualquer desalinhamento ou drift manual de código.

## 2. Contexto a partir do legado

Este é um projeto greenfield estruturado a partir de especificações de design geradas no pipeline de novo projeto do Reversa:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/prd.md#4-escopo-in` | O auditor de conformidade deve quebrar o build se o código manual violar o schema | 🟡 |
| `_reversa_sdd/sdd/fail-fast-validator.md#61-requisitos-principais` | O validador deve comparar metadados, contratos e referências no frontend | 🟡 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Dev Solo / Arquiteto de IA | 🟡 Interceptar quebras antes do deploy | Rodar o script de auditoria e receber aviso visual exato do campo e linha quebrado no terminal. |
| Engenheiro DevOps / Esteira CI | 🟡 Garantir deploys 100% seguros | O pipeline de build roda a CLI do validador e cancela a subida se houver qualquer divergência de hash. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01 (Auditoria Estrita de Drift):** 🟡 Qualquer alteração de assinatura de campos, deleção ou modificação manual indesejada em schemas Zod gerados e listados no `manifest.json` deve resultar em erro crítico imediato.
2. **RN-02 (Varredura de Referência Visual):** 🟡 A CLI analisará arquivos de telas da interface (`src/components/`, `src/App.tsx`) para assegurar que referências a objetos de formulário batam com as chaves legítimas do banco de dados.
3. **RN-03 (Cancelamento de Pipeline):** 🟡 A ocorrência de qualquer violação bloqueia o build e sinaliza à esteira de CI/CD que o processo foi abortado por erro estrutural.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | O validador deve carregar e verificar se todos os arquivos gerados em `src/contracts/` batem com as chaves físicas no `metadata.json`. | Must | Rodar o utilitário e validar integridade entre tabelas de banco e contratos gerados. | 🟡 |
| RF-02 | O validador deve ler o manifesto `src/contracts/manifest.json` e comparar as hashes SHA-256 com os arquivos físicos gerados para detectar drift manual. | Must | Modificar um caractere em um schema e certificar que a CLI quebra o processo. | 🟡 |
| RF-03 | O validador deve analisar arquivos de UI para reportar chamadas a campos inexistentes no banco de dados. | Must | Criar componente chamando campo fictício `usuario_cpf` e verificar o bloqueio. | 🟡 |
| RF-04 | O validador deve reportar a lista de arquivos e erros em formatação clara e estruturada para fácil análise. | Must | Rodar a CLI em modo verboso e ler logs contendo o caminho e causa exata do erro. | 🟡 |
| RF-05 | O validador deve inspecionar estritamente arquivos lógicos em `src/` (componentes, rotas, hooks), ignorando arquivos de testes (`tests/`) e scripts. | Must | Verificar que a CLI reporta erros em arquivos em `src/` e ignora discrepâncias em mocks de `tests/`. | 🟢 |
| RF-06 | A CLI deve abortar com Exit Code 1 por padrão se encontrar erros, mas aceitar `--warn-only` para apenas exibir logs informativos. | Must | Executar a CLI com `--warn-only` e certificar que retorna Exit Code 0 mesmo se houver drifts/erros. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Velocidade | Tempo de auditoria completo < 3 segundos. | `sdd/fail-fast-validator.md#7-requisitos-não-funcionais` | 🟡 |
| Portabilidade | CLI deve rodar em NodeJS padrão sem necessidade de bundlers complexos em ambiente Linux ou Windows. | `sdd/fail-fast-validator.md#7-requisitos-não-funcionais` | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Auditoria de conformidade de build limpa
  Dado que todos os schemas gerados batem com os metadados
  E nenhum arquivo gerado sofreu drift de SHA-256
  Quando eu executo "npm run db:validate"
  Então a CLI retorna Exit Code 0 e a mensagem "Integridade confirmada".

Cenário: Bloqueio por Drift detectado no CI/CD
  Dado que um desenvolvedor inseriu uma validação manual em "src/contracts/schemas/pedidos.ts"
  Quando o pipeline de pré-build executa "npm run db:validate"
  Então o validador deve interceptar a divergência de hash
  E imprimir "[DRIFT] Modificação manual detectada em..."
  E encerrar com Exit Code 1, abortando a compilação.
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 (Validação de schemas) | Must | Garante sincronia entre metadados físicos e arquivos gerados. |
| RF-02 (Anti-Drift check) | Must | Impede corrupções nos contratos gerados por edições paralelas. |
| RF-03 (Varredura de chaves de UI) | Must | Evita submissão de campos inexistentes no frontend. |
| RF-04 (Logs legíveis) | Should | Auxilia na correção rápida de bugs estáticos identificados. |

## 9. Esclarecimentos

### Sessão 2026-07-21
- **Q:** O validador deve inspecionar estritamente as referências em arquivos de apresentação visuais React (`src/components/`, `src/App.tsx`) ou deve abranger arquivos de teste Jest (`tests/`) e arquivos utilitários?
- **R:** Inspecionar **estritamente o código de aplicação em `src/`** (componentes, rotas, hooks e serviços). Pastas de testes (`tests/`, `__tests__/`) e scripts utilitários devem ser ignorados para evitar falsos positivos causados por mocks ou fixtures locais.
- **Q:** A CLI deve permitir um bypass estrito (ex: `--warn-only`) para apenas listar avisos em vez de quebrar (Exit Code 1) o pipeline local, ou o bloqueio deve ser 100% mandatório para garantir conformidade total?
- **R:** O comportamento padrão é estritamente **MANDATÓRIO** (Fail-Fast com Exit Code 1) para barrar builds ou commits quebrados. Contudo, a CLI deve aceitar a flag `--warn-only` para permitir auditorias informativas em ambientes locais ou fases de transição.

## 10. Lacunas

Nenhuma identificada. Todos os marcadores `[DÚVIDA]` foram esclarecidos e resolvidos.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-07-21 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-07-21 | Esclarecimentos de escopo de pastas e modo de bloqueio integrados via `/reversa-clarify` | reversa |
