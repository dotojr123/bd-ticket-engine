import { newDb } from "pg-mem";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { createDbClient, setDbClientForTesting, PgLikePool } from "../src/lib/runtime/db-client";
import { resetRateLimitState } from "../src/lib/runtime/rate-limit";

process.env.JWT_SECRET = "test-secret-integration-pg";

// Mesmos roteadores gerados usados no teste de integração SQLite — comprovam que o motor
// realmente é agnóstico de dialeto: nenhuma linha de código de rota muda entre os dois testes,
// só o DbClient injetado por baixo (aqui, um Postgres real via protocolo compatível pg-mem,
// sem depender de Docker/servidor).
import { test_pedidosRouter } from "../src/contracts/router/test_pedidos";
import { test_clientesRouter } from "../src/contracts/router/test_clientes";

async function tokenFor(role: string, sub = "user-1"): Promise<string> {
  return sign({ sub, role, exp: Math.floor(Date.now() / 1000) + 3600 }, "test-secret-integration-pg", "HS256");
}

function buildApp(): Hono {
  const app = new Hono();
  app.route("/test_clientes", test_clientesRouter);
  app.route("/test_pedidos", test_pedidosRouter);
  return app;
}

describe("Integração end-to-end (dialeto Postgres real via pg-mem): CRUD sobre o mesmo router gerado", () => {
  let app: Hono;

  beforeAll(() => {
    const mem = newDb();
    mem.public.none(`
      CREATE TABLE test_clientes (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        deleted_at TIMESTAMP
      );
      CREATE TABLE test_pedidos (
        id SERIAL PRIMARY KEY,
        status TEXT NOT NULL,
        cliente_id INTEGER REFERENCES test_clientes(id)
      );
    `);

    const { Pool } = mem.adapters.createPg();
    const pool = new Pool() as unknown as PgLikePool;
    setDbClientForTesting(createDbClient({ driver: "postgres", postgresPool: pool }));
    app = buildApp();
  });

  afterEach(() => {
    resetRateLimitState();
  });

  test("bloqueia requisição sem token (401)", async () => {
    const res = await app.request("/test_pedidos");
    expect(res.status).toBe(401);
  });

  test("cria cliente real via RETURNING * do dialeto Postgres", async () => {
    const adminToken = await tokenFor("admin");
    const res = await app.request("/test_clientes", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Bruno Costa", email: "bruno@example.com" })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.nome).toBe("Bruno Costa");
  });

  test("rejeita e-mail duplicado com 409 usando o código de erro real do Postgres (23505)", async () => {
    const adminToken = await tokenFor("admin");
    const res = await app.request("/test_clientes", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Duplicado", email: "bruno@example.com" })
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("UNIQUE_VIOLATION");
  });

  test("rejeita pedido com cliente_id inexistente (checagem de FK roda igual em ambos os dialetos)", async () => {
    const parceiroToken = await tokenFor("parceiro");
    const res = await app.request("/test_pedidos", {
      method: "POST",
      headers: { Authorization: `Bearer ${parceiroToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pendente", cliente_id: 9999 })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("FOREIGN_KEY_NOT_FOUND");
  });

  test("cria e lê de volta um pedido vinculado a cliente existente, e atualiza via PUT", async () => {
    const parceiroToken = await tokenFor("parceiro");

    const createRes = await app.request("/test_pedidos", {
      method: "POST",
      headers: { Authorization: `Bearer ${parceiroToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pendente", cliente_id: 1 })
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const getRes = await app.request(`/test_pedidos/${created.id}`, { headers: { Authorization: `Bearer ${parceiroToken}` } });
    expect(getRes.status).toBe(200);

    const putRes = await app.request(`/test_pedidos/${created.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${parceiroToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "concluido" })
    });
    expect(putRes.status).toBe(200);
    const updated = await putRes.json();
    expect(updated.status).toBe("concluido");
  });

  test("soft delete em test_clientes usa NOW() do dialeto Postgres e filtra a listagem", async () => {
    const adminToken = await tokenFor("admin");
    const delRes = await app.request("/test_clientes/1", { method: "DELETE", headers: { Authorization: `Bearer ${adminToken}` } });
    expect(delRes.status).toBe(204);

    const listRes = await app.request("/test_clientes", { headers: { Authorization: `Bearer ${adminToken}` } });
    const list = await listRes.json();
    expect(list.data.find((c: any) => c.id === 1)).toBeUndefined();
  });
});
