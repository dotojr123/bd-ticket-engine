import { diffMetadata } from "../src/lib/migrations/differ";
import { generateMigrationScript } from "../src/lib/migrations/sql-generator";
import { ValidatedMetadata } from "../src/lib/codegen/metadata-schema";

function meta(tables: ValidatedMetadata["tables"]): ValidatedMetadata {
  return { project: "Test", version: "1.0.0", tables };
}

describe("Migrations: differ + sql-generator", () => {
  test("detecta tabela nova e gera CREATE TABLE / DROP TABLE", () => {
    const previous = meta({});
    const current = meta({
      clientes: {
        columns: {
          id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, metadata: {} },
          nome: { type: "text", isNullable: false, isPrimaryKey: false, isForeignKey: false, metadata: {} }
        }
      }
    });

    const diff = diffMetadata(previous, current);
    expect(diff.changes).toHaveLength(1);
    expect(diff.changes[0].kind).toBe("table_added");
    expect(diff.destructive).toHaveLength(0);

    const script = generateMigrationScript(diff.changes, "sqlite");
    expect(script.up).toContain('CREATE TABLE "clientes"');
    expect(script.up).toContain('"nome" text NOT NULL');
    expect(script.down).toContain('DROP TABLE "clientes"');
  });

  test("detecta coluna removida como mudança destrutiva", () => {
    const previous = meta({
      clientes: {
        columns: {
          id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, metadata: {} },
          telefone: { type: "text", isNullable: true, isPrimaryKey: false, isForeignKey: false, metadata: {} }
        }
      }
    });
    const current = meta({
      clientes: {
        columns: {
          id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, metadata: {} }
        }
      }
    });

    const diff = diffMetadata(previous, current);
    expect(diff.changes).toHaveLength(1);
    expect(diff.changes[0].kind).toBe("column_removed");
    expect(diff.destructive).toHaveLength(1);

    const script = generateMigrationScript(diff.changes, "postgres");
    expect(script.up).toContain('DROP COLUMN "telefone"');
    expect(script.up).toContain("ATENÇÃO");
    expect(script.down).toContain('ADD COLUMN "telefone" text');
  });

  test("coluna nova não é destrutiva e é reversível", () => {
    const previous = meta({
      clientes: { columns: { id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, metadata: {} } } }
    });
    const current = meta({
      clientes: {
        columns: {
          id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, metadata: {} },
          email: { type: "text", isNullable: true, isPrimaryKey: false, isForeignKey: false, metadata: {} }
        }
      }
    });

    const diff = diffMetadata(previous, current);
    expect(diff.destructive).toHaveLength(0);
    const script = generateMigrationScript(diff.changes, "sqlite");
    expect(script.up).toContain('ADD COLUMN "email" text');
    expect(script.down).toContain('DROP COLUMN "email"');
  });

  test("sem diferenças não gera nenhuma mudança", () => {
    const snapshot = meta({
      clientes: { columns: { id: { type: "integer", isNullable: false, isPrimaryKey: true, isForeignKey: false, metadata: {} } } }
    });
    const diff = diffMetadata(snapshot, snapshot);
    expect(diff.changes).toHaveLength(0);
  });
});
