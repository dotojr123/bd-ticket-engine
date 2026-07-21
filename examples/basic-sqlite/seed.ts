import Database from "better-sqlite3";
import * as fs from "fs";

const DB_PATH = "local.db";

if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ativo'
  );
`);
db.close();

console.log(`[SEED] Banco criado em ${DB_PATH} com a tabela 'users' vazia.`);
