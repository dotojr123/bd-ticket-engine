# Contributing to BD-Ticket Engine

Obrigado pelo seu interesse em contribuir para o **BD-Ticket Engine**! Este documento orienta as diretrizes para desenvolvimento local e envio de Pull Requests.

---

## 🛠️ Setup de Desenvolvimento Local

### 1. Requisitos
- Node.js v20 ou superior.
- Banco SQLite local ou PostgreSQL funcional.

### 2. Instalação de Dependências
```bash
git clone https://github.com/doto/bd-ticket-engine.git
cd bd-ticket-engine
npm install
cp .env.example .env   # preencha DATABASE_URL/JWT_SECRET conforme necessário
```

`npm install` também registra os git hooks locais (via `husky`, script `prepare`). O pre-commit
roda um scanner de segredos (`npm run scan:secrets`) e o Fail-Fast Validator em modo aviso —
nenhum dos dois deve ser contornado com `--no-verify` fora de emergências reais.

### 3. Rodando os Testes locais
Nosso pipeline de testes é baseado no Jest e valida drivers físicos, geradores de código, utilitários CSS, o validador estático (AST) e um fluxo de integração end-to-end (CRUD real contra SQLite em memória):
```bash
npm run test
npm run typecheck   # tsc --noEmit estrito, sem `any` implícito
```

---

## 📐 Padrões de Projeto e Contrato

1. **End-to-End Type Safety:** Todos os módulos devem ser 100% TypeScript e compilar sem a flag de escape `any` sempre que possível.
2. **Fail-Fast:** Qualquer checagem estática que acuse drifts ou falhas de coerência de schemas deve quebrar o build imediatamente retornando Exit Code 1.
3. **Headless:** A camada visual em `src/components/` não deve empacotar ou injetar estilos de cores, temas ou layouts fixos. Todo estilo é delegado ao projeto cliente através de propriedades (`className` e Slots).

---

## 🚀 Fluxo de Envio de PRs

1. Faça um Fork do repositório.
2. Crie uma branch com a sua feature: `git checkout -b feat/minha-feature`.
3. Certifique-se de que os testes e a compilação do TypeScript rodem com sucesso (`npm run build` e `npm run test`).
4. Commit suas modificações seguindo convenções de Conventional Commits (e.g. `feat:`, `fix:`, `docs:`).
5. Abra o Pull Request apontando para a branch `main` do repositório original.
