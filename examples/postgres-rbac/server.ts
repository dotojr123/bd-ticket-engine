import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { tasksRouter } from "./src/contracts/router/tasks";

const app = new Hono();

app.get("/", (c) =>
  c.json({
    message: "BD-Ticket Engine — exemplo postgres-rbac (RBAC + permissão por linha + rate limit).",
    tente: "npm run demo   (roda o roteiro completo automaticamente contra este servidor)"
  })
);

app.route("/tasks", tasksRouter);

const port = Number(process.env.PORT || 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[SERVER] Rodando em http://localhost:${info.port}`);
});
