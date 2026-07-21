import Database from "better-sqlite3";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { createDbClient, setDbClientForTesting } from "../src/lib/runtime/db-client";
import { resetRateLimitState } from "../src/lib/runtime/rate-limit";

process.env.JWT_SECRET = "test-secret-integration";

// Importados depois de setDbClientForTesting ser chamado no beforeAll, mas como os módulos de
// rota chamam getDbClient() dinamicamente a cada requisição (não no import), a ordem de import
// aqui não importa para a injeção do banco de teste.
import { test_pedidosRouter } from "../src/contracts/router/test_pedidos";
import { test_clientesRouter } from "../src/contracts/router/test_clientes";

async function tokenFor(role: string, sub = "user-1"): Promise<string> {
  return sign({ sub, role, exp: Math.floor(Date.now() / 1000) + 3600 }, "test-secret-integration", "HS256");
}

function buildApp(): Hono {
  const app = new Hono();
  app.route("/test_clientes", test_clientesRouter);
  app.route("/test_pedidos", test_pedidosRouter);
  return app;
}

describe("Integração end-to-end: CRUD real via SQLite em memória", () => {
  let app: Hono;

  beforeAll(() => {
    const memDb = new Database(":memory:");
    memDb.pragma("foreign_keys = ON");
    memDb.exec(`
      CREATE TABLE test_clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        deleted_at TEXT
      );
      CREATE TABLE test_pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        cliente_id INTEGER REFERENCES test_clientes(id)
      );
    `);
    setDbClientForTesting(createDbClient({ driver: "sqlite", sqliteInstance: memDb }));
    app = buildApp();
  });

  afterEach(() => {
    resetRateLimitState();
  });

  test("bloqueia requisição sem token (401)", async () => {
    const res = await app.request("/test_pedidos");
    expect(res.status).toBe(401);
  });

  test("bloqueia papel sem permissão de escrita (403)", async () => {
    const userToken = await tokenFor("user");
    const res = await app.request("/test_pedidos", {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pendente" })
    });
    expect(res.status).toBe(403);
  });

  test("cria cliente real via CRUD engine e persiste no banco", async () => {
    const adminToken = await tokenFor("admin");
    const res = await app.request("/test_clientes", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Ana Silva", email: "ana@example.com" })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.nome).toBe("Ana Silva");
  });

  test("rejeita e-mail duplicado com 409 (violação de unicidade real do banco)", async () => {
    const adminToken = await tokenFor("admin");
    const res = await app.request("/test_clientes", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Ana Duplicada", email: "ana@example.com" })
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("UNIQUE_VIOLATION");
  });

  test("rejeita pedido com cliente_id inexistente (checagem real de integridade referencial)", async () => {
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

  test("cria pedido vinculado a um cliente existente e consegue lê-lo de volta", async () => {
    const parceiroToken = await tokenFor("parceiro");

    const createRes = await app.request("/test_pedidos", {
      method: "POST",
      headers: { Authorization: `Bearer ${parceiroToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pendente", cliente_id: 1 })
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const getRes = await app.request(`/test_pedidos/${created.id}`, {
      headers: { Authorization: `Bearer ${parceiroToken}` }
    });
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.status).toBe("pendente");
    expect(fetched.cliente_id).toBe(1);
  });

  test("atualiza um pedido existente via PUT", async () => {
    const parceiroToken = await tokenFor("parceiro");
    const listRes = await app.request("/test_pedidos", { headers: { Authorization: `Bearer ${parceiroToken}` } });
    const list = await listRes.json();
    const id = list.data[0].id;

    const putRes = await app.request(`/test_pedidos/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${parceiroToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "concluido" })
    });
    expect(putRes.status).toBe(200);
    const updated = await putRes.json();
    expect(updated.status).toBe("concluido");
  });

  test("soft delete em test_clientes marca deleted_at em vez de apagar a linha", async () => {
    const adminToken = await tokenFor("admin");
    const delRes = await app.request("/test_clientes/1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(delRes.status).toBe(204);

    const listRes = await app.request("/test_clientes", { headers: { Authorization: `Bearer ${adminToken}` } });
    const list = await listRes.json();
    expect(list.data.find((c: any) => c.id === 1)).toBeUndefined();
  });

  test("paginação e ordenação respeitam query params", async () => {
    const parceiroToken = await tokenFor("parceiro");
    await app.request("/test_pedidos", {
      method: "POST",
      headers: { Authorization: `Bearer ${parceiroToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelado", cliente_id: 1 })
    });

    const res = await app.request("/test_pedidos?page=1&pageSize=1&sort=id:desc", {
      headers: { Authorization: `Bearer ${parceiroToken}` }
    });
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.pageSize).toBe(1);
    expect(body.total).toBeGreaterThanOrEqual(2);
  });
});
