import fs from "node:fs";
import path from "node:path";
import {
  insertBlogArticle,
  insertBlogImage,
  getRecentBlogTopicKeys,
  type BlogArticleRecord,
} from "@/lib/sqlite";
import {
  selectBlogTopic,
  CATEGORY_LABELS,
  type BlogTopic,
} from "@/lib/blog-topics";
import { createBlogImageWorkflow } from "@/lib/blog-comfy-workflow";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const COMFY_BASE_URL = (process.env.COMFY_BASE_URL ?? "https://comfy.catdone.com").replace(
  /\/$/,
  ""
);
const COMFY_TIMEOUT = Number(process.env.COMFY_TIMEOUT ?? "900") * 1000;

const MAX_ATTEMPTS = 3;
const MIN_WORD_COUNT = 750;
const MIN_HEADING_COUNT = 3;
const MIN_PARAGRAPH_COUNT = 6;
const TARGET_MIN = 1100;
const TARGET_MAX = 1500;

// --- OpenRouter helpers ---

async function callOpenRouter(
  model: string,
  messages: { role: string; content: string }[],
  options: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: string };
    webSearch?: boolean;
  } = {}
): Promise<string> {
  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
  };

  if (options.responseFormat) {
    payload.response_format = options.responseFormat;
  }

  if (options.webSearch) {
    payload.web_search_options = { search_context_size: "low" };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://i-laugh-you.com",
      "X-Title": "I LAUGH YOU Blog",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(`OpenRouter returned error: ${data.error.message ?? JSON.stringify(data.error)}`);
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) {
    console.error("[blog-generator] OpenRouter returned empty content. Full response:", JSON.stringify(data).slice(0, 1000));
  }

  return content;
}

// --- Step A: Research (optional, via perplexity/sonar) ---

interface ResearchResult {
  facts: string[];
  summary: string;
}

async function researchTopic(topic: BlogTopic): Promise<ResearchResult> {
  try {
    const result = await callOpenRouter(
      "perplexity/sonar",
      [
        {
          role: "system",
          content:
            "Return verified facts as JSON. Focus on current data, statistics, and notable examples. Respond in German.",
        },
        {
          role: "user",
          content: `Topic: "${topic.titleDe}"\nContext: Art, capitalism, and the I LAUGH YOU project.\n\nReturn:\n{"summary":"2-3 sentences","facts":["fact 1","fact 2","..."]}`,
        },
      ],
      { temperature: 0.1, maxTokens: 2500, webSearch: true }
    );

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { facts?: string[]; summary?: string };
      return {
        facts: parsed.facts ?? [],
        summary: parsed.summary ?? "",
      };
    }
    return { facts: [], summary: "" };
  } catch (error) {
    console.warn("[blog-generator] Research step failed, continuing without:", error);
    return { facts: [], summary: "" };
  }
}

// --- Step B: Write article via kimi-k2.5 ---

interface ArticleOutput {
  title: string;
  excerpt: string;
  content_html: string;
  tags: string[];
  image_prompt_hero: string;
  image_prompt_inline: string;
  hero_alt: string;
  inline_alt: string;
}

