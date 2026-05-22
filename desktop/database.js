const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

function createDesktopDatabase(userDataPath) {
  const dataDir = path.join(userDataPath, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "ledger.sqlite");
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    create table if not exists app_kv (
      key text primary key,
      value text not null,
      updated_at text not null default current_timestamp
    );
  `);

  const getStmt = db.prepare("select value from app_kv where key = ?");
  const setStmt = db.prepare(`
    insert into app_kv (key, value, updated_at)
    values (?, ?, current_timestamp)
    on conflict(key) do update set value = excluded.value, updated_at = current_timestamp
  `);

  const get = (key, fallback = null) => {
    const row = getStmt.get(key);
    if (!row) return fallback;
    return row.value;
  };

  const set = (key, value) => setStmt.run(key, value);

  const getJson = (key, fallback) => {
    try {
      const value = get(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const setJson = (key, value) => set(key, JSON.stringify(value));

  const getMachineCode = () => {
    let code = get("machineCode");
    if (!code) {
      code = crypto.randomBytes(10).toString("hex").toUpperCase();
      set("machineCode", code);
    }
    return code;
  };

  return {
    dbPath,
    close: () => db.close(),
    get,
    set,
    getJson,
    setJson,
    getMachineCode,
  };
}

module.exports = { createDesktopDatabase };
