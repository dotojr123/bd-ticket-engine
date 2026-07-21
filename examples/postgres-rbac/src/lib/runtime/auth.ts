import type { Context, Next } from "hono";
import { authenticateRequest, AuthPayload } from "./core/auth-core";

export type { AuthPayload };

/**
 * Adapter Hono do núcleo de autenticação (`core/auth-core.ts`) — só extrai o header e traduz o
 * resultado para `c.json(...)`. A verificação de JWT/RBAC em si é agnóstica de framework; veja
 * `express-adapters.ts` para a mesma lógica plugada em Express.
 *
 * `allowedRoles` vazio significa "qualquer usuário autenticado tem acesso" (sem restrição de papel).
 */
export function requireRole(allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const result = await authenticateRequest(c.req.header("Authorization"), allowedRoles);
    if (!result.ok) {
      return c.json({ error: result.error }, result.status);
    }
    c.set("user", result.user);
    await next();
  };
}

/** Recupera o usuário autenticado já validado pelo middleware requireRole. */
export function getAuthUser(c: Context): AuthPayload | null {
  return (c.get("user") as AuthPayload) || null;
}
