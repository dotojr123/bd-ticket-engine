# Onboarding: Codegen Engine

> Identificador: `002-codegen-engine`
> Data: `2026-07-21`

---

## 1. Configuração e Dependências

Para executar e testar o Gerador de Contratos, é necessário instalar as dependências de roteamento e middlewares Hono no projeto:

```bash
npm install hono @hono/zod-validator zod
```

---

## 2. Executar a Geração de Código

Execute o script utilitário CLI fornecido para rodar a transformação baseada no `metadata.json`:

```bash
# Compilar TypeScript
npx tsc

# Executar a CLI de codegen
node dist/bin/codegen.js

# Executar a verificação de integridade de hashes (manifest check)
node dist/bin/codegen.js --check-only
```

---

## 3. Roteiro de Teste (Validação)

### Teste A: Geração de Contratos Estáticos
1. Rode `npx tsx src/bin/extractor.ts` para garantir que o `_reversa_sdd/metadata.json` está preenchido e atualizado.
2. Execute o codegen: `npx tsx src/bin/codegen.ts`.
3. Verifique que a pasta `src/contracts/` foi populada com as subpastas `schemas/`, `types/` e `router/`.
4. Abra e confira que os schemas Zod e tipos TypeScript batem com os tipos físicos extraídos (ex: `test_pedidos`).

### Teste B: Detecção de Modificação Manual (Anti-Drift)
1. Edite manualmente uma linha de código em `src/contracts/schemas/test_pedidos.ts` (ex: adicione um comentário extra no arquivo).
2. Execute o codegen com a flag de checagem: `npx tsx src/bin/codegen.ts --check-only`.
3. Verifique que a CLI detecta a divergência do SHA-256 e avisa que o arquivo foi modificado localmente.
