import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { usersRouter } from "./src/contracts/router/users";

const app = new Hono();

app.get("/", (c) =>
  c.json({
    message: "BD-Ticket Engine — exemplo basic-sqlite rodando de verdade.",
    tente: [
      "npm run token   (gera um JWT de admin para usar nos exemplos abaixo)",
      "curl http://localhost:3000/users -H \"Authorization: Bearer <token>\"",
      "curl -X POST http://localhost:3000/users -H \"Authorization: Bearer <token>\" -H \"Content-Type: application/json\" -d '{\"nome\":\"Ana\",\"email\":\"ana@example.com\",\"status\":\"ativo\"}'"
    ]
  })
);

app.route("/users", usersRouter);

const port = Number(process.env.PORT || 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[SERVER] Rodando em http://localhost:${info.port}`);
});
