import {
  getBlogArticleById,
  upsertBlogArticleTranslation,
  type BlogArticleTranslationRecord,
} from "@/lib/sqlite";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
};

const LANGUAGE_CURRENCY: Record<string, string> = {
  en: "USD ($)",
  es: "Euro (€)",
  fr: "Euro (€)",
};

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

async function callOpenRouter(
  model: string,
  messages: { role: string; content: string }[],
  options: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: string };
  } = {}
): Promise<string> {
  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 8192,
  };

  if (options.responseFormat) {
    payload.response_format = options.responseFormat;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://i-laugh-you.com",
      "X-Title": "I LAUGH YOU Blog Translation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0]?.message?.content ?? "";
}

export async function translateBlogArticle(
  articleId: number,
  targetLang: string
): Promise<BlogArticleTranslationRecord> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const langName = LANGUAGE_NAMES[targetLang];
  if (!langName) {
    throw new Error(`Unsupported target language: ${targetLang}`);
  }

  const article = getBlogArticleById(articleId);
  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  const currency = LANGUAGE_CURRENCY[targetLang];

  const systemPrompt = `You are a professional translator for an art blog. Translate the following German blog article into ${langName}.

RULES:
- Translate ALL text content accurately and naturally
- Preserve ALL HTML tags exactly as they are — do not add, remove, or modify any tags
- Keep <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <figure>, <figcaption>, <img> etc. intact
- Do NOT translate image src, alt attributes, or CSS class names
- Maintain the original tone: opinionated, provocative, accessible
- Keep art/culture-specific terminology accurate (artist names, movement names stay as-is)
- "I LAUGH YOU" is a proper name — never translate it
- CURRENCY: Convert all Euro (€) price references to ${currency}. The prices stay the same numbers (77 to 777), only the currency symbol/name changes.

Respond ONLY with a valid JSON object. First character must be '{', last must be '}'.
No markdown code blocks. Encode newlines in strings as \\n.`;

  const userPrompt = `Translate this German article to ${langName}:

TITLE: ${article.title}

EXCERPT: ${article.excerpt}

CONTENT (HTML):
${article.content}

Return this exact JSON structure:
{
  "title": "translated title",
  "excerpt": "translated excerpt",
  "content": "translated HTML content"
}`;

  console.log(`[blog-translator] Translating article ${articleId} to ${targetLang}...`);

  const raw = await callOpenRouter(
    "moonshotai/kimi-k2.5",
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 10000, responseFormat: { type: "json_object" } }
  );

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from translation response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    title?: string;
    excerpt?: string;
    content?: string;
  };

  if (!parsed.title || !parsed.content) {
    throw new Error("Translation response missing required fields (title, content)");
  }

  const slug = slugify(parsed.title);

  const translation = upsertBlogArticleTranslation({
    articleId,
    language: targetLang,
    title: parsed.title,
    slug,
    excerpt: parsed.excerpt ?? article.excerpt,
    content: parsed.content,
  });

  console.log(
    `[blog-translator] Translated article ${articleId} to ${targetLang}: "${parsed.title}"`
  );

  return translation;
}
