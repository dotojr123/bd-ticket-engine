# Brief inicial, /reversa-new

> Selo 🟡 PLANEJADO. Documento de entrada do time Code New Project Agents.

**Data:** 2026-07-21T03:13:00-03:00
**Usuário:** Doto

## Ideia original

Motor de Desenvolvimento Guiado por Esquema (Schema-Driven Engine / BD-Ticket): uma arquitetura onde o Banco de Dados é a Única Fonte da Verdade (Single Source of Truth) para todo o sistema.

O conceito nasce de uma dor real: projetos complexos com múltiplas interfaces (Página Principal, Painel de Usuário, Painel de Parceiro, Painel de Administrador) sofrem com o problema de "mexe num canto e quebra no outro" porque as camadas (banco, backend, frontend) não estão sincronizadas.

A solução proposta é "etiquetar" o banco de dados com metadados ricos (tipo, validação, permissões, labels i18n, componente UI, visibilidade por painel) e fazer com que backend e frontend leiam essas etiquetas dinamicamente. Cada tabela e coluna possui um contrato de metadados (Field Metadata Schema) que dita:
- O tipo do dado e suas validações (required, options, min, max)
- Quem pode ler/escrever (RBAC: user, parceiro, admin)
- Qual componente UI renderizar e em quais painéis aparece

Pipeline de 4 camadas obrigatórias:
1. DB Schema + Metadados (etiquetas) → fonte absoluta
2. Backend: consome etiquetas, gera DTOs + rotas + validação estrita
3. Contratos compartilhados (TypeScript Types / OpenAPI / Zod) sincronizam BE↔FE
4. Frontend (Headless UI): renderizador dinâmico que consome contratos

Princípios fundamentais:
- Schema-First: define uma vez no banco → propaga para tudo
- Fail Fast: se quebrar, quebra na hora e na fonte (erro determinístico)
- Decoupling Visual: lógica/rotas 100% agnósticos de tela, HTML/CSS é "plug burro"

O objetivo é criar um motor/engine reutilizável que sirva de chassi para qualquer projeto futuro, independente de stack, linguagem ou número de painéis.

---
Gerado por /reversa-new em 2026-07-21T03:13:00-03:00