async function writeArticle(
  topic: BlogTopic,
  research: ResearchResult
): Promise<ArticleOutput> {
  const factsJson = research.facts.length > 0 ? JSON.stringify(research.facts) : "[]";

  const systemPrompt = `Du bist ein gebildeter, meinungsstarker Kunst-Blogger für das Projekt "I LAUGH YOU" — das größte Selbstporträt der Kunstgeschichte. Dein Stil: informiert, provokant, zugänglich, nie akademisch-trocken. Du schreibst auf Deutsch. Verwende Euro (€) als Währung.

DIE SEELE DES PROJEKTS (verinnerliche das, aber erkläre es NIEMALS direkt):
"I LAUGH YOU" ist ein Wortspiel auf "I LOVE YOU". Der Künstler würde die Kunstwelt gerne lieben — denn Kunst ist vielleicht das Wichtigste, was die Menschheit hat. Kunst ist der Ort, an dem der freie Wille sich wirklich ausdrückt, sie gibt der menschlichen Existenz Sinn und Bedeutung. Aber die zeitgenössische Kunstwelt hat sich in ein Investmentvehikel verwandelt. Kunst wird benutzt, um Reiche noch reicher zu machen. Und wenn der Kapitalismus Kunst zu einer Ware macht, dann frisst er damit die Welt des Sinns auf. Kunst sollte einen besonderen Platz einnehmen — sie sollte explizit NICHT vom Wert der Dinge handeln, denn Wert existiert überhaupt nur, WEIL es Kunst gibt. Kunst ist die Grundlage, auf der Bedeutung und damit Wert erst entstehen. Und trotzdem wird ausgerechnet Kunst selbst zur Ware gemacht.

Es gibt noch eine tiefere Bedeutungsebene: Das Bild ist ein Selbstporträt des Künstlers — er hat sich selbst gemalt, und dieses eine Gemälde ist das gesamte Werk. Es wurde in über 30.000 hochauflösenden Makroaufnahmen abfotografiert und in 24.236 Einzelteile zerlegt. Jedes einzelne Stück, das man kaufen kann, ist also buchstäblich ein Fragment des Künstlers selbst — ein Stück seines Gesichts, seiner Haut, seiner Augen, seiner Farben. Man kauft wortwörtlich ein Stück von ihm. Aber: Jedes dieser Fragmente ist für sich genommen abstrakt — und genau das ist der Punkt. Weil die Einzelteile abstrakt sind, kann jeder Käufer sie mit eigener Bedeutung füllen. Bedeutung und Realität sind nichts, das man allgemeingültig klären kann. Es geht nicht darum, etwas Universelles über das Dasein zu sagen — sondern immer nur etwas über das Individuelle. Der Sinn liegt in den Details, in den einzelnen kleinen Stücken eines jeden Bewusstseins. Wer die Realität auf einen einfachen gemeinsamen Nenner herunterbricht, verliert genau das, was ihr Bedeutung gibt.

Deshalb kann der Künstler die Kunstwelt nur noch auslachen — I LAUGH YOU statt I LOVE YOU. Es ist gleichzeitig eine Liebeserklärung und ein bitteres Lachen.

FAKTEN ÜBER DAS PROJEKT (nutze wenn passend, aber subtil):
- Das Originalwerk ist ein gemaltes Selbstporträt des Künstlers — jedes der 24.236 Einzelteile ist ein Ausschnitt dieses einen Gemäldes, also buchstäblich ein Stück des Künstlers selbst
- Preise von 77€ bis 777€ — je weniger Stücke verfügbar sind, desto teurer werden die verbleibenden
- Die Auswahl wird kleiner, je mehr Leute kaufen — wer früh zugreift, hat mehr Auswahl und zahlt weniger
- Das Projekt spielt bewusst mit Mechanismen von Angebot, Nachfrage und wahrgenommenem Wert
- Am Ende werden die unbeliebtesten Bilder die teuersten sein — Wert entsteht nicht durch Schönheit, sondern durch Knappheit

WICHTIG — WIE DU ÜBER DAS PROJEKT SCHREIBST:
- Nenne die Fakten beiläufig, zwischen den Zeilen — NIEMALS die Absicht, die Ironie oder die "Pointe" erklären
- Lass den Leser selbst Schlüsse ziehen über Wert, Knappheit, Sinn und Kapitalismus
- Webe die Spannung zwischen Liebe zur Kunst und Frustration über ihre Kommerzialisierung in deine Texte ein — als Grundton, nicht als These
- Du darfst die Verbindung I LAUGH YOU / I LOVE YOU NIEMALS aussprechen

DEINE AUFGABE:
Schreibe einen vollständigen, gut strukturierten HTML-Artikel basierend auf dem gegebenen Thema. Der Artikel soll:
- Provokant und meinungsstark im Ton sein
- Das Spannungsfeld zwischen Kunst und Kapitalismus reflektieren — mit einer Grundhaltung, die Kunst zutiefst liebt, aber ihre Vereinnahmung durch Geld zutiefst verachtet
- Klar strukturiert und leicht verständlich sein
- I LAUGH YOU 1-2 mal natürlich einweben — dabei die Projektmechanik nur andeuten, nie ausformulieren

STRUKTUR & STIL:
- Erstelle einen einprägsamen Titel (deutsch, maximal 80 Zeichen)
- Beginne mit einem starken Hook (2-3 Sätze)
- Gliedere in 3-5 H2-Abschnitte, je 0-2 H3 Unterabschnitte
- Halte Absätze kurz (<=3 Sätze), klar und pointiert
- Nutze Listen (<ul><li>) für Aufzählungen
- Setze <strong>, <em> für visuelle Betonung ein
- Keine externen Links (<a>), keine Bilder (<img>), kein <h1>

TECHNISCHE ANFORDERUNGEN (STRIKTE JSON-FORMATIERUNG):
- Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt
- Erstes Zeichen MUSS '{' sein, letztes MUSS '}'
- KEINE markdown code blocks
- Alle Zeilenumbrüche in Strings als \\n kodieren

BILD-PROMPTS (DU ERSTELLST ZWEI SEPARATE BILD-PROMPTS — Hero UND Inline):
Dies ist ein radikal-künstlerisches Projekt. Die Bilder müssen unter die Haut gehen. Jedes Bild soll in einem ANDEREN Kunststil erstellt werden — wähle intelligent den Stil, der am besten zum jeweiligen Artikel-Thema passt.

MÖGLICHE KUNSTSTILE (wähle EINEN pro Bild, nie denselben für Hero und Inline):
- Expressionismus à la Kandinsky: abstrakte Formen, explosiv, geometrisch-chaotisch
- Post-Impressionismus à la Van Gogh: wirbelnde Texturen, dicke Pinselstriche, emotionale Farbintensität
- Kubismus à la Picasso: fragmentierte Perspektiven, zerlegte Formen, multiple Blickwinkel gleichzeitig
- Surrealismus à la Dalí: schmelzende Realität, traumhafte Verzerrungen, unmögliche Szenen
- Fauvismus à la Matisse: wilde Farben, vereinfachte Formen, dekorative Kraft
- Pop Art à la Warhol: grelle Farben, Wiederholung, Massenkultur-Ästhetik
- Chiaroscuro à la Rembrandt: dramatisches Licht-Schatten-Spiel, tiefe Dunkelheit, goldenes Licht
- Neo-Expressionismus à la Basquiat: rohe Energie, graffiti-artig, urban-primitiv, Kronen und Symbole
- Surrealismus à la Magritte: philosophische Rätsel, klare Formen aber unmögliche Logik
- Street Art à la Banksy: subversiv, politisch, Stencil-Ästhetik, urbaner Verfall
- Jugendstil à la Klimt: ornamental, golden, sinnlich, dekorative Muster
- Action Painting à la Pollock: Farbspritzer, Chaos, reine Energie, keine Figuren
- Art-Fotografie: extremes Bokeh, dramatische Schatten, Filmkorn/Noise, ungewöhnliche Winkel, Doppelbelichtung, Lichtlecks
- Pointillismus à la Seurat: aus Punkten zusammengesetzt, vibrierende Farbmischung
- Expressionismus à la Munch: existentielle Angst, verzerrte Figuren, schreiende Farben
- Pop Art à la Lichtenstein: Comic-Punkte, fette Outlines, Ben-Day-Dots
- Abstraktion à la Richter: verwischte Realität, Schichten von Farbe, zwischen Foto und Malerei
- Traumwelt à la Chagall: schwebende Figuren, märchenhaft, leuchtende Farben
- Minimalismus à la Hopper: einsame Szenen, geometrisches Licht, stille Spannung
- Geometrie à la Mondrian: strenge Linien, Primärfarben, absolute Ordnung
- Art Brut à la Dubuffet: roh, kindlich-brutal, Anti-Ästhetik

REGELN FÜR BILD-PROMPTS:
- Alle Prompts auf ENGLISCH
- Beschreibe die Szene, Stimmung, Farben, Lichtverhältnisse und den gewählten Kunststil DETAILLIERT
- Beginne jeden Prompt mit dem Kunststil-Keyword (z.B. "In the style of Kandinsky's abstract expressionism,")
- Radikal, provokativ, meta — zwischen den Zeilen, neblig, vergesslich in sich selbst
- Nichts Explizites, aber alles suggestiv und emotional aufgeladen
- Nur positive Formulierungen, keine Verneinungen
- Keine Texte, Wörter oder Buchstaben im Bild
- Hero-Bild: Fängt die ESSENZ des Artikels ein — das emotionale Zentrum, die Kernspannung
- Inline-Bild: Zeigt einen ANDEREN ASPEKT des Themas — eine Gegenposition, ein Detail, eine Metapher`;

  const userPrompt = `THEMA: ${topic.titleDe}
KATEGORIE: ${CATEGORY_LABELS[topic.category]}

AUFGABE: ${topic.promptDe}

FAKTEN (nutze wenn verfügbar):
${factsJson}

ZIEL-WORTANZAHL: ${TARGET_MIN}-${TARGET_MAX} Wörter

Gib AUSSCHLIESSLICH folgendes JSON-Objekt zurück:

{
  "title": "Artikel-Titel (deutsch, max 80 Zeichen)",
  "excerpt": "Kurze Zusammenfassung in 1-2 Sätzen (max 200 Zeichen)",
  "content_html": "Der vollständige Artikel als HTML-String (h2, h3, p, ul, ol, li, strong, em, blockquote)",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "image_prompt_hero": "Detailed English art prompt for hero image — begin with art style, then scene description",
  "image_prompt_inline": "Detailed English art prompt for inline image — DIFFERENT art style than hero, different aspect of the topic",
  "hero_alt": "English alt text for hero image",
  "inline_alt": "English alt text for inline image"
}`;

  const raw = await callOpenRouter(
    "moonshotai/kimi-k2.5",
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.6, maxTokens: 10000, responseFormat: { type: "json_object" } }
  );

  // Strip markdown code fences that LLMs sometimes add despite instructions
  const stripped = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[blog-generator] Failed to extract JSON. Raw response (first 2000 chars):", raw.slice(0, 2000));
    throw new Error("Failed to extract JSON from article generation response");
  }

  const raw_parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  console.log("[blog-generator] Parsed JSON keys:", Object.keys(raw_parsed));

  // Normalize known field-name variants LLMs produce
  const fieldMap: Record<string, keyof ArticleOutput> = {
    titel: "title",
    article_title: "title",
    artikeltitel: "title",
    headline: "title",
    ueberschrift: "title",
    überschrift: "title",
    content: "content_html",
    html: "content_html",
    article_html: "content_html",
    body: "content_html",
    inhalt: "content_html",
    image_prompt_flux: "image_prompt_hero",
    zusammenfassung: "excerpt",
    summary: "excerpt",
    schlagworte: "tags",
  };

  for (const [variant, canonical] of Object.entries(fieldMap)) {
    if (raw_parsed[variant] !== undefined && raw_parsed[canonical as string] === undefined) {
      raw_parsed[canonical as string] = raw_parsed[variant];
    }
  }

  const parsed = raw_parsed as unknown as ArticleOutput;

  const required = ["title", "content_html"] as const;
  for (const field of required) {
    if (!parsed[field]) {
      console.error(`[blog-generator] Missing field "${field}". Available keys:`, Object.keys(raw_parsed), "Raw JSON (first 500 chars):", jsonMatch[0].slice(0, 500));
      throw new Error(`Article output missing required field: ${field}`);
    }
  }

  return parsed;
}

