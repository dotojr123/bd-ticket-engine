# Data Delta: Fail-Fast Validator

> Identificador: `004-fail-fast-validator`
> Data: `2026-07-21`

---

## 1. Arquivos Criados no Workspace

O componente adiciona o ponto de entrada da CLI de auditoria de CI na pasta binária:

```
src/
└── bin/
    └── validator.ts    # CLI principal do validador/auditor de integridade
```

Nenhum arquivo físico de metadados intermediário ou tabelas físicas de banco é alterado ou gerado.
O auditor é estritamente uma ferramenta de verificação estática somente leitura que analisa o alinhamento de código entre `src/contracts/`, `src/` e `metadata.json`.
