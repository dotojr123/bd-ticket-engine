import "dotenv/config";
import { sign } from "hono/jwt";

export async function mintToken(role: string, sub: string): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Defina JWT_SECRET no seu .env antes de rodar isso (veja .env.example).");
  return sign({ sub, role, exp: Math.floor(Date.now() / 1000) + 3600 }, secret, "HS256");
}

if (require.main === module) {
  const role = process.argv[2] || "user";
  const sub = process.argv[3] || "demo-user";
  mintToken(role, sub).then((token) => {
    console.log(`Token (role=${role}, sub=${sub}, expira em 1h):\n`);
    console.log(token);
  });
}
