jest.mock("pg", () => {
  const connect = jest.fn().mockResolvedValue(undefined);
  const end = jest.fn().mockResolvedValue(undefined);
  const query = jest.fn();
  return { Client: jest.fn().mockImplementation(() => ({ connect, query, end })) };
});

import { Client } from "pg";
import { extractPostgresSchema } from "../src/lib/db/postgres";

function rows(r: any[]) {
  return { rows: r };
}

describe("extractPostgresSchema (driver Postgres, pg mockado — sem servidor real)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("monta o catálogo completo a partir das 7 queries fixas (tabelas, colunas, comentários, PK, UNIQUE, FK)", async () => {
    const mockClient = new (Client as any)();

    mockClient.query.mockImplementation((sql: string) => {
      if (sql.includes("FROM information_schema.tables")) {
        return rows([{ table_name: "clientes" }, { table_name: "pedidos" }]);
      }
      if (sql.includes("FROM information_schema.columns")) {
        return rows([
          { table_name: "clientes", column_name: "id", data_type: "integer", is_nullable: "NO" },
          { table_name: "clientes", column_name: "email", data_type: "text", is_nullable: "NO" },
          { table_name: "pedidos", column_name: "id", data_type: "integer", is_nullable: "NO" },
          { table_name: "pedidos", column_name: "cliente_id", data_type: "integer", is_nullable: "YES" }
        ]);
      }
      if (sql.includes("pg_catalog.pg_attribute")) {
        return rows([
          { table_name: "pedidos", column_name: "cliente_id", comment: JSON.stringify({ metadata: { label: "Cliente" } }) }
        ]);
      }
      if (sql.includes("pg_catalog.obj_description")) {
        return rows([{ table_name: "pedidos", comment: JSON.stringify({ options: { soft_delete: true } }) }]);
      }
      if (sql.includes("PRIMARY KEY")) {
        return rows([
          { table_name: "clientes", column_name: "id" },
          { table_name: "pedidos", column_name: "id" }
        ]);
      }
      if (sql.includes("'UNIQUE'")) {
        return rows([{ table_name: "clientes", column_name: "email" }]);
      }
      if (sql.includes("FOREIGN KEY")) {
        return rows([
          { table_name: "pedidos", column_name: "cliente_id", ref_table: "clientes", ref_column: "id", delete_rule: "CASCADE" }
        ]);
      }
      throw new Error(`Query inesperada no teste: ${sql}`);
    });

    const schema = await extractPostgresSchema("postgres://fake-connection-string");

    expect(mockClient.connect).toHaveBeenCalled();
    expect(mockClient.end).toHaveBeenCalled();

    expect(schema.clientes.columns.id.isPrimaryKey).toBe(true);
    expect(schema.clientes.columns.email.isNullable).toBe(false);

    const fk = schema.pedidos.columns.cliente_id;
    expect(fk.isForeignKey).toBe(true);
    expect(fk.references).toBe("clientes.id");
    expect(fk.onDelete).toBe("CASCADE");
    // cliente_id não está entre as colunas UNIQUE retornadas (só clientes.email está) => many-to-one
    expect(fk.cardinality).toBe("many-to-one");
    expect(fk.metadata.label).toBe("Cliente");

    expect(schema.pedidos.options).toEqual({ soft_delete: true });
  });

  test("trata comentário JSON malformado marcando _invalid_json em vez de quebrar a extração", async () => {
    const mockClient = new (Client as any)();
    mockClient.query.mockImplementation((sql: string) => {
      if (sql.includes("FROM information_schema.tables")) return rows([{ table_name: "t" }]);
      if (sql.includes("FROM information_schema.columns")) {
        return rows([{ table_name: "t", column_name: "c", data_type: "text", is_nullable: "YES" }]);
      }
      if (sql.includes("pg_catalog.pg_attribute")) {
        return rows([{ table_name: "t", column_name: "c", comment: "{ isso não é json" }]);
      }
      return rows([]);
    });

    const schema = await extractPostgresSchema("postgres://fake");
    expect(schema.t.columns.c.metadata._invalid_json).toBe(true);
  });

  test("encerra a conexão mesmo se uma query falhar no meio da extração", async () => {
    const mockClient = new (Client as any)();
    mockClient.query.mockRejectedValueOnce(new Error("conexão recusada"));

    await expect(extractPostgresSchema("postgres://fake")).rejects.toThrow("conexão recusada");
    expect(mockClient.end).toHaveBeenCalled();
  });
});
