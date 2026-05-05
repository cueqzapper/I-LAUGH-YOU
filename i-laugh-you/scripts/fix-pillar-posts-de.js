#!/usr/bin/env node
/**
 * Polishes the German text of the 3 SEO pillar posts inserted by
 * scripts/insert-seo-pillar-posts.js.
 *
 * Applies targeted find-and-replace fixes for:
 *   - the title word "geschnitten" → "zerschnitten" (user correction)
 *   - anglicisms ("Print" → "Druck", "Extension" → "Erweiterung",
 *     "Fokuselement" → "Blickfang", "Farbmatching" → "Farbabstimmung")
 *   - grammar slips ("kein Farbtheorie-Kurs" → "keinen …", "ein von 24.236" → "einer von 24.236")
 *   - awkward phrasings ("bei i-laugh-you" → "auf i-laugh-you" for web UX,
 *     "Siehst zu" → "Sieh zu", "nur versteckter" → "nur verdeckter", etc.)
 *   - intentional voice consistency ("geteilt / unterteilt" → "zerschnitten / zerteilt")
 *
 * The slug stays "…-geschnitten" to preserve URLs.
 * Safe to re-run — every replace is idempotent (second run finds no matches).
 */

const path = require("node:path");
const Database = require("better-sqlite3");

const dbPath =
  process.argv[2] || path.resolve(__dirname, "..", "data", "ily.sqlite");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// [slug, [ [from, to], ... ] ]
const EDITS = {
  "ich-habe-mein-selbstportrait-in-24236-teile-geschnitten": {
    title:
      "Ich habe mein Selbstporträt in 24.236 Teile zerschnitten. Hier ist die Ökonomie dahinter.",
    replacements: [
      ["Preis auf dem Etikett umgedreht", "Preisschilder umgedreht"],
      ["bei i-laugh-you in Echtzeit sichtbar", "auf i-laugh-you in Echtzeit sichtbar"],
      [
        "damit sie sich knapp anfühlt, aber teilbar genug bleibt, um Geld zu verdienen",
        "damit sie sich knapp anfühlt, aber groß genug bleibt, um daran zu verdienen",
      ],
      [
        "die Bevölkerung der Schweizer Gemeinde, in der ich lebe",
        "die Einwohnerzahl der Schweizer Gemeinde, in der ich lebe",
      ],
      [
        "Verknappung in der Kunst ist immer manufakturiert",
        "Verknappung in der Kunst ist immer gemacht",
      ],
      [
        "i-laugh-you ist in dieser Tradition",
        "i-laugh-you steht in dieser Tradition",
      ],
      ["nur digital-nummeriert", "nur digital nummeriert"],
      ["Ein NFT. Ein Print. Ein Original.", "Ein NFT. Ein Druck. Ein Original."],
      [
        "Er hat gemalt für die Reichen und radiert für die Bürger.",
        "Er hat für die Reichen gemalt und für die Bürger radiert.",
      ],
      [
        "Heute funktioniert der Kunstmarkt ähnlich, nur versteckter.",
        "Heute funktioniert der Kunstmarkt ähnlich, nur verdeckter.",
      ],
      ["hergestellt durch Printful", "hergestellt über Printful"],
      [
        "Das ist die Realität jedes Kunstmarktes, nur offenliegend.",
        "Das ist die Realität jedes Kunstmarktes, nur offen gelegt.",
      ],
      [
        "Siehst zu, wie die Kurve sich biegt. Siehst zu, wie",
        "Sieh zu, wie die Kurve sich biegt. Sieh zu, wie",
      ],
    ],
  },

  "nummerierter-kunstdruck-was-auflage-wirklich-bedeutet": {
    replacements: [
      ["&lt;h2&gt;Schnell-Glossar&lt;/h2&gt;", "&lt;h2&gt;Kurzes Glossar&lt;/h2&gt;"],
      ["<h2>Schnell-Glossar</h2>", "<h2>Kurzes Glossar</h2>"],
      [
        "Ein Druck, der direkt vom Künstler-Studio stammt",
        "Ein Druck, der direkt aus dem Atelier des Künstlers stammt",
      ],
      [
        "mein Selbstporträt — geteilt in 24.236 nummerierte Fragmente",
        "mein Selbstporträt — zerschnitten in 24.236 nummerierte Fragmente",
      ],
      [
        "sondern „ein von 24.236 unterschiedlichen Ausschnitten eines einzigen Werks",
        "sondern „einer von 24.236 unterschiedlichen Ausschnitten eines einzigen Werks",
      ],
      [
        "und der Künstler oder Verleger einen Ruf hat, der Konsequenzen hätte bei Regelverstößen",
        "und der Künstler oder Verleger einen Ruf hat, den er bei Regelverstößen verlieren würde",
      ],
    ],
  },

  "kunst-nach-farbe-finden-hex-code": {
    replacements: [
      ["Kunst ist das Fokuselement.", "Kunst ist der Blickfang."],
      [
        "ColorZilla ist eine kostenlose Extension für Chrome und Firefox.",
        "ColorZilla ist eine kostenlose Erweiterung für Chrome und Firefox.",
      ],
      [
        "googel den offiziellen Hex-Code",
        "google den offiziellen Hex-Code",
      ],
      [
        "Du musst kein Farbtheorie-Kurs belegen.",
        "Du musst keinen Farbtheorie-Kurs belegen.",
      ],
      [
        "das in 24.236 Fragmente unterteilt ist",
        "das in 24.236 Fragmente zerteilt ist",
      ],
      [
        "<h2>Wann du Farbmatching komplett ignorieren solltest</h2>",
        "<h2>Wann du Farbabstimmung komplett ignorieren solltest</h2>",
      ],
      [
        "Bevor du klickst: Print der Kandidaten ausdrucken, ans Maß halten.",
        "Bevor du klickst: Kandidaten ausdrucken, ans Maß halten.",
      ],
    ],
  },
};

