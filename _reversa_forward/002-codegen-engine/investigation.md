# Investigation: Codegen Engine

> Identificador: `002-codegen-engine`
> Data: `2026-07-21`

---

## 1. Mapeamento de Tipos Físicos para Zod

Para converter a especificação de tipos físicos do SQL (`metadata.json`) para regras lógicas Zod no backend, usaremos a seguinte tabela de correspondência interna:

| Tipo Físico | Método Zod |
|-------------|------------|
| `integer`, `real`, `numeric`, `serial` | `z.number()` |
| `varchar`, `text`, `char` | `z.string()` |
| `boolean` | `z.boolean()` |
| `timestamp`, `date` | `z.string().datetime()` ou `z.coerce.date()` |

### Tratamento de Enums / Options:
Se a coluna possuir opções limitadas especificados na tag `options` (ex: `["pendente", "concluido"]`), a geração deve priorizar o uso de `z.enum(options)` em vez de `z.string()`.

---

## 2. Estrutura do Código TS Gerado

### 2.1 Exemplo de Schema Zod Gerado (`src/contracts/schemas/pedidos.ts`):
```typescript
import { z } from "zod";

export const pedidosSelectSchema = z.object({
  id: z.number(),
  status: z.enum(["pendente", "concluido", "cancelado"])
});

export const pedidosInsertSchema = z.object({
  status: z.enum(["pendente", "concluido", "cancelado"])
});

export const pedidosUpdateSchema = pedidosInsertSchema.partial();
```

### 2.2 Exemplo de Tipos TS Gerados (`src/contracts/types/pedidos.ts`):
```typescript
import { z } from "zod";
import { pedidosSelectSchema, pedidosInsertSchema, pedidosUpdateSchema } from "../schemas/pedidos";

export type PedidoSelect = z.infer<typeof pedidosSelectSchema>;
export type PedidoInsert = z.infer<typeof pedidosInsertSchema>;
export type PedidoUpdate = z.infer<typeof pedidosUpdateSchema>;
```

### 2.3 Exemplo de Roteador Hono Gerado (`src/contracts/router/pedidos.ts`):
```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { pedidosInsertSchema, pedidosUpdateSchema } from "../schemas/pedidos";

export const pedidosRouter = new Hono();

// Exemplo de Middleware RBAC gerado a partir de permissions.write: ["admin"]
const rbacWrite = async (c: any, next: any) => {
  const userRole = c.req.header("X-User-Role");
  const allowed = ["admin"];
  if (!allowed.includes(userRole)) {
    return c.json({ error: "Forbidden - Acesso negado" }, 403);
  }
  await next();
};

pedidosRouter.post("/", rbacWrite, zValidator("json", pedidosInsertSchema), async (c) => {
  return c.json({ message: "Mock POST Handler" });
});
```

---

## 3. Algoritmo de Criação do Manifesto SHA-256

Para evitar drift manual de arquivos gerados, o motor calcula o hash e salva em `src/contracts/manifest.json`:

```typescript
import * as crypto from "crypto";
import * as fs from "fs";

function calculateSHA256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}
```
Durante execuções subsequentes da CLI, se o arquivo físico existir e o SHA-256 for diferente do registrado no manifesto, um alerta de drift será disparado.
