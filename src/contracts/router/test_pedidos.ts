import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { test_pedidosInsertSchema, test_pedidosUpdateSchema } from "../schemas/test_pedidos";

export const test_pedidosRouter = new Hono();

// Middleware RBAC de Escrita
const rbacWrite = async (c: any, next: any) => {
  const userRole = c.req.header("X-User-Role");
  const allowed = ["parceiro","admin"];
  if (allowed.length > 0 && !allowed.includes(userRole)) {
    return c.json({ error: "Forbidden - Acesso de escrita negado" }, 403);
  }
  await next();
};

// Middleware RBAC de Leitura
const rbacRead = async (c: any, next: any) => {
  const userRole = c.req.header("X-User-Role");
  const allowed = ["user","parceiro","admin"];
  if (allowed.length > 0 && !allowed.includes(userRole)) {
    return c.json({ error: "Forbidden - Acesso de leitura negado" }, 403);
  }
  await next();
};

// Endpoints Planos (CRUD)
test_pedidosRouter.get("/", rbacRead, async (c) => {
  return c.json({ message: "Mock GET list for test_pedidos" });
});

test_pedidosRouter.post("/", rbacWrite, zValidator("json", test_pedidosInsertSchema), async (c) => {
  return c.json({ message: "Mock POST create for test_pedidos" });
});

test_pedidosRouter.put("/:id", rbacWrite, zValidator("json", test_pedidosUpdateSchema), async (c) => {
  return c.json({ message: "Mock PUT update for test_pedidos" });
});

test_pedidosRouter.delete("/:id", rbacWrite, async (c) => {
  return c.json({ message: "Mock DELETE for test_pedidos" });
});
