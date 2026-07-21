/**
 * Núcleo de rate limiting (janela fixa em memória), sem qualquer dependência de framework HTTP.
 * Os adapters (`rate-limit.ts` para Hono, `express-adapters.ts` para Express) só extraem a chave
 * do request e traduzem o resultado para a resposta HTTP daquele framework.
 */
interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitCoreOptions {
  limit?: number;
  windowMs?: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSec?: number;
}

export function checkRateLimit(key: string, opts: RateLimitCoreOptions = {}): RateLimitCheckResult {
  const limit = opts.limit ?? 100;
  const windowMs = opts.windowMs ?? 60_000;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.windowStart + windowMs - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

/** Limpa todos os contadores (uso exclusivo de testes). */
export function resetRateLimitCoreState(): void {
  buckets.clear();
}
