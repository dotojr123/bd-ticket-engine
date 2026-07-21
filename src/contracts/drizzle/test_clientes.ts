import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const test_clientesTable = sqliteTable("test_clientes", {
  deleted_at: text("deleted_at"),
  email: text("email").notNull(),
  id: integer("id").primaryKey(),
  nome: text("nome").notNull(),
});
