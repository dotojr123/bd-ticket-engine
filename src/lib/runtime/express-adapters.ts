import type { Request, Response, NextFunction } from "express";
import { authenticateRequest } from "./core/auth-core";
import { checkRateLimit, RateLimitCoreOptions } from "./core/rate-limit-core";

/**
 * Adapter Express dos mesmos núcleos framework-agnósticos usados pelo adapter Hono
 * (`auth.ts`/`rate-limit.ts`). Prova concreta de que a lógica de segurança do motor não está
 * amarrada a um framework HTTP específico — plugar uma nova stack é escrever um adapter fino
 * como este, não reimplementar RBAC/rate limiting do zero.
 */
declare global {
  namespace Express {
    interface Request {
      user?: Record<string, any>;
    }
  }
}

export function requireRoleExpress(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = await authenticateRequest(req.header("Authorization"), allowedRoles);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    req.user = result.user;
    next();
  };
}

export interface ExpressRateLimitOptions extends RateLimitCoreOptions {
  keyFn?: (req: Request) => string;
}

export function rateLimitExpress(opts: ExpressRateLimitOptions = {}) {
  const keyFn = opts.keyFn ?? ((req: Request) => req.header("x-forwarded-for") || req.ip || "unknown");

  return (req: Request, res: Response, next: NextFunction) => {
    const result = checkRateLimit(keyFn(req), opts);
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfterSec));
      res.status(429).json({ error: "Too Many Requests - limite de requisições excedido" });
      return;
    }
    next();
  };
}
