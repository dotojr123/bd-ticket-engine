/**
 * Gera a string de código TypeScript do roteador Hono acoplado com validação e RBAC.
 */
export function generateRouterString(tableName: string, colDefs: { [colName: string]: any }): string {
  // Extrair papéis permitidos de escrita/leitura na tabela a partir das colunas
  const writeRolesSet = new Set<string>();
  const readRolesSet = new Set<string>();

  for (const colDef of Object.values(colDefs)) {
    if (colDef.metadata?.permissions?.write) {
      colDef.metadata.permissions.write.forEach((r: string) => writeRolesSet.add(r));
    }
    if (colDef.metadata?.permissions?.read) {
      colDef.metadata.permissions.read.forEach((r: string) => readRolesSet.add(r));
    }
  }

  const writeRoles = Array.from(writeRolesSet);
  const readRoles = Array.from(readRolesSet);

  return `import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ${tableName}InsertSchema, ${tableName}UpdateSchema } from "../schemas/${tableName}";

export const ${tableName}Router = new Hono();

// Middleware RBAC de Escrita
const rbacWrite = async (c: any, next: any) => {
  const userRole = c.req.header("X-User-Role");
  const allowed = ${JSON.stringify(writeRoles)};
  if (allowed.length > 0 && !allowed.includes(userRole)) {
    return c.json({ error: "Forbidden - Acesso de escrita negado" }, 403);
  }
  await next();
};

// Middleware RBAC de Leitura
const rbacRead = async (c: any, next: any) => {
  const userRole = c.req.header("X-User-Role");
  const allowed = ${JSON.stringify(readRoles)};
  if (allowed.length > 0 && !allowed.includes(userRole)) {
    return c.json({ error: "Forbidden - Acesso de leitura negado" }, 403);
  }
  await next();
};

// Endpoints Planos (CRUD)
${tableName}Router.get("/", rbacRead, async (c) => {
  return c.json({ message: "Mock GET list for ${tableName}" });
});

${tableName}Router.post("/", rbacWrite, zValidator("json", ${tableName}InsertSchema), async (c) => {
  return c.json({ message: "Mock POST create for ${tableName}" });
});

${tableName}Router.put("/:id", rbacWrite, zValidator("json", ${tableName}UpdateSchema), async (c) => {
  return c.json({ message: "Mock PUT update for ${tableName}" });
});

${tableName}Router.delete("/:id", rbacWrite, async (c) => {
  return c.json({ message: "Mock DELETE for ${tableName}" });
});
`;
}
