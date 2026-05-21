const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const db = new Database(path.resolve(__dirname, "..", "data", "ily.sqlite"), {
  readonly: true,
});

const articles = db
  .prepare(
    "SELECT id, slug, title, excerpt, content FROM blog_articles ORDER BY id"
  )
  .all();

const outDir = path.resolve(__dirname, "sources");
for (const a of articles) {
  fs.writeFileSync(
    path.join(outDir, `article-${a.id}.json`),
    JSON.stringify(a, null, 2),
    "utf8"
  );
}

console.log(`Exported ${articles.length} articles to ${outDir}`);