// --- Step C: Post-process & quality gate ---

function stripLinks(html: string): string {
  return html.replace(/<a[^>]*>(.*?)<\/a>/gi, "$1");
}

function stripDisallowedTags(html: string): string {
  const allowed = ["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "blockquote", "br", "article", "section"];
  return html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    if (allowed.includes(tag.toLowerCase())) return match;
    return "";
  });
}

function cleanseImagePrompt(prompt: string): string {
  const negativePattern = /\b(no|without|avoid|do not|exclude|ohne|kein(?:e|en)?|nicht|vermeide)\b/i;
  const parts = prompt.split(/[,\.;:]\s*/);
  const keep = parts.map((s) => s.trim()).filter((s) => s !== "" && !negativePattern.test(s));
  return [...new Set(keep)].join(", ");
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.split(" ").filter((w) => w.length > 0).length;
}

function countMatches(pattern: RegExp, html: string): number {
  const m = html.match(pattern);
  return m ? m.length : 0;
}

interface QualityReport {
  isAcceptable: boolean;
  issues: string[];
  wordCount: number;
  headingCount: number;
  paragraphCount: number;
}

function evaluateQuality(title: string, html: string): QualityReport {
  const wordCount = countWords(html);
  const headingCount = countMatches(/<h[2-6][^>]*>/gi, html);
  const paragraphCount = countMatches(/<p[^>]*>[\s\S]*?<\/p>/gi, html);

  const issues: string[] = [];
  if (wordCount < MIN_WORD_COUNT) issues.push(`Word count too low (${wordCount} < ${MIN_WORD_COUNT})`);
  if (headingCount < MIN_HEADING_COUNT) issues.push(`Not enough headings (${headingCount} < ${MIN_HEADING_COUNT})`);
  if (paragraphCount < MIN_PARAGRAPH_COUNT) issues.push(`Too few paragraphs (${paragraphCount} < ${MIN_PARAGRAPH_COUNT})`);
  if (!title) issues.push("Missing article title");

  return { isAcceptable: issues.length === 0, issues, wordCount, headingCount, paragraphCount };
}

