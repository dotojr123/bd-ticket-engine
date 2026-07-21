# Ideation, BD-Ticket (Schema-Driven Engine)

> Selo 🟡 PLANEJADO em todos os itens, sujeito a validação.

## Brief original
Motor de Desenvolvimento Guiado por Esquema (Schema-Driven Engine / BD-Ticket): uma arquitetura onde o Banco de Dados é a Única Fonte da Verdade (Single Source of Truth) para todo o sistema. O conceito nasce de uma dor real: projetos complexos com múltiplas interfaces (Página Principal, Painel de Usuário, Painel de Parceiro, Painel de Administrador) sofrem com o problema de "mexe num canto e quebra no outro" porque as camadas (banco, backend, frontend) não estão sincronizadas. A solução proposta é "etiquetar" o banco de dados com metadados ricos e fazer com que backend e frontend leiam essas etiquetas dinamicamente, com pipeline de 4 camadas obrigatórias: DB Schema + Metadados → Backend (DTOs + validação) → Contratos compartilhados (Types/OpenAPI/Zod) → Frontend (Headless UI dinâmica).

## Problema
🟡 O BD-Ticket resolve o "efeito dominó" e os "bugs fantasmas" em projetos complexos com múltiplos painéis (Usuário, Parceiro, Admin). O problema se manifesta em três níveis:

- **Desenvolvedor solo/orquestrador:** perde previsibilidade e velocidade, gastando tempo rastreando onde uma alteração quebrou o sistema em vez de construir.
- **Agentes de IA / LLMs (Cursor, Claude, etc.):** ao gerar código, criar telas ou refatorar, frequentemente criam validações duplicadas, formulários hardcoded e perdem a referência da estrutura original por falta de um contrato centralizado.
- **Usuário final:** descobre o erro apenas quando clica em um botão em produção, porque a falha foi silenciosa e não foi detectada em desenvolvimento.

O problema ocorre em dois momentos críticos:
1. **No mapeamento inicial:** quando backend e frontend são desenvolvidos sem um contrato rígido e dinâmico derivado do banco.
2. **Na evolução e manutenção:** no instante em que uma coluna, regra de negócio ou etiqueta é alterada no banco, e essa mudança não reflete nem valida automaticamente em toda a cadeia (Backend → API → Frontend).

## Valor entregue
🟡 Alterar a estrutura ou etiqueta do banco de dados uma única vez e ver todos os painéis, APIs e agentes de IA se adaptarem dinamicamente ou apontarem a falha exata em segundos, eliminando 100% dos bugs silenciosos em produção.

## Alternativas existentes
🟡 As soluções atuais cobrem partes do problema, mas nenhuma entrega a solução completa de ponta a ponta:

- **Prisma & tRPC:** Garantem tipagem estática excelente em TypeScript, mas param nos tipos de dados. Não carregam metadados visuais ou de negócio (painéis, componentes UI, rótulos dinâmicos). A UI ainda precisa ser montada e validada na mão.
- **Supabase & Hasura:** Auto-geram APIs e tipos a partir do banco, mas focam apenas em CRUD. Não orquestram a camada de renderização nem regras de interface para múltiplos painéis.
- **OpenAPI / Swagger:** Excelentes para documentar contratos de API, mas são estáticos e desvinculados do banco. O banco muda e a documentação fica desatualizada (drift de schema).

**Diferencial do BD-Ticket:** Trata o banco como "Motor de Metadados e UI", não apenas como armazenamento. Une schema + etiquetas dinâmicas + contrato de API + orquestração de Agentes de IA, garantindo que o banco dite não só a tipagem, mas também o comportamento visual e as permissões de todos os painéis.

## Público-alvo (bruto)
🟡 Desenvolvedores solo e arquitetos de software que orquestram agentes de IA para construir sistemas complexos multi-painel e exigem sincronização dinâmica, automação e previsibilidade absoluta do banco de dados à interface.

## Métricas de sucesso
🟡 **Métrica principal:** Tempo total para adicionar/alterar um campo com metadados no banco de dados e vê-lo refletido em todas as APIs e painéis — de 2 horas para menos de 1 minuto (< 60 segundos).

🟡 **Métricas secundárias:**
- Taxa de bugs de desalinhamento de schema/tipo que chegam a produção = 0% (todos travam no build/dev).
- Tempo de rastreamento da causa raiz de uma quebra de contrato < 5 segundos.

## Premissas a validar
🟡 **1. Mapeamento de Regras Complexas:** A suposição de que 100% das regras de negócio complexas, fluxos de validação dinâmicos e permissões por contexto podem ser traduzidos de forma limpa em metadados/etiquetas no banco de dados sem poluir o schema ou tornar a arquitetura rígida demais.

🟡 **2. Aderência Autônoma das IAs:** A suposição de que Agentes de IA / LLMs vão respeitar rigorosamente o motor de metadados e os contratos gerados, sem tentar inventar atalhos "hardcoded" no frontend/backend ao criar novas funcionalidades.

🟡 **3. Performance e Overhead Operacional:** A suposição de que a leitura, resolução e renderização dinâmica desses metadados (seja em tempo de compilação ou runtime) não vai introduzir latência na API nem complexidade excessiva para a manutenção do frontend.

## Notas
🟡 O conceito nasceu de uma conversa iterativa documentada em `IDEIA.md`, onde a ideia evoluiu de "mapeamento do banco" para uma arquitetura completa Schema-Driven com 3 princípios (Schema-First, Fail Fast, Decoupling Visual) e um System Prompt para agentes de IA. O documento também inclui um PDF de referência (`BANCO-DE-DADOS-AGENT-AUTO.pdf`). A visão é criar um motor/engine reutilizável que sirva de chassi para qualquer projeto futuro, independente de stack.

---
Gerado por reversa-ideator em 2026-07-21T03:23:00-03:00
Fonte: newproject-brief.md
