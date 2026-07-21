import type { Context, Next } from "hono";
import { checkRateLimit, resetRateLimitCoreState, RateLimitCoreOptions } from "./core/rate-limit-core";

export interface RateLimitOptions extends RateLimitCoreOptions {
  /** Função para derivar a chave de identificação do chamador (default: IP). */
  keyFn?: (c: Context) => string;
}

/**
 * Adapter Hono do núcleo de rate limiting (`core/rate-limit-core.ts`) — só extrai a chave do
 * request e traduz o resultado para `c.json(...)`. Veja `express-adapters.ts` para a mesma
 * lógica plugada em Express, compartilhando os mesmos contadores em memória.
 */
export function rateLimit(opts: RateLimitOptions = {}) {
  const keyFn = opts.keyFn ?? ((c: Context) => c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "unknown");

  return async (c: Context, next: Next) => {
    const result = checkRateLimit(keyFn(c), opts);
    if (!result.allowed) {
      c.header("Retry-After", String(result.retryAfterSec));
      return c.json({ error: "Too Many Requests - limite de requisições excedido" }, 429);
    }
    await next();
  };
}

/** Limpa todos os contadores (uso exclusivo de testes). */
export function resetRateLimitState(): void {
  resetRateLimitCoreState();
}
