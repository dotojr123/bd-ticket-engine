/**
 * Superfície pública de biblioteca do BD-Ticket Engine (uso via `import`/`require`, dual CJS/ESM).
 * Os CLIs (extract/codegen/validate/migrate) continuam sendo o modo de uso primário via `bin`;
 * este entrypoint existe para quem quer compor o runtime programaticamente (ex.: montar um
 * DbClient customizado, ou chamar o crud-engine fora do router gerado).
 *
 * Não exporta nada de `src/contracts/` — aqueles são os contratos de EXEMPLO deste repositório,
 * não algo que faça sentido publicar como parte da biblioteca para um consumidor genérico.
 */

// Runtime: camada de dados real, auth/RBAC, rate limiting, auditoria
export * from "./lib/runtime/db-client";
export * from "./lib/runtime/crud-engine";
export * from "./lib/runtime/auth";
export * from "./lib/runtime/rate-limit";
export * from "./lib/runtime/audit-log";
export * from "./lib/runtime/core/auth-core";
export * from "./lib/runtime/core/rate-limit-core";

// Drivers de extração de schema
export * from "./lib/db/postgres";
export * from "./lib/db/d1";
export * from "./lib/db/types";

// Codegen programático (para quem quer gerar código fora do CLI)
export * from "./lib/codegen/zod-mapper";
export * from "./lib/codegen/types-generator";
export * from "./lib/codegen/router-generator";
export * from "./lib/codegen/hooks-generator";
export * from "./lib/codegen/metadata-schema";
export * from "./lib/codegen/drizzle-generator";

// Migrações
export * from "./lib/migrations/differ";
export * from "./lib/migrations/sql-generator";
