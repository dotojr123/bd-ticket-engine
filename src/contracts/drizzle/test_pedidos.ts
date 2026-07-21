import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const test_pedidosTable = sqliteTable("test_pedidos", {
  cliente_id: integer("cliente_id"),
  id: integer("id").primaryKey(),
  status: text("status").notNull(),
});
