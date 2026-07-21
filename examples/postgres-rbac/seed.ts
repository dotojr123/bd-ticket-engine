import Database from "better-sqlite3";
import * as fs from "fs";

const DB_PATH = "local.db";
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    owner_id TEXT NOT NULL
  );
`);
db.close();

console.log("[SEED] Banco criado em local.db com a tabela 'tasks' vazia.");
