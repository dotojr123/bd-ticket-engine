# Data Delta: Codegen Engine

> Identificador: `002-codegen-engine`
> Data: `2026-07-21`

---

## 1. Entrada: `_reversa_sdd/metadata.json`

O codegen consome a assinatura de tabelas extraída. Exemplo estrutural de entrada:
- `pedidos` (tabela)
  - `status` (coluna varchar, nullable=false, permissions.write=["admin"])

---

## 2. Saídas Geradas no Workspace

A geração cria a seguinte árvore de diretórios em `src/contracts/` sob demanda:

```
src/contracts/
├── manifest.json
├── schemas/
│   └── [tableName].ts
├── types/
│   └── [tableName].ts
└── router/
    └── [tableName].ts
```

### Exemplo de `manifest.json`:
```json
{
  "generated_at": "2026-07-21T04:12:00Z",
  "files": {
    "src/contracts/schemas/pedidos.ts": "a8f5c2...SHA-256",
    "src/contracts/types/pedidos.ts": "b9e4a1...SHA-256",
    "src/contracts/router/pedidos.ts": "c7d3f2...SHA-256"
  }
}
```
Se a verificação falhar devido a edições manuais directas do desenvolvedor ou da IA em arquivos de contrato, o pipeline de validação fail-fast impedirá o build subsequente do projeto.
