# Investigation: Fail-Fast Validator

> Identificador: `004-fail-fast-validator`
> Data: `2026-07-21`

---

## 1. Algoritmo de Varredura de UI (`App/UI Scan`)

Para validar se referências visuais na pasta `src/` batem com chaves legítimas do banco de dados contidas no `metadata.json`, usaremos o seguinte fluxo lógico na CLI do validador:

1. Carregar tabelas válidas de `metadata.json`.
2. Listar todos os arquivos `.ts` e `.tsx` sob `src/` recursivamente (ignorando `tests/`).
3. Para cada arquivo, ler o conteúdo textual e aplicar regex para identificar invocações do metadado e de esquemas.

### Detecção de Schema Obsoleto / Removido:
Caso encontre chamadas a schemas no formato `[tableName]InsertSchema` ou `[tableName]SelectSchema` onde o `tableName` **não** esteja listado nas chaves de tabelas de `metadata.json`, um erro crítico de referência órfã será lançado.

---

## 2. Lógica do Loop de Drift (Manifest Check)

O validador executará a checagem de hashes contra o `manifest.json` com base na seguinte tabela de saída e controle de erros:

```typescript
let exitCode = 0;

for (const [filePath, expectedHash] of Object.entries(manifest.files)) {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] Contrato ausente: ${filePath}`);
    exitCode = 1;
    continue;
  }
  const actualHash = calculateSHA256(filePath);
  if (actualHash !== expectedHash) {
    console.error(`[ERROR] Drift manual detectado em: ${filePath}`);
    exitCode = 1;
  }
}
```

Caso a flag `--warn-only` esteja ativa, em vez de assinalar `exitCode = 1`, o auditor apenas reportará com o prefixo `[WARNING]` no console e retornará `exitCode = 0` no final da execução.
