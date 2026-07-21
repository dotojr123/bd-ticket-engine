import "dotenv/config";
import { sign } from "hono/jwt";

async function main() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("Defina JWT_SECRET no seu .env antes de rodar isso (veja .env.example).");
    process.exit(1);
  }

  const role = process.argv[2] || "admin";
  const token = await sign({ sub: "demo-user", role, exp: Math.floor(Date.now() / 1000) + 3600 }, secret, "HS256");

  console.log(`Token (role=${role}, expira em 1h):\n`);
  console.log(token);
  console.log(`\nUse assim:\ncurl http://localhost:3000/users -H "Authorization: Bearer ${token}"`);
}

main();
