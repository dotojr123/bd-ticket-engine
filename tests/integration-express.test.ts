import Database from "better-sqlite3";
import express from "express";
import request from "supertest";
import { sign } from "hono/jwt";
import { createDbClient, setDbClientForTesting } from "../src/lib/runtime/db-client";
import { resetRateLimitState } from "../src/lib/runtime/rate-limit";

process.env.JWT_SECRET = "test-secret-integration-express";

// Router Express gerado por generateExpressRouterString — reaproveita o MESMO crud-engine e o
// mesmo núcleo de auth/rate-limit do router Hono (tests/integration.test.ts), provando em
// execução real (não só em texto gerado) que o motor é portável para outro framework HTTP.
import { test_pedidosRouter } from "../src/contracts/router-express/test_pedidos";
import { test_clientesRouter } from "../src/contracts/router-express/test_clientes";

async function tokenFor(role: string, sub = "user-1"): Promise<string> {
  return sign({ sub, role, exp: Math.floor(Date.now() / 1000) + 3600 }, "test-secret-integration-express", "HS256");
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/test_clientes", test_clientesRouter);
  app.use("/test_pedidos", test_pedidosRouter);
  return app;
}

describe("Integração end-to-end (adapter Express): mesmo crud-engine, framework HTTP diferente", () => {
  let app: express.Express;

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
    const res = await request(app).get("/test_pedidos");
    expect(res.status).toBe(401);
  });

  test("bloqueia papel sem permissão de escrita (403)", async () => {
    const userToken = await tokenFor("user");
    const res = await request(app)
      .post("/test_pedidos")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ status: "pendente" });
    expect(res.status).toBe(403);
  });

  test("cria cliente real via Express + crud-engine", async () => {
    const adminToken = await tokenFor("admin");
    const res = await request(app)
      .post("/test_clientes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nome: "Carla Dias", email: "carla@example.com" });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe("Carla Dias");
  });

  test("rejeita e-mail duplicado com 409 (mesma normalização de erro do adapter Hono)", async () => {
    const adminToken = await tokenFor("admin");
    const res = await request(app)
      .post("/test_clientes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nome: "Duplicado", email: "carla@example.com" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("UNIQUE_VIOLATION");
  });

  test("rejeita pedido com cliente_id inexistente", async () => {
    const parceiroToken = await tokenFor("parceiro");
    const res = await request(app)
      .post("/test_pedidos")
      .set("Authorization", `Bearer ${parceiroToken}`)
      .send({ status: "pendente", cliente_id: 9999 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("FOREIGN_KEY_NOT_FOUND");
  });

  test("cria, lê e atualiza um pedido vinculado a cliente existente", async () => {
    const parceiroToken = await tokenFor("parceiro");

    const createRes = await request(app)
      .post("/test_pedidos")
      .set("Authorization", `Bearer ${parceiroToken}`)
      .send({ status: "pendente", cliente_id: 1 });
    expect(createRes.status).toBe(201);

    const id = createRes.body.id;
    const getRes = await request(app).get(`/test_pedidos/${id}`).set("Authorization", `Bearer ${parceiroToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.cliente_id).toBe(1);

    const putRes = await request(app)
      .put(`/test_pedidos/${id}`)
      .set("Authorization", `Bearer ${parceiroToken}`)
      .send({ status: "concluido" });
    expect(putRes.status).toBe(200);
    expect(putRes.body.status).toBe("concluido");
  });

  test("soft delete em test_clientes via Express", async () => {
    const adminToken = await tokenFor("admin");
    const delRes = await request(app).delete("/test_clientes/1").set("Authorization", `Bearer ${adminToken}`);
    expect(delRes.status).toBe(204);

    const listRes = await request(app).get("/test_clientes").set("Authorization", `Bearer ${adminToken}`);
    expect(listRes.body.data.find((c: any) => c.id === 1)).toBeUndefined();
  });
});
