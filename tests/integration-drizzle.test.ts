import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { generateDrizzleSchemaString } from "../src/lib/codegen/drizzle-generator";
import { test_clientesTable } from "../src/contracts/drizzle/test_clientes";
import { test_pedidosTable } from "../src/contracts/drizzle/test_pedidos";

describe("Camada de dados tipada via Drizzle ORM (gerada a partir do metadata.json)", () => {
  test("generateDrizzleSchemaString produz um schema sqlite válido e idempotente", () => {
    const columns = {
      id: { type: "integer", isNullable: false, isPrimaryKey: true },
      nome: { type: "text", isNullable: false, isPrimaryKey: false },
      ativo: { type: "boolean", isNullable: true, isPrimaryKey: false }
    };

    const first = generateDrizzleSchemaString("clientes", columns, "sqlite");
    const second = generateDrizzleSchemaString("clientes", columns, "sqlite");

    expect(first).toBe(second);
    expect(first).toContain('sqliteTable("clientes"');
    expect(first).toContain("id: integer(\"id\").primaryKey()");
    expect(first).toContain("nome: text(\"nome\").notNull()");
    expect(first).toContain('ativo: integer("ativo", { mode: "boolean" })');
  });

  test("produz também um schema Postgres válido para a mesma tabela", () => {
    const columns = {
      id: { type: "integer", isNullable: false, isPrimaryKey: true },
      criado_em: { type: "timestamp without time zone", isNullable: true, isPrimaryKey: false },
      email: { type: "text", isNullable: false, isPrimaryKey: false }
    };
    const result = generateDrizzleSchemaString("clientes", columns, "postgres");
    expect(result).toContain('pgTable("clientes"');
    expect(result).toContain('criado_em: timestamp("criado_em")');
    expect(result).toContain('email: text("email").notNull()');
  });

  test("o schema Drizzle gerado executa queries tipadas reais contra dados reais em SQLite", () => {
    const rawDb = new Database(":memory:");
    rawDb.pragma("foreign_keys = ON");
    rawDb.exec(`
      CREATE TABLE test_clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        deleted_at TEXT
      );
      CREATE TABLE test_pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        cliente_id INTEGER REFERENCES test_clientes(id)
      );
    `);

    const db = drizzle(rawDb);

    // Insert tipado real (o compilador rejeitaria um campo inexistente ou de tipo errado aqui)
    const [cliente] = db
      .insert(test_clientesTable)
      .values({ nome: "Diego Rocha", email: "diego@example.com" })
      .returning()
      .all();
    expect(cliente.id).toBeDefined();
    expect(cliente.nome).toBe("Diego Rocha");

    db.insert(test_pedidosTable).values({ status: "pendente", cliente_id: cliente.id }).run();

    const pedidos = db.select().from(test_pedidosTable).where(eq(test_pedidosTable.cliente_id, cliente.id)).all();
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].status).toBe("pendente");

    rawDb.close();
  });
});
