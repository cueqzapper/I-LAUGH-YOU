// Rewrite legacy /img/blog/... URLs in blog tables to /blog-images/...
// Usage: node scripts/migrate-blog-image-urls.js <path-to-sqlite>
const Database = require("better-sqlite3");

const dbPath = process.argv[2];
if (!dbPath) {
  console.error("Usage: node migrate-blog-image-urls.js <path-to-sqlite>");
  process.exit(1);
}

const db = new Database(dbPath);
const OLD = "/img/blog/";
const NEW = "/blog-images/";

const tx = db.transaction(() => {
  const r1 = db
    .prepare(
      "UPDATE blog_articles SET hero_image = REPLACE(hero_image, ?, ?) WHERE hero_image LIKE ?"
    )
    .run(OLD, NEW, OLD + "%");
  const r2 = db
    .prepare(
      "UPDATE blog_images SET file_path = REPLACE(file_path, ?, ?) WHERE file_path LIKE ?"
    )
    .run(OLD, NEW, OLD + "%");
  console.log(`blog_articles.hero_image: ${r1.changes} rows updated`);
  console.log(`blog_images.file_path:    ${r2.changes} rows updated`);
});
tx();

db.close();
console.log("Done.");