// ---------------------------------------------------------------------------

const selectBySlug = db.prepare(
  `SELECT id, title, excerpt, content FROM blog_articles WHERE slug = ?`
);
const updateArticle = db.prepare(
  `UPDATE blog_articles SET title = ?, content = ? WHERE id = ?`
);

let totalReplacements = 0;
let titlesUpdated = 0;

for (const [slug, edits] of Object.entries(EDITS)) {
  const row = selectBySlug.get(slug);
  if (!row) {
    console.log(`[miss] no article with slug ${slug}`);
    continue;
  }

  let newTitle = row.title;
  let newContent = row.content;
  let replacementsThisArticle = 0;

  if (edits.title && edits.title !== row.title) {
    newTitle = edits.title;
    titlesUpdated++;
    console.log(`[title] ${slug}`);
    console.log(`   from: ${row.title}`);
    console.log(`   to:   ${newTitle}`);
  }

  for (const [from, to] of edits.replacements) {
    if (newContent.includes(from)) {
      newContent = newContent.split(from).join(to);
      replacementsThisArticle++;
    } else if (newContent.includes(to)) {
      // already applied — idempotent no-op
    } else {
      console.log(`[skip] pattern not found in ${slug}: ${from.slice(0, 60)}...`);
    }
  }

  if (newTitle !== row.title || replacementsThisArticle > 0) {
    updateArticle.run(newTitle, newContent, row.id);
    console.log(
      `[update] ${slug}: title ${newTitle !== row.title ? "CHANGED" : "unchanged"}, ` +
        `${replacementsThisArticle} content replacement(s)`
    );
    totalReplacements += replacementsThisArticle;
  } else {
    console.log(`[noop] ${slug}: already polished.`);
  }
}

console.log(
  `\nDone. Titles updated: ${titlesUpdated}. Total content replacements: ${totalReplacements}.`
);
db.close();
