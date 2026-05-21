const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

const db = new Database(path.resolve(__dirname, "..", "data", "ily.sqlite"));

const upsert = db.prepare(`
  INSERT INTO blog_article_translations (
    article_id, language, title, slug, excerpt, content, created_at
  )
  VALUES (@article_id, @language, @title, @slug, @excerpt, @content, CURRENT_TIMESTAMP)
  ON CONFLICT (article_id, language) DO UPDATE SET
    title = excluded.title,
    slug = excluded.slug,
    excerpt = excluded.excerpt,
    content = excluded.content;
`);

const transDir = path.resolve(__dirname, "translations");
const files = fs.readdirSync(transDir).filter((f) => f.endsWith(".json"));

let count = 0;
const errors = [];

for (const file of files) {
  const m = file.match(/^article-(\d+)-(en|es|fr)\.json$/);
  if (!m) {
    errors.push(`Skipped (bad name): ${file}`);
    continue;
  }
  const articleId = parseInt(m[1], 10);
  const language = m[2];
  const full = path.join(transDir, file);

  try {
    const raw = fs.readFileSync(full, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.title || !parsed.content) {
      errors.push(`Missing title/content: ${file}`);
      continue;
    }
    const slug = slugify(parsed.title);
    upsert.run({
      article_id: articleId,
      language,
      title: parsed.title,
      slug,
      excerpt: parsed.excerpt ?? "",
      content: parsed.content,
    });
    count++;
    console.log(`✓ ${file} → article ${articleId} / ${language}`);
  } catch (err) {
    errors.push(`Failed ${file}: ${err.message}`);
  }
}

console.log(`\nInserted/updated ${count} translations`);
if (errors.length) {
  console.log("\nErrors:");
  errors.forEach((e) => console.log("  - " + e));
  process.exit(1);
}
