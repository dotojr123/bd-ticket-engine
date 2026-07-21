import { verify } from "hono/jwt";

/**
 * Núcleo de autenticação/autorização, sem qualquer dependência de framework HTTP (nenhum import
 * de Hono/Express/Fastify aqui). `hono/jwt` é usado apenas como biblioteca utilitária de
 * verificação de assinatura JWT (HS256), não como framework — os adapters de cada framework em
 * `src/lib/runtime/*.ts` (Hono) e `express-adapters.ts` (Express) chamam esta função e traduzem o
 * resultado para o formato de resposta específico daquele framework. Isso é o que permite plugar
 * o motor em outra stack HTTP sem duplicar a lógica de segurança.
 */
export interface AuthPayload {
  sub?: string;
  role?: string;
  [key: string]: any;
}

export type AuthResult =
  | { ok: true; user: AuthPayload }
  | { ok: false; status: 401 | 403; error: string };

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET não configurado. Defina uma chave secreta forte no ambiente antes de aceitar requisições autenticadas."
    );
  }
  return secret;
}

/**
 * Verifica o header Authorization (Bearer JWT) e checa se o papel do usuário está entre os
 * permitidos. `allowedRoles` vazio significa "qualquer usuário autenticado tem acesso".
 */
export async function authenticateRequest(
  authHeader: string | undefined | null,
  allowedRoles: string[]
): Promise<AuthResult> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized - Token de acesso ausente" };
  }

  const token = authHeader.slice("Bearer ".length);

  let payload: AuthPayload;
  try {
    payload = (await verify(token, getJwtSecret(), "HS256")) as AuthPayload;
  } catch {
    return { ok: false, status: 401, error: "Unauthorized - Token inválido ou expirado" };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role || "")) {
    return { ok: false, status: 403, error: "Forbidden - Papel de acesso insuficiente" };
  }

  return { ok: true, user: payload };
}
