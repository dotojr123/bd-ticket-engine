import { ValidatedMetadata } from "../codegen/metadata-schema";

export interface ColumnSnapshot { type: string; isNullable: boolean; }

export interface ColumnAdded { kind: "column_added"; table: string; column: string; type: string; isNullable: boolean; }
export interface ColumnRemoved { kind: "column_removed"; table: string; column: string; type: string; isNullable: boolean; }
export interface ColumnTypeChanged { kind: "column_type_changed"; table: string; column: string; from: string; to: string; }
export interface TableAdded { kind: "table_added"; table: string; columns: Record<string, ColumnSnapshot>; }
export interface TableRemoved { kind: "table_removed"; table: string; columns: Record<string, ColumnSnapshot>; }

export type MetadataChange = ColumnAdded | ColumnRemoved | ColumnTypeChanged | TableAdded | TableRemoved;

export interface DiffResult {
  changes: MetadataChange[];
  destructive: MetadataChange[];
}

const DESTRUCTIVE_KINDS = new Set(["column_removed", "table_removed", "column_type_changed"]);

/**
 * Compara duas versões do metadata.json (snapshot anterior vs. atual) e produz uma lista
 * estruturada de mudanças físicas de schema, sinalizando quais são potencialmente destrutivas
 * (perda de dados) para que o operador confirme explicitamente antes de aplicar.
 */
export function diffMetadata(previous: ValidatedMetadata | null, current: ValidatedMetadata): DiffResult {
  const changes: MetadataChange[] = [];
  const prevTables = previous?.tables || {};
  const currTables = current.tables || {};

  const toSnapshot = (columns: Record<string, { type: string; isNullable: boolean }>): Record<string, ColumnSnapshot> => {
    const snap: Record<string, ColumnSnapshot> = {};
    for (const [name, def] of Object.entries(columns)) {
      snap[name] = { type: def.type, isNullable: def.isNullable };
    }
    return snap;
  };

  for (const [tableName, tableDef] of Object.entries(currTables)) {
    if (!prevTables[tableName]) {
      changes.push({ kind: "table_added", table: tableName, columns: toSnapshot(tableDef.columns) });
      continue;
    }

    const prevColumns = prevTables[tableName].columns;
    const currColumns = tableDef.columns;

    for (const [colName, colDef] of Object.entries(currColumns)) {
      if (!prevColumns[colName]) {
        changes.push({ kind: "column_added", table: tableName, column: colName, type: colDef.type, isNullable: colDef.isNullable });
        continue;
      }
      if (prevColumns[colName].type !== colDef.type) {
        changes.push({ kind: "column_type_changed", table: tableName, column: colName, from: prevColumns[colName].type, to: colDef.type });
      }
    }

    for (const colName of Object.keys(prevColumns)) {
      if (!currColumns[colName]) {
        changes.push({ kind: "column_removed", table: tableName, column: colName, type: prevColumns[colName].type, isNullable: prevColumns[colName].isNullable });
      }
    }
  }

  for (const [tableName, tableDef] of Object.entries(prevTables)) {
    if (!currTables[tableName]) {
      changes.push({ kind: "table_removed", table: tableName, columns: toSnapshot(tableDef.columns) });
    }
  }

  return {
    changes,
    destructive: changes.filter((c) => DESTRUCTIVE_KINDS.has(c.kind))
  };
}
