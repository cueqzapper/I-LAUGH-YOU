// Replace blog_* tables in TARGET with those from SOURCE.
// Leaves all other tables (orders, bids, piece_* etc.) untouched.
// Usage: node merge-blog-tables.js <source.sqlite> <target.sqlite>
const Database = require("better-sqlite3");

const [src, tgt] = process.argv.slice(2);
if (!src || !tgt) {
  console.error("Usage: node merge-blog-tables.js <source.sqlite> <target.sqlite>");
  process.exit(1);
}

const db = new Database(tgt);
db.pragma("busy_timeout=10000");
db.pragma("foreign_keys=OFF");

db.exec(`ATTACH DATABASE '${src.replace(/'/g, "''")}' AS src`);

const TABLES = [
  "blog_images",
  "blog_article_translations",
  "blog_scheduler_log",
  "blog_articles",
];

const tx = db.transaction(() => {
  // Clear target blog tables (order matters: children first)
  for (const t of TABLES) {
    const before = db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get().n;
    db.prepare(`DELETE FROM "${t}"`).run();
    // Reset autoincrement so inserted IDs stay identical to source.
    db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(t);
    console.log(`cleared ${t} (was ${before} rows)`);
  }

  // Insert from source (parents first)
  const INSERT_ORDER = [
    "blog_articles",
    "blog_images",
    "blog_article_translations",
    "blog_scheduler_log",
  ];
  for (const t of INSERT_ORDER) {
    const cols = db
      .prepare(`PRAGMA table_info("${t}")`)
      .all()
      .map((c) => `"${c.name}"`)
      .join(", ");
    const r = db
      .prepare(`INSERT INTO "${t}" (${cols}) SELECT ${cols} FROM src."${t}"`)
      .run();
    console.log(`inserted ${r.changes} rows into ${t}`);
  }
});
tx();

db.exec("DETACH DATABASE src");
db.close();
console.log("Done.");
