import { Hono } from "hono";
import { rateLimit, resetRateLimitState } from "../src/lib/runtime/rate-limit";

describe("Rate Limit Middleware", () => {
  afterEach(() => resetRateLimitState());

  test("permite requisições dentro do limite e bloqueia acima com 429", async () => {
    const app = new Hono();
    app.use("*", rateLimit({ limit: 2, windowMs: 60_000, keyFn: () => "fixed-key" }));
    app.get("/", (c) => c.json({ ok: true }));

    const res1 = await app.request("/");
    const res2 = await app.request("/");
    const res3 = await app.request("/");

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(429);
    expect(res3.headers.get("Retry-After")).toBeTruthy();
  });

  test("chaves diferentes têm contadores independentes", async () => {
    const app = new Hono();
    let counter = 0;
    app.use("*", rateLimit({ limit: 1, windowMs: 60_000, keyFn: () => `key-${counter++}` }));
    app.get("/", (c) => c.json({ ok: true }));

    const res1 = await app.request("/");
    const res2 = await app.request("/");

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});
