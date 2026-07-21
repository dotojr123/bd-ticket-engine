CREATE TABLE "test_clientes" (
  "deleted_at" text,
  "email" text NOT NULL,
  "id" integer,
  "nome" text NOT NULL
);

CREATE TABLE "test_pedidos" (
  "cliente_id" integer,
  "id" integer,
  "status" text NOT NULL
);
