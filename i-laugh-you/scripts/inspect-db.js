const Database = require("better-sqlite3");
const dbPath = process.argv[2] || "/app/data/ily.sqlite";
const db = new Database(dbPath, { readonly: true });
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all();
for (const t of tables) {
  const { n } = db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get();
  console.log(`${t.name}: ${n}`);
}
