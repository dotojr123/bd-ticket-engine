import "dotenv/config";
import { mintToken } from "./mint-token";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

async function call(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) }
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function main() {
  console.log("=== BD-Ticket Engine — demo de RBAC + permissão por linha + rate limit ===\n");

  const aliceToken = await mintToken("user", "alice");
  const bobToken = await mintToken("user", "bob");
  const adminToken = await mintToken("admin", "carla");

  console.log("1) Alice (role=user) cria uma tarefa sem informar owner_id — o motor atribui automaticamente:");
  const aliceTask = await call(aliceToken, "/tasks", { method: "POST", body: JSON.stringify({ titulo: "Tarefa da Alice", status: "pendente" }) });
  console.log("   =>", aliceTask.status, aliceTask.body, "\n");

  console.log("2) Bob (role=user) cria a dele:");
  const bobTask = await call(bobToken, "/tasks", { method: "POST", body: JSON.stringify({ titulo: "Tarefa do Bob", status: "pendente" }) });
  console.log("   =>", bobTask.status, bobTask.body, "\n");

  console.log("3) Alice lista /tasks — permissão em nível de linha: só vê a própria (owner_field=owner_id):");
  const aliceList = await call(aliceToken, "/tasks");
  console.log("   =>", aliceList.body, "\n");

  console.log("4) Bob lista /tasks — só vê a dele:");
  const bobList = await call(bobToken, "/tasks");
  console.log("   =>", bobList.body, "\n");

  console.log("5) Carla (role=admin) lista /tasks — admin ignora o filtro de dono, vê todas:");
  const adminList = await call(adminToken, "/tasks");
  console.log("   =>", adminList.body, "\n");

  console.log("6) Rate limiting: disparando 105 requisições rápidas como Alice (limite default = 100/min por chamador)...");
  let okCount = 0;
  let rateLimited = 0;
  for (let i = 0; i < 105; i++) {
    const res = await call(aliceToken, "/tasks");
    if (res.status === 429) rateLimited++;
    else okCount++;
  }
  console.log(`   => ${okCount} passaram, ${rateLimited} bloqueadas com 429 Too Many Requests\n`);

  console.log("=== Fim do demo ===");
}

main().catch((err) => {
  console.error("Falha ao rodar o demo — o servidor está no ar? (npm run dev em outro terminal)");
  console.error(err.message);
  process.exit(1);
});