function postProcess(article: ArticleOutput): { html: string; title: string; excerpt: string; tags: string[]; heroPrompt: string; inlinePrompt: string; heroAlt: string; inlineAlt: string } {
  let html = article.content_html;
  html = stripLinks(html);
  html = stripDisallowedTags(html);

  const heroPrompt = article.image_prompt_hero ? cleanseImagePrompt(article.image_prompt_hero) : "";
  const inlinePrompt = article.image_prompt_inline ? cleanseImagePrompt(article.image_prompt_inline) : "";

  return {
    html,
    title: article.title,
    excerpt: (article.excerpt ?? "").slice(0, 250),
    tags: (article.tags ?? []).slice(0, 6),
    heroPrompt,
    inlinePrompt,
    heroAlt: article.hero_alt ?? "",
    inlineAlt: article.inline_alt ?? "",
  };
}

// --- Step D: Generate images via ComfyUI ---

export async function generateImage(prompt: string): Promise<Buffer | null> {
  try {
    const workflow = createBlogImageWorkflow(prompt);

    const queueResponse = await fetch(`${COMFY_BASE_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: crypto.randomUUID().replace(/-/g, "").slice(0, 16) }),
    });

    if (!queueResponse.ok) {
      console.error("[blog-generator] ComfyUI queue failed:", queueResponse.status);
      return null;
    }

    const { prompt_id } = (await queueResponse.json()) as { prompt_id: string };

    // Poll for completion with progressive delay
    const deadline = Date.now() + COMFY_TIMEOUT;
    let delay = 1000;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(5000, delay + 1000);

      const historyResponse = await fetch(`${COMFY_BASE_URL}/history/${prompt_id}`);
      if (!historyResponse.ok) continue;

      const history = (await historyResponse.json()) as Record<
        string,
        { outputs?: Record<string, { images?: { filename: string; subfolder?: string; type?: string }[] }> }
      >;

      const promptHistory = history[prompt_id];
      if (!promptHistory?.outputs) continue;

      for (const nodeOutput of Object.values(promptHistory.outputs)) {
        if (nodeOutput.images && nodeOutput.images.length > 0) {
          const img = nodeOutput.images[0];
          const imageUrl = `${COMFY_BASE_URL}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder ?? "")}&type=${encodeURIComponent(img.type ?? "output")}`;

          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            console.error("[blog-generator] Failed to download image:", imageResponse.status);
            return null;
          }

          return Buffer.from(await imageResponse.arrayBuffer());
        }
      }
    }

    console.error("[blog-generator] ComfyUI timeout, no images produced");
    return null;
  } catch (error) {
    console.error("[blog-generator] Image generation failed:", error);
    return null;
  }
}

export function saveImage(buffer: Buffer, date: Date, filename: string): string {
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const dir = path.join(process.cwd(), "public", "img", "blog", year, month, day);
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);

  return `/img/blog/${year}/${month}/${day}/${filename}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// --- Main pipeline ---

export interface GenerateArticleResult {
  article: BlogArticleRecord;
  imageCount: number;
  qualityReport: QualityReport;
}

export async function generateBlogArticle(): Promise<GenerateArticleResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  // Pick topic
  const recentKeys = getRecentBlogTopicKeys(15);
  const topic = selectBlogTopic(recentKeys);
  console.log(`[blog-generator] Selected topic: ${topic.key} (${topic.category})`);

  // Step A: Research
  console.log("[blog-generator] Step A: Researching...");
  const research = await researchTopic(topic);
  console.log(`[blog-generator] Research: ${research.facts.length} facts found`);

  // Step B+C: Write + post-process with quality gate retry
  let processed: ReturnType<typeof postProcess> | null = null;
  let qualityReport: QualityReport | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[blog-generator] Step B: Writing article (attempt ${attempt}/${MAX_ATTEMPTS})...`);
    const rawArticle = await writeArticle(topic, research);

    console.log("[blog-generator] Step C: Post-processing...");
    processed = postProcess(rawArticle);
    qualityReport = evaluateQuality(processed.title, processed.html);

    console.log(
      `[blog-generator] Quality: ${qualityReport.isAcceptable ? "PASS" : "FAIL"} ` +
        `(${qualityReport.wordCount} words, ${qualityReport.headingCount} headings, ${qualityReport.paragraphCount} paragraphs)`
    );

    if (qualityReport.isAcceptable) break;

    if (attempt >= MAX_ATTEMPTS) {
      throw new Error(
        `Article failed quality checks after ${MAX_ATTEMPTS} attempts. Issues: ${qualityReport.issues.join(" | ")}`
      );
    }
  }

  if (!processed || !qualityReport) throw new Error("No article produced");

  const slug = slugify(processed.title);
  const wordCount = qualityReport.wordCount;

  // Step D: Generate images via ComfyUI
  console.log("[blog-generator] Step D: Generating images...");
  const now = new Date();
  const imageResults: { path: string; prompt: string; alt: string }[] = [];

  // Hero image (LLM-generated prompt, unique art style per article)
  if (processed.heroPrompt) {
    const heroBuffer = await generateImage(processed.heroPrompt);
    if (heroBuffer) {
      const webPath = saveImage(heroBuffer, now, `${slug}-hero.png`);
      imageResults.push({ path: webPath, prompt: processed.heroPrompt, alt: processed.heroAlt || processed.title });
    }
  }

  // Inline image (LLM-generated prompt, different art style than hero)
  if (processed.inlinePrompt) {
    const inlineBuffer = await generateImage(processed.inlinePrompt);
    if (inlineBuffer) {
      const webPath = saveImage(inlineBuffer, now, `${slug}-inline.png`);
      imageResults.push({ path: webPath, prompt: processed.inlinePrompt, alt: processed.inlineAlt || `${processed.title} — Illustration` });
    }
  }

  // Inject images into content
  let finalContent = processed.html;
  if (imageResults.length > 0) {
    // Insert hero image after first paragraph or heading
    const firstBreakMatch = finalContent.match(/<\/(?:p|h[2-4])>/i);
    if (firstBreakMatch && firstBreakMatch.index !== undefined) {
      const insertPos = firstBreakMatch.index + firstBreakMatch[0].length;
      const imgTag = `<figure class="blog-article-figure"><img src="${imageResults[0].path}" alt="${imageResults[0].alt}" loading="lazy" /><figcaption>${CATEGORY_LABELS[topic.category]}</figcaption></figure>`;
      finalContent = finalContent.slice(0, insertPos) + imgTag + finalContent.slice(insertPos);
    }

    // Insert second image before last heading
    if (imageResults.length > 1) {
      const lastH2 = finalContent.lastIndexOf("<h2");
      const lastH3 = finalContent.lastIndexOf("<h3");
      const lastHeadingPos = Math.max(lastH2, lastH3);
      if (lastHeadingPos > 0) {
        const imgTag = `<figure class="blog-article-figure"><img src="${imageResults[1].path}" alt="${imageResults[1].alt}" loading="lazy" /><figcaption>${processed.tags[0] ?? CATEGORY_LABELS[topic.category]}</figcaption></figure>`;
        finalContent = finalContent.slice(0, lastHeadingPos) + imgTag + finalContent.slice(lastHeadingPos);
      }
    }
  }

  // Step E: Publish to SQLite
  console.log("[blog-generator] Step E: Publishing...");
  const heroImage = imageResults[0]?.path ?? null;

  const savedArticle = insertBlogArticle({
    slug,
    title: processed.title,
    excerpt: processed.excerpt,
    content: finalContent,
    category: topic.category,
    tags: processed.tags,
    topicKey: topic.key,
    heroImage,
    wordCount,
  });

  for (let i = 0; i < imageResults.length; i++) {
    insertBlogImage({
      articleId: savedArticle.id,
      filePath: imageResults[i].path,
      altText: imageResults[i].alt,
      prompt: imageResults[i].prompt,
      position: i,
    });
  }

  console.log(
    `[blog-generator] Published: "${savedArticle.title}" (${wordCount} words, ${imageResults.length} images)`
  );

  return { article: savedArticle, imageCount: imageResults.length, qualityReport };
}
