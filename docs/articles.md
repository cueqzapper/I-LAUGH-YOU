# Article Creation System - Complete Reference

This document contains everything needed to understand and recreate the Mom Mirror article generation pipeline.

---

## Architecture Overview

The system is a **3-step pipeline** that generates German-language blog articles for mothers/pregnant women:

```
Step A: Research (optional)  -->  Perplexity Sonar (web search)
Step B: Write               -->  Kimi K2.5 via OpenRouter (single LLM call, JSON output)
Step C: Polish & Assets     -->  Local PHP post-processing (no LLM)
     + Image Generation     -->  ComfyUI Z-Image Turbo (hero + inline) / Nano Banana Pro (fallback)
```

**Storage:** Firestore (GCP project `mommirror-14731`)
**Images:** Google Cloud Storage bucket `mom-mirror-images`, optimized to multi-resolution WebP

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/generate-article` | POST | Single article generation |
| `/admin/article/pipeline/info` | GET | Pipeline config info |
| `/admin/bulk-create/save` | POST | Save bulk prompt config |
| `/admin/bulk-prompt/{id}/generate-prompts` | POST | Generate sub-prompts |
| `/admin/bulk-prompt/{id}/start` | POST | Start async bulk generation |
| `/admin/bulk-prompt/{id}/status` | GET | Get bulk generation status |
| `/admin/bulk-prompt/{id}/generate-all-images` | POST | Generate images for all articles |
| `/admin/bulk-prompt/{id}/publish-all` | POST | Publish all generated articles |

---

## LLM Configuration

All LLM calls go through **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`).

### Model Map (`config/services_pipeline.yaml`)

```yaml
research: 'perplexity/sonar'       # Web search + facts
content: 'moonshotai/kimi-k2.5'    # Article writing
default: 'openai/gpt-4.1-mini'     # Fallback
```

### Environment Variables (`.env`)

```
OPENROUTER_API_KEY=...
COMFY_BASE_URL=https://comfy.catdone.com
COMFY_TIMEOUT=900
GOOGLE_CLOUD_STORAGE_BUCKET=mom-mirror-images
GCP_PROJECT_ID=mommirror-14731
CONTENT_MODEL=openai/gpt-4o-mini
RESEARCH_MODEL=perplexity/sonar
KEYWORD_MODEL=qwen/qwen-2.5-72b-instruct
ARTICLE_TARGET_MIN=1100
ARTICLE_TARGET_MAX=1500
RESEARCH_ENABLED=true
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/Service/ArticlePipeline.php` | Main pipeline orchestrator (3 steps) |
| `src/Service/ResearchService.php` | Step A: Research via Perplexity |
| `src/Service/WriterService.php` | Step B: Article writing via LLM |
| `src/Service/PostProcessor.php` | Step C: HTML cleanup, schema generation |
| `src/Service/ArticleQualityEvaluator.php` | Quality gate (word count, headings, images) |
| `src/Service/LlmClient.php` | OpenRouter API client |
| `src/Service/LlmClientFactory.php` | Factory for LlmClient with API key |
| `src/Service/ComfyClient.php` | ComfyUI API client |
| `src/Service/NanoBananaClient.php` | Nano Banana Pro (FAL AI) client |
| `src/Service/ArticleImageGenerator.php` | Image generation orchestrator |
| `src/Service/ImageOptimizationService.php` | Multi-resolution WebP optimization |
| `src/Service/ArticleStorage.php` | Firestore persistence layer |
| `src/Controller/ArticlePipelineController.php` | HTTP endpoint for single article |
| `src/Controller/BulkArticleController.php` | HTTP endpoints for bulk operations |
| `config/comfy/z-image-turbo.json` | ComfyUI workflow (primary) |
| `config/services_pipeline.yaml` | Pipeline service wiring |

---

## Complete Source Code

### 1. Pipeline Orchestrator (`src/Service/ArticlePipeline.php`)

```php
<?php

namespace App\Service;

use Psr\Log\LoggerInterface;

/**
 * Streamlined 3-step article pipeline
 * A) Research (optional) -> B) Write -> C) Polish
 */
final class ArticlePipeline
{
    public function __construct(
        private ResearchService $research,
        private WriterService $writer,
        private ArticleStorage $storage,
        private PostProcessor $postProcessor,
        private LlmClient $llm,
        private SlugGenerator $slugGenerator,
        private ArticleQualityEvaluator $qualityEvaluator,
        private ArticleCatalogService $catalogService,
        private LoggerInterface $logger
    ) {}

    /**
     * Generate complete article from master prompt
     *
     * @param string $masterPrompt User's topic/request
     * @param array $opts Options: article_id, research (bool), target_min, target_max
     * @return array ['id' => string, 'data' => array]
     */
    public function generate(string $masterPrompt, array $opts = []): array
    {
        $id = $opts['article_id'] ?? DateTimeHelper::uniqueId('article_');
        $startTime = microtime(true);

        $this->logger->info('Pipeline start', [
            'id' => $id,
            'prompt' => substr($masterPrompt, 0, 100)
        ]);

        // STEP A: Research (optional, single pass, ONE file)
        $researchData = ['facts' => [], 'citations' => [], 'summary' => '', 'topic' => $masterPrompt];
        if (!empty($opts['research']) && $this->shouldResearch($masterPrompt)) {
            $researchData = $this->research->run($masterPrompt);
            $this->storage->saveResearch($id, [
                'topic' => $researchData['topic'],
                'summary' => $researchData['summary'],
                'facts' => $researchData['facts'],
                'citations' => $researchData['citations'],
                'created_at' => DateTimeHelper::timestamp()
            ]);
            $this->logger->info('Step A: Research completed', [
                'facts_count' => count($researchData['facts']),
                'citations_count' => count($researchData['citations'])
            ]);
        } else {
            $this->logger->info('Step A: Research skipped');
        }

        $maxAttempts = max(1, (int) ($opts['max_attempts'] ?? 3));
        $draft = null;
        $qualityReport = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            // STEP B: Write (single call, JSON out)
            $draft = $this->writer->write($masterPrompt, $researchData['facts'], [
                'target_min' => $opts['target_min'] ?? 1100,
                'target_max' => $opts['target_max'] ?? 1500,
                'article_id' => $id
            ]);

            $wordCount = str_word_count(strip_tags($draft['content_html'] ?? ''));

            $this->logger->info('Step B: Article written', [
                'title' => $draft['title'],
                'subtitle' => $draft['subtitle'] ?? '',
                'word_count' => $wordCount,
                'attempt' => $attempt,
                'max_attempts' => $maxAttempts
            ]);

            // STEP C: Polish & Assets (local post-processing, no model)
            $draft = $this->postProcessor->polish($draft, [
                'strip_external_links' => true,
                'target_max' => $opts['target_max'] ?? 1500
            ]);

            $draft['schema_json'] = $this->postProcessor->generateSchema($draft);

            $qualityReport = $this->qualityEvaluator->evaluateDraft($draft);

            if ($qualityReport['is_acceptable']) {
                break;
            }

            if ($attempt >= $maxAttempts) {
                $message = 'Article draft failed quality checks after ' . $maxAttempts . ' attempt(s).';
                throw new \RuntimeException($message . ' Issues: ' . implode(' | ', $qualityReport['issues']));
            }
        }

        // Use LLM-generated image prompt (already in English)
        $draft['hero_image_prompt'] = $draft['image_prompt_flux'] ?? '';
        $draft['alt_text'] = $draft['hero_alt'] ?? "Hero image about {$masterPrompt}";

        // Use explicitly passed category from bulk prompt, otherwise use AI-generated category
        $articleCategory = !empty($opts['category'])
            ? $this->storage->normalizeCategoryId($opts['category'])
            : $this->storage->normalizeCategoryId($draft['category'] ?? '');

        $article = [
            'id' => $id,
            'title' => $draft['title'],
            'subtitle' => $draft['subtitle'] ?? '',
            'slug' => $this->slugify($draft['title']),
            'excerpt' => $draft['excerpt'],
            'content' => $draft['content_html'],
            'category' => $articleCategory,
            'tags' => $draft['tags'],
            'meta_description' => $draft['meta_description'],
            'hero_image_prompt' => $draft['hero_image_prompt'],
            'alt_text' => $draft['alt_text'],
            'hero_caption' => $draft['hero_caption'] ?? '',
            'reading_time_minutes' => $draft['reading_time_minutes'] ?? 6,
            'schema_json' => $draft['schema_json'],
            'master_prompt' => $masterPrompt,
            'research_performed' => !empty($researchData['facts']),
            'research_facts_count' => count($researchData['facts']),
            'research_citations' => $researchData['citations'],
            'research_summary' => $researchData['summary'],
            'quality_review' => [
                'is_acceptable' => $qualityReport['is_acceptable'],
                'issues' => $qualityReport['issues'],
                'word_count' => $qualityReport['word_count'],
                'heading_count' => $qualityReport['heading_count'],
                'paragraph_count' => $qualityReport['paragraph_count'],
                'image_count' => $qualityReport['image_count'],
            ],
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
            'author' => 'Admin',
            'status' => 'draft',
            'base_language' => 'de',
            'available_languages' => ['de'],
            'translations' => [],
            'slug_translations' => [
                'de' => $this->slugify($draft['title'])
            ]
        ];

        $this->storage->saveArticle($id, $article);
        $this->catalogService->addArticleToCatalog($id, $article);

        return ['id' => $id, 'data' => $article];
    }

    /**
     * Determine if topic requires research
     */
    private function shouldResearch(string $topic): bool
    {
        $excludeKeywords = [
            'meinung', 'gedanken', 'tagebuch', 'persönliche', 'gefühle',
            'opinion', 'thoughts', 'diary', 'personal feelings'
        ];

        $topicLower = mb_strtolower($topic);

        foreach ($excludeKeywords as $kw) {
            if (str_contains($topicLower, $kw)) {
                return false;
            }
        }

        return true;
    }

    private function slugify(string $text): string
    {
        $text = strtr($text, [
            'Ä' => 'Ae', 'Ö' => 'Oe', 'Ü' => 'Ue',
            'ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss'
        ]);
        return $this->slugGenerator->generate($text);
    }
}
```

---

### 2. Research Service (`src/Service/ResearchService.php`)

```php
<?php

namespace App\Service;

use Psr\Log\LoggerInterface;

/**
 * STEP A: Research (optional)
 * Single pass, ONE file, facts only, no URLs in body
 */
final class ResearchService
{
    public function __construct(
        private LlmClient $llm,
        private LoggerInterface $logger
    ) {}

    /**
     * @return array ['facts' => [...], 'citations' => [...], 'summary' => string, 'topic' => string]
     */
    public function run(string $topic): array
    {
        $systemPrompt = "Return verified facts as JSON. Include source URLs in 'internal_only_citations' for each fact.";

        $userPrompt = <<<PROMPT
Topic: "{$topic}"; Audience: mothers.

Return:
{
  "topic":"...",
  "summary":"2-3 sentences",
  "facts":[
    {"claim":"short, checkable", "evidence_snippet":"...", "relevance":"...", "updated_at":"YYYY-MM-DD", "source_index": 0}
  ],
  "internal_only_citations":[
    {"url":"https://...", "title":"...", "accessed":"YYYY-MM-DD"}
  ]
}

Each fact should reference its source via source_index (0-based index into internal_only_citations array).
PROMPT;

        $modelName = $this->llm->getModel('research');

        $response = $this->llm->call([
            'model' => $modelName,
            'temperature' => 0.1,
            'max_tokens' => 2500,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt]
            ],
            'web_search' => true  // Enables Perplexity web search
        ]);

        $content = $response['choices'][0]['message']['content'] ?? '';
        $annotations = $response['choices'][0]['message']['annotations'] ?? [];

        try {
            $data = JsonParser::decode($content);

            $facts = $data['facts'] ?? [];
            $citations = $data['internal_only_citations'] ?? [];

            // Add raw citations from Perplexity annotations
            if (!empty($annotations)) {
                $citations = array_merge($citations, $this->extractCitations($annotations));
            }

            return [
                'facts' => $facts,
                'citations' => $citations,
                'summary' => $data['summary'] ?? '',
                'topic' => $data['topic'] ?? $topic
            ];

        } catch (\Exception $e) {
            return ['facts' => [], 'citations' => [], 'summary' => '', 'topic' => $topic];
        }
    }

    private function extractCitations(array $annotations): array
    {
        $citations = [];
        foreach ($annotations as $annotation) {
            if (isset($annotation['url_citation'])) {
                $citations[] = [
                    'url' => $annotation['url_citation']['url'] ?? '',
                    'title' => $annotation['url_citation']['title'] ?? '',
                    'accessed' => date('Y-m-d')
                ];
            }
        }
        return $citations;
    }
}
```

---

### 3. Writer Service (`src/Service/WriterService.php`)

This is the core content generation - one LLM call that produces the entire article as strict JSON.

```php
<?php

namespace App\Service;

use App\Util\JsonSanitizer;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * STEP B: Write
 * Single LLM call, JSON output only (strict RFC-8259)
 */
final class WriterService
{
    public function __construct(
        private LlmClient $llm,
        private LoggerInterface $logger,
        #[Autowire('%kernel.project_dir%')] private string $projectDir
    ) {}

    /**
     * @return array ['title', 'subtitle', 'excerpt', 'content_html', 'category', 'tags',
     *               'meta_description', 'image_prompt_flux', 'hero_alt', 'hero_caption', 'reading_time_minutes']
     */
    public function write(string $masterPrompt, array $facts, array $opts): array
    {
        $factsJson   = !empty($facts) ? json_encode($facts, JSON_UNESCAPED_UNICODE) : '[]';
        $targetMin = $opts['target_min'] ?? 1040;
        $targetMax = $opts['target_max'] ?? 1440;
        $articleId = $opts['article_id'] ?? null;

        $systemPrompt = <<<SYSTEM
Du bist ein professioneller Autor für Mom Mirror, einen warmherzigen Blog für Mütter und Schwangere in Hochdeutsch (Schweiz).

DEINE AUFGABE:
Schreibe einen vollständigen, gut strukturierten HTML-Artikel basierend auf dem gegebenen Thema. Der Artikel soll:
- Warm, einfühlsam und unterstützend im Ton sein
- Praktische, umsetzbare Ratschläge bieten
- Wissenschaftlich fundiert sein (nutze Facts wenn verfügbar)
- Klar strukturiert und leicht verständlich sein
- Visuell ansprechend mit passenden Bildern illustriert werden

STRUKTUR & STIL:
- Erstelle einen einprägsamen Titel nach der 4-U-Formel (Useful, Unique, Urgent, Ultra-specific)
- Beginne mit einem warmen, relatable Hook (2-3 Sätze: Szene -> Herausforderung -> Hoffnung)
- Gliedere in 3-5 H2-Abschnitte, je 0-2 H3 Unterabschnitte
- Halte Absätze kurz (<=3 Sätze), alltagsnah und klar
- Nutze Listen (<ul><li>) für Checklisten, Tipps, FAQ-Antworten
- Setze <strong>, <em> für visuelle Betonung ein
- Keine externen Links
- Sei Einfühlsam und erkläre das Thema wie jemand, der es auch erlebt hat.

TECHNISCHE ANFORDERUNGEN (STRIKTE JSON-FORMATIERUNG):
- Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt (RFC-8259)
- Erstes Zeichen MUSS '{' sein, letztes MUSS '}' sein
- ABSOLUT KEINE ```json oder ``` Markdown-Codeblöcke - nur reines JSON!
- KEINE Kommentare, KEIN Text außerhalb des JSON
- Alle Zeilenumbrüche in Strings als \\n kodieren (KEINE echten Newlines!)
- HTML kompakt in einer Zeile, nutze einfache Quotes für Attribute (class='...')
- KRITISCH: Alle Anführungszeichen innerhalb von Text/HTML MÜSSEN als \" escaped werden

BILD-PROMPTS (KRITISCH FÜR EINZIGARTIGKEIT):

Hero Image:
- Erstelle einen ENGLISCHEN Aquarell-Prompt für das Hauptbild
- MUSS einzigartig für dieses Thema sein: variiere Perspektive, Aktivität, Emotion, Tageszeit, Location, Farbwahl
- Beschreibe die Szene detailliert: Farben, Lichtstimmung, interessante Details
- Nur positive Formulierungen, keine Verneinungen

Inline Images (2-5 pro Artikel):
Syntax: <img src="" data-id="img_1" date-imageModel="[qwen oder nanobanana]" alt="[ENGLISH prompt around 700 characters]">
- Für ein Bild mit Text benutze data-imageModel="nanobanana"
- Für normale Szenen kannst du data-imageModel weglassen (Standard ist qwen) oder explizit data-imageModel="qwen" angeben
- WICHTIG: Bei nanobanana-Bildern mit Text MUSS der Text im Bild auf ENGLISCH sein
- Jedes Bild bekommt eine ANDERE Szene
- Personen in Bilder sollten Diversität repräsentieren
- data-id inkrementell (img_1, img_2, img_3...)
- src bleibt leer (wird später gefüllt)
- alt = exakter Bildprompt in ENGLISCH
- Bei qwen/comfyUI: KEINE sichtbaren Texte/Labels im Bild (nur bei nanobanana erlaubt)
SYSTEM;

        $userPrompt = <<<PROMPT
THEMA: {$masterPrompt}

FAKTEN (optional - nutze diese wenn verfügbar):
{$factsJson}

ZIEL-WORTANZAHL: {$targetMin}-{$targetMax} Wörter

Gib AUSSCHLIESSLICH folgendes JSON-Objekt zurück (nichts sonst):

{
  "title": "4-U Formula, Useful, Unique, Urgent, Ulta-specific",
  "subtitle": "...",
  "excerpt": "...",
  "content_html": "<article>...</article>",
  "category": "...",
  "tags": ["...","..."],
  "meta_description": "...",
  "image_prompt_flux": "Describe the visual scene for a hero image IN ENGLISH...",
  "hero_alt": "...",
  "hero_caption": "...",
  "reading_time_minutes": 6
}
PROMPT;

        $modelName = $this->llm->getModel('content');

        $callPayload = [
            'model' => $modelName,
            'temperature' => 0.6,
            'max_tokens' => 10000,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt]
            ],
            'response_format' => ['type' => 'json_object'],
        ];

        $response = $this->llm->call($callPayload);

        $content = $response['choices'][0]['message']['content'] ?? '';
        if (is_array($content)) {
            $content = implode('', array_map(
                static fn($c) => is_string($c) ? $c : ($c['text'] ?? ''),
                $content
            ));
        }

        $draft = JsonSanitizer::decode($content);

        // Validate required fields
        $required = [
            'title', 'subtitle', 'excerpt', 'content_html', 'category', 'tags',
            'meta_description', 'image_prompt_flux', 'hero_alt',
            'hero_caption', 'reading_time_minutes'
        ];
        foreach ($required as $field) {
            if (!array_key_exists($field, $draft)) {
                throw new \RuntimeException("Missing required field: {$field}");
            }
        }

        return $draft;
    }
}
```

---

### 4. LLM Client (`src/Service/LlmClient.php`)

```php
<?php

namespace App\Service;

use Psr\Log\LoggerInterface;

/**
 * LLM API client with model routing
 */
final class LlmClient
{
    private string $apiKey;
    private array $modelMap;

    public function __construct(
        string $apiKey,
        array $modelMap,
        private LoggerInterface $logger
    ) {
        $this->apiKey = $apiKey;
        $this->modelMap = $modelMap;
    }

    /**
     * @param array $params ['model', 'temperature', 'max_tokens', 'messages', 'web_search']
     */
    public function call(array $params): array
    {
        $model = $params['model'];
        $temperature = $params['temperature'] ?? 0.3;
        $maxTokens = $params['max_tokens'] ?? 1000;
        $messages = $params['messages'];
        $webSearch = $params['web_search'] ?? false;

        $payload = [
            'model' => $model,
            'temperature' => $temperature,
            'max_tokens' => $maxTokens,
            'messages' => $messages
        ];

        if (isset($params['response_format']) && is_array($params['response_format'])) {
            $payload['response_format'] = $params['response_format'];
        }

        // Add web search options for research models (Perplexity)
        if ($webSearch) {
            $payload['web_search_options'] = [
                'search_context_size' => $_ENV['RESEARCH_SEARCH_CONTEXT'] ?? 'low'
            ];
        }

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => 'https://openrouter.ai/api/v1/chat/completions',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_TIMEOUT => 300,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_ENCODING => 'gzip',
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apiKey,
                'HTTP-Referer: https://mommirror.com',
                'X-Title: Mom Mirror Content Pipeline',
                'Accept-Encoding: gzip'
            ],
            CURLOPT_POSTFIELDS => json_encode($payload)
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            throw new \RuntimeException('LLM API call failed: ' . curl_error($ch));
        }

        $data = json_decode($response, true);

        if ($httpCode !== 200) {
            throw new \RuntimeException('LLM API error: ' . ($data['error']['message'] ?? 'HTTP ' . $httpCode));
        }

        return $data;
    }

    public function getModel(string $task): string
    {
        return $this->modelMap[$task] ?? $this->modelMap['default'];
    }
}
```

---

### 5. LLM Client Factory (`src/Service/LlmClientFactory.php`)

```php
<?php

namespace App\Service;

use Psr\Log\LoggerInterface;

final class LlmClientFactory
{
    public function __construct(
        private ApiKeyProvider $apiKeyProvider,
        private LoggerInterface $logger
    ) {}

    public function create(array $modelMap): LlmClient
    {
        $apiKey = $this->apiKeyProvider->getApiKey();

        if (empty($apiKey)) {
            throw new \RuntimeException('OpenRouter API key not configured. Set OPENROUTER_API_KEY or create openrouter.txt file.');
        }

        return new LlmClient($apiKey, $modelMap, $this->logger);
    }
}
```

---

### 6. Post Processor (`src/Service/PostProcessor.php`)

```php
<?php

namespace App\Service;

use Psr\Log\LoggerInterface;

/**
 * STEP C: Post-processing
 * Strip links, enforce blocks, generate schema, tighten content
 */
final class PostProcessor
{
    public function __construct(
        private LoggerInterface $logger
    ) {}

    public function polish(array $draft, array $opts): array
    {
        $html = $draft['content_html'];

        // Strip external links
        if ($opts['strip_external_links'] ?? true) {
            $html = $this->stripExternalLinksHtml($html, 'mommirror.com');
        }

        // Whitelist safe HTML tags
        $html = strip_tags($html, '<article><header><main><section><h1><h2><h3><p><ul><ol><li><strong><em><figure><img><figcaption><aside><footer><br>');

        // Cleanse image prompt (remove negative formulations)
        if (!empty($draft['image_prompt_flux'])) {
            $draft['image_prompt_flux'] = $this->cleanseImagePrompt($draft['image_prompt_flux']);
        }

        $draft['content_html'] = $html;
        return $draft;
    }

    private function stripExternalLinksHtml(string $html, string $allowedHost): string
    {
        return preg_replace_callback(
            '#<a\s+[^>]*href=["\']([^"\']*)["\'[^>]*>(.*?)</a>#is',
            function($m) use ($allowedHost) {
                $url = $m[1];
                if (preg_match('#^https?://#i', $url)) {
                    $host = parse_url($url, PHP_URL_HOST);
                    return ($host && $host !== $allowedHost) ? $m[2] : $m[0];
                }
                return $m[0];
            },
            $html
        );
    }

    private function cleanseImagePrompt(string $prompt): string
    {
        $negativePattern = '/\b(no|without|avoid|do not|exclude|ohne|kein(?:e|en)?|nicht|vermeide|ausschlie(?:ße|ss)en)\b/i';
        $parts = preg_split('/[,\.;:]\s*/u', $prompt);
        $keep = array_filter(
            array_map('trim', $parts),
            fn($s) => $s !== '' && !preg_match($negativePattern, $s)
        );
        return implode(', ', array_values(array_unique($keep)));
    }

    public function generateSchema(array $draft): string
    {
        $schema = [
            '@context' => 'https://schema.org',
            '@graph' => [
                [
                    '@type' => 'Article',
                    'headline' => $draft['title'],
                    'description' => $draft['meta_description'],
                    'author' => ['@type' => 'Organization', 'name' => 'Mom Mirror'],
                    'publisher' => [
                        '@type' => 'Organization',
                        'name' => 'Mom Mirror',
                        'logo' => ['@type' => 'ImageObject', 'url' => 'https://mommirror.com/logo.png']
                    ],
                    'datePublished' => date('c'),
                    'dateModified' => date('c'),
                    'inLanguage' => 'de-CH'
                ]
            ]
        ];

        return json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    }
}
```

---

### 7. Quality Evaluator (`src/Service/ArticleQualityEvaluator.php`)

```php
<?php

namespace App\Service;

final class ArticleQualityEvaluator
{
    private const MIN_WORD_COUNT = 750;
    private const MIN_HEADING_COUNT = 3;
    private const MIN_PARAGRAPH_COUNT = 6;
    private const MIN_IMAGE_COUNT = 1;

    public function evaluateDraft(array $draft): array
    {
        $title = (string) ($draft['title'] ?? '');
        $content = (string) ($draft['content_html'] ?? $draft['content'] ?? '');
        return $this->evaluateContent($title, $content);
    }

    private function evaluateContent(string $title, string $content): array
    {
        $stripped = trim(strip_tags($content));
        $wordCount = $stripped === '' ? 0 : str_word_count($stripped);
        $headingCount = $this->countMatches('/<h[2-6][^>]*>/i', $content);
        $paragraphCount = $this->countMatches('/<p[^>]*>.*?<\/p>/si', $content);
        $imageCount = $this->countMatches('/<img[^>]*>/i', $content);

        $issues = [];

        if ($wordCount < self::MIN_WORD_COUNT) {
            $issues[] = sprintf('Word count too low (%d < %d)', $wordCount, self::MIN_WORD_COUNT);
        }
        if ($headingCount < self::MIN_HEADING_COUNT) {
            $issues[] = sprintf('Not enough subheadings (%d < %d)', $headingCount, self::MIN_HEADING_COUNT);
        }
        if ($paragraphCount < self::MIN_PARAGRAPH_COUNT) {
            $issues[] = sprintf('Too few paragraphs (%d < %d)', $paragraphCount, self::MIN_PARAGRAPH_COUNT);
        }
        if ($imageCount < self::MIN_IMAGE_COUNT) {
            $issues[] = 'No inline images detected in content.';
        }
        if (mb_strlen($stripped) < 2000) {
            $issues[] = 'Article body is very short.';
        }
        if ($title === '') {
            $issues[] = 'Missing article title.';
        }

        return [
            'is_acceptable' => count($issues) === 0,
            'issues' => $issues,
            'word_count' => $wordCount,
            'heading_count' => $headingCount,
            'paragraph_count' => $paragraphCount,
            'image_count' => $imageCount,
            'content_length' => mb_strlen($stripped),
        ];
    }

    private function countMatches(string $pattern, string $subject): int
    {
        return $subject === '' ? 0 : (preg_match_all($pattern, $subject) ?: 0);
    }
}
```

---

### 8. ComfyUI Client (`src/Service/ComfyClient.php`)

```php
<?php
namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

final class ComfyClient
{
    public function __construct(
        private HttpClientInterface $http,
        private string $baseUrl,
        private int $timeout = 600
    ) {}

    /**
     * $workflow: API-format JSON (array). We only mutate the prompt.
     * $prompt:   User's positive prompt to inject into the appropriate node
     */
    public function generate(array $workflow, string $prompt, ?string $negative = null, ?string $baseUrlOverride = null): array
    {
        // Fix empty inputs: PHP converts {} to [] when decoding JSON
        foreach ($workflow as $nodeId => &$node) {
            if (isset($node['inputs']) && is_array($node['inputs']) && empty($node['inputs'])) {
                $node['inputs'] = new \stdClass();
            }
        }
        unset($node);

        // Handle different workflow formats
        if (isset($workflow['83']['inputs']['string_b'])) {
            // Watercolor workflow
            $workflow['83']['inputs']['string_b'] = $prompt;
        } elseif (isset($workflow['111']['inputs']['string_a'])) {
            // Qwen watercolor workflow (supports {{REPLACE THIS}} placeholder)
            $currentValue = $workflow['111']['inputs']['string_a'];
            if (is_string($currentValue) && str_contains($currentValue, '{{REPLACE THIS}}')) {
                $workflow['111']['inputs']['string_a'] = str_replace('{{REPLACE THIS}}', $prompt, $currentValue);
            } else {
                $workflow['111']['inputs']['string_a'] = $prompt;
            }
        } elseif (isset($workflow['45']['inputs']['text'])) {
            // Z-Image Turbo workflow (supports {{REPLACE THIS}} placeholder)
            $currentValue = $workflow['45']['inputs']['text'];
            if (is_string($currentValue) && str_contains($currentValue, '{{REPLACE THIS}}')) {
                $workflow['45']['inputs']['text'] = str_replace('{{REPLACE THIS}}', $prompt, $currentValue);
            } else {
                $workflow['45']['inputs']['text'] = $prompt;
            }
        } elseif (isset($workflow['6']['inputs']['text'])) {
            // Regular workflow
            $workflow['6']['inputs']['text'] = $prompt;
        } else {
            throw new \RuntimeException('Workflow does not contain expected prompt node');
        }

        // Optionally override negative prompt (node "7")
        if ($negative !== null && isset($workflow['7']['inputs']['text'])) {
            $workflow['7']['inputs']['text'] = $negative;
        }

        // Randomize seed
        if (isset($workflow['31']['inputs']['seed'])) {
            $workflow['31']['inputs']['seed'] = random_int(1, PHP_INT_MAX);
        } elseif (isset($workflow['44']['inputs']['seed'])) {
            $workflow['44']['inputs']['seed'] = random_int(1, PHP_INT_MAX);
        } elseif (isset($workflow['3']['inputs']['seed'])) {
            $workflow['3']['inputs']['seed'] = random_int(1, PHP_INT_MAX);
        }

        $clientId = bin2hex(random_bytes(8));
        $base = rtrim($baseUrlOverride ?? $this->baseUrl, '/');

        // 1) Enqueue prompt
        $response = $this->http->request('POST', "$base/prompt", [
            'json' => ['prompt' => $workflow, 'client_id' => $clientId],
            'timeout' => $this->timeout,
        ]);

        $resp = json_decode($response->getContent(false), true);
        $promptId = $resp['prompt_id'] ?? null;
        if (!$promptId) {
            throw new \RuntimeException('ComfyUI did not return a prompt_id');
        }

        // 2) Poll history until outputs are ready
        $started = time();
        $delay = 1;
        do {
            sleep($delay);
            $history = $this->http->request('GET', "$base/history/$promptId", [
                'timeout' => 30,
            ])->toArray(false);

            $item    = $history[$promptId] ?? null;
            $outputs = $item['outputs'] ?? null;
            if (!empty($outputs)) {
                // 3) Collect first image URL
                foreach ($outputs as $out) {
                    foreach (($out['images'] ?? []) as $img) {
                        $url = sprintf(
                            '%s/view?filename=%s&subfolder=%s&type=%s',
                            $base,
                            rawurlencode($img['filename']),
                            rawurlencode($img['subfolder'] ?? ''),
                            rawurlencode($img['type'] ?? 'output')
                        );
                        return ['prompt_id' => $promptId, 'image_url' => $url, 'history' => $item];
                    }
                }
                throw new \RuntimeException('No images found in outputs');
            }
            $delay = min(5, $delay + 1);
        } while (time() - $started < $this->timeout);

        throw new \RuntimeException("Timed out waiting for $promptId");
    }

    /**
     * Generate image using Z-Image Turbo workflow.
     */
    public function generateZTurbo(string $prompt, string $projectDir): array
    {
        $workflowPath = $projectDir . '/config/comfy/z-image-turbo.json';
        $workflow = json_decode(file_get_contents($workflowPath), true, 512, JSON_THROW_ON_ERROR);
        return $this->generate($workflow, $prompt, null, 'https://comfy.catdone.com');
    }
}
```

---

### 9. ComfyUI Workflow (`config/comfy/z-image-turbo.json`)

This is the **primary** image generation workflow. Key details:
- **Base model:** `z_image_turbo_bf16.safetensors`
- **CLIP:** `qwen_3_4b.safetensors` (Lumina2 type)
- **LoRA 1:** `transparent-watercolor_Z_v2.safetensors` (strength: 0.2 model, 1.0 clip)
- **LoRA 2:** `Watercolor_illustrations_zimage_v1.safetensors` (strength: 0.75 model, 1.0 clip)
- **Sampler:** dpmpp_2m, scheduler: sgm_uniform, 6 steps, CFG: 1
- **Resolution:** 1536x1024
- **Negative prompt:** "black outline, black border, thick black outline"
- **Prompt template:** `"The image is in the style of a Watercolor illustration, the paper texture is clearly visible\n\n{{REPLACE THIS}}\n\nsaturated colors, clean areas and shapes, intense warm illustration\nemphasizing elegance and intensity through watercolor technique."`
- **Server:** `https://comfy.catdone.com`

```json
{
  "39": {
    "inputs": { "clip_name": "qwen_3_4b.safetensors", "type": "lumina2", "device": "default" },
    "class_type": "CLIPLoader"
  },
  "40": {
    "inputs": { "vae_name": "ae.safetensors" },
    "class_type": "VAELoader"
  },
  "42": {
    "inputs": { "conditioning": ["45", 0] },
    "class_type": "ConditioningZeroOut"
  },
  "43": {
    "inputs": { "samples": ["44", 0], "vae": ["40", 0] },
    "class_type": "VAEDecode"
  },
  "44": {
    "inputs": {
      "seed": 506236924959380,
      "steps": 6,
      "cfg": 1,
      "sampler_name": "dpmpp_2m",
      "scheduler": "sgm_uniform",
      "denoise": 1,
      "model": ["47", 0],
      "positive": ["45", 0],
      "negative": ["84", 0],
      "latent_image": ["64", 0]
    },
    "class_type": "KSampler"
  },
  "45": {
    "inputs": {
      "text": "The image is in the style of a Watercolor illustration, the paper texture is clearly visible\n\n{{REPLACE THIS}}\n\nsaturated colors, clean areas and shapes, intense warm illustration\nemphasizing elegance and intensity through watercolor technique.",
      "clip": ["82", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "46": {
    "inputs": { "unet_name": "z_image_turbo_bf16.safetensors", "weight_dtype": "default" },
    "class_type": "UNETLoader"
  },
  "47": {
    "inputs": { "shift": 3, "model": ["82", 0] },
    "class_type": "ModelSamplingAuraFlow"
  },
  "62": {
    "inputs": { "filename_prefix": "rechtski", "images": ["43", 0] },
    "class_type": "SaveImage"
  },
  "64": {
    "inputs": { "width": 1536, "height": 1024, "batch_size": 1 },
    "class_type": "EmptyLatentImage"
  },
  "77": {
    "inputs": {},
    "class_type": "VAEEncode"
  },
  "81": {
    "inputs": {
      "lora_name": "z-image/transparent-watercolor_Z_v2.safetensors",
      "strength_model": 0.2,
      "strength_clip": 1,
      "model": ["46", 0],
      "clip": ["39", 0]
    },
    "class_type": "LoraLoader"
  },
  "82": {
    "inputs": {
      "lora_name": "z-image/Watercolor_illustrations_zimage_v1.safetensors",
      "strength_model": 0.75,
      "strength_clip": 1,
      "model": ["81", 0],
      "clip": ["81", 1]
    },
    "class_type": "LoraLoader"
  },
  "83": {
    "inputs": {
      "text": "black outline\nblack border\nthick black outline",
      "clip": ["39", 0]
    },
    "class_type": "CLIPTextEncode"
  },
  "84": {
    "inputs": {
      "conditioning_to": ["42", 0],
      "conditioning_from": ["83", 0]
    },
    "class_type": "ConditioningConcat"
  }
}
```

---

### 10. Nano Banana Pro Client (`src/Service/NanoBananaClient.php`)

Fallback image generator using FAL AI's Nano Banana Pro API.

```php
<?php

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class NanoBananaClient
{
    private const API_BASE_URL = 'https://queue.fal.run/fal-ai/nano-banana-pro';
    private const MAX_POLL_ATTEMPTS = 30;
    private const POLL_INTERVAL_SECONDS = 3;

    public function __construct(
        #[Autowire('%kernel.project_dir%')] private string $projectDir,
        private LoggerInterface $logger
    ) {}

    public function generate(string $prompt, array $options = []): array
    {
        $apiKey = $this->getApiKey();
        $requestId = $this->submitRequest($apiKey, $prompt, $options);
        return $this->pollForCompletion($apiKey, $requestId);
    }

    private function getApiKey(): string
    {
        $keyFile = $this->projectDir . '/falAI-key.md';
        if (!file_exists($keyFile)) {
            throw new \RuntimeException('FAL API key file not found at ' . $keyFile);
        }
        $lines = array_filter(array_map('trim', explode("\n", file_get_contents($keyFile))));
        $apiKey = end($lines);
        if (empty($apiKey)) throw new \RuntimeException('FAL API key is empty');
        return $apiKey;
    }

    private function submitRequest(string $apiKey, string $prompt, array $options): string
    {
        $payload = array_merge([
            'prompt' => $prompt,
            'num_images' => 1,
            'output_format' => 'png',
            'aspect_ratio' => '16:9'
        ], $options);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => self::API_BASE_URL,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Authorization: Key ' . $apiKey,
                'Content-Type: application/json'
            ],
            CURLOPT_POSTFIELDS => json_encode($payload)
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($response, true);
        $requestId = $data['request_id'] ?? null;
        if (!$requestId) throw new \RuntimeException('No request_id in response');
        return $requestId;
    }

    private function pollForCompletion(string $apiKey, string $requestId): array
    {
        $statusUrl = self::API_BASE_URL . "/requests/{$requestId}/status";
        $resultUrl = self::API_BASE_URL . "/requests/{$requestId}";

        for ($attempt = 1; $attempt <= self::MAX_POLL_ATTEMPTS; $attempt++) {
            sleep(self::POLL_INTERVAL_SECONDS);

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $statusUrl,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_HTTPHEADER => ['Authorization: Key ' . $apiKey]
            ]);
            $statusResponse = curl_exec($ch);
            curl_close($ch);

            $statusData = json_decode($statusResponse, true);
            $status = $statusData['status'] ?? 'UNKNOWN';

            if ($status === 'COMPLETED') {
                return $this->fetchResult($apiKey, $resultUrl, $requestId);
            }
            if ($status === 'FAILED') {
                throw new \RuntimeException('Nano Banana image generation failed');
            }
        }

        throw new \RuntimeException('Nano Banana generation timed out');
    }

    private function fetchResult(string $apiKey, string $resultUrl, string $requestId): array
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $resultUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['Authorization: Key ' . $apiKey]
        ]);
        $resultResponse = curl_exec($ch);
        curl_close($ch);

        $resultData = json_decode($resultResponse, true);
        $imageUrl = $resultData['images'][0]['url'] ?? null;
        if (!$imageUrl) throw new \RuntimeException('No image URL in result');

        return ['image_url' => $imageUrl, 'request_id' => $requestId];
    }
}
```

---

### 11. Article Image Generator (`src/Service/ArticleImageGenerator.php`)

Orchestrates hero + inline image generation, optimization, and storage.

```php
<?php

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class ArticleImageGenerator
{
    public function __construct(
        private ArticleStorage $articleStorage,
        private ArticleCatalogService $articleCatalog,
        private InlineImages $inlineImages,
        private ComfyClient $comfyClient,
        private NanoBananaClient $nanoBananaClient,
        private HttpClientInterface $httpClient,
        private LoggerInterface $logger,
        private ImageOptimizationService $imageOptimizer,
        #[Autowire('%kernel.project_dir%')] private string $projectDir,
    ) {}

    public function generateHeroImage(string $articleId, string $prompt): array
    {
        @set_time_limit(0);
        $article = $this->requireArticle($articleId);

        // Use Z-Image Turbo for hero images
        $asset = $this->generateImageAssetZTurbo($articleId, $prompt);

        $article['image_gallery'] = $article['image_gallery'] ?? [];
        $galleryEntry = [
            'url' => $asset['final_url'],
            'prompt' => $prompt,
            'created_at' => DateTimeHelper::timestamp(),
            'prompt_id' => $asset['prompt_id'],
            'is_cloud_stored' => $asset['cloud_url'] !== null,
            'generator' => $asset['generator'] ?? 'qwen'
        ];

        if (!empty($asset['variants'])) $galleryEntry['variants'] = $asset['variants'];
        if (!empty($asset['compression_stats'])) $galleryEntry['compression_stats'] = $asset['compression_stats'];

        array_unshift($article['image_gallery'], $galleryEntry);
        $article['featured_image'] = $asset['final_url'];
        $article['updated_at'] = DateTimeHelper::timestamp();

        $this->articleStorage->saveArticle($articleId, $article);
        return $asset;
    }

    public function generateAllImages(string $articleId): array
    {
        @set_time_limit(0);
        $article = $this->requireArticle($articleId);

        // Hero image
        $heroPrompt = trim((string) ($article['hero_image_prompt'] ?? $article['image_prompt_flux'] ?? ''));
        $heroGenerated = false;
        $heroError = null;

        if ($heroPrompt !== '') {
            try {
                $this->generateHeroImage($articleId, $heroPrompt);
                $heroGenerated = true;
                $article = $this->requireArticle($articleId);
            } catch (\Throwable $e) {
                $heroError = $e->getMessage();
                $article = $this->requireArticle($articleId);
            }
        }

        // Inline images
        [$contentWithIds, $inlineList] = $this->inlineImages->ensureIdsAndList($article['content'] ?? '');
        $inlineGenerated = 0;
        $inlineSkipped = 0;
        $inlineErrors = [];

        foreach ($inlineList as $inlineImage) {
            $prompt = trim((string) ($inlineImage['alt'] ?? ''));
            if ($prompt === '') { $inlineSkipped++; continue; }

            $imageModel = strtolower($inlineImage['imageModel'] ?? 'qwen');

            try {
                // Route to correct generator based on data-imageModel attribute
                if (in_array($imageModel, ['nanobanana', 'nano-banana', 'seedream'], true)) {
                    $asset = $this->generateImageAssetNanoBanana($articleId, $prompt);
                } else {
                    // Default: Z-Image Turbo for all ComfyUI/Qwen/default requests
                    $asset = $this->generateImageAssetZTurbo($articleId, $prompt);
                }

                // Replace image URL in content with responsive variants
                if (!empty($asset['variants']['webp_960_url'])) {
                    $article['content'] = $this->inlineImages->replaceSrcWithResponsive(
                        $article['content'] ?? '', $inlineImage['id'], $asset['variants']
                    );
                } else {
                    $article['content'] = $this->inlineImages->replaceSrcById(
                        $article['content'] ?? '', $inlineImage['id'], $asset['final_url']
                    );
                }

                $inlineGenerated++;
                $this->articleStorage->saveArticle($articleId, $article);
                $article = $this->requireArticle($articleId);
            } catch (\Throwable $e) {
                $inlineErrors[] = ['inline_image_id' => $inlineImage['id'], 'error' => $e->getMessage()];
            }
        }

        $this->articleCatalog->refreshArticle($articleId);

        return [
            'hero_generated' => $heroGenerated,
            'hero_error' => $heroError,
            'inline_generated_count' => $inlineGenerated,
            'inline_skipped_count' => $inlineSkipped,
            'inline_errors' => $inlineErrors
        ];
    }

    private function generateImageAssetNanoBanana(string $articleId, string $prompt): array
    {
        $result = $this->nanoBananaClient->generate($prompt);

        $basePath = DateTimeHelper::articleImageBasePath();
        $baseFilename = uniqid('inline_', true);
        $optimized = $this->imageOptimizer->optimizeAndUpload($result['image_url'], $basePath, $baseFilename);
        $primaryUrl = $optimized['webp_960_url'];

        return [
            'final_url' => $primaryUrl,
            'remote_url' => $result['image_url'],
            'cloud_url' => $primaryUrl,
            'prompt_id' => $result['request_id'],
            'variants' => ImageOptimizationService::normalizeVariants($optimized),
            'compression_stats' => $optimized['compression_stats'],
            'generator' => 'nano-banana-pro'
        ];
    }

    private function generateImageAssetZTurbo(string $articleId, string $prompt): array
    {
        $result = $this->comfyClient->generateZTurbo($prompt, $this->projectDir);
        $remoteUrl = $result['image_url'];
        $promptId = $result['prompt_id'] ?? null;

        $basePath = DateTimeHelper::articleImageBasePath();
        $baseFilename = uniqid('zturbo_', true);
        $optimized = $this->imageOptimizer->optimizeAndUpload($remoteUrl, $basePath, $baseFilename);
        $primaryUrl = $optimized['webp_960_url'];

        return [
            'final_url' => $primaryUrl,
            'remote_url' => $remoteUrl,
            'cloud_url' => $primaryUrl,
            'prompt_id' => $promptId,
            'variants' => ImageOptimizationService::normalizeVariants($optimized),
            'compression_stats' => $optimized['compression_stats'],
            'generator' => 'z-image-turbo'
        ];
    }

    private function requireArticle(string $articleId): array
    {
        $article = $this->articleStorage->loadArticle($articleId);
        if (!$article) throw new \RuntimeException('Article not found: ' . $articleId);
        return $article;
    }
}
```

---

### 12. Pipeline Services Configuration (`config/services_pipeline.yaml`)

```yaml
# Streamlined 3-step pipeline services configuration

services:
    _defaults:
        autowire: true
        autoconfigure: true

    # API Key Provider (loads from env or file)
    App\Service\ApiKeyProvider:
        arguments:
            $projectDir: '%kernel.project_dir%'

    # LLM Client Factory
    App\Service\LlmClientFactory: ~

    # LLM Client with model routing (created via factory)
    App\Service\LlmClient:
        public: true
        factory: ['@App\Service\LlmClientFactory', 'create']
        arguments:
            $modelMap:
                research: 'perplexity/sonar'
                content: 'moonshotai/kimi-k2.5'
                default: 'openai/gpt-4.1-mini'

    # Storage
    App\Service\ArticleStorage:
        arguments:
            $projectDir: '%kernel.project_dir%'
            $logger: '@logger'
            $firestoreContent: '@App\Service\FirestoreContentService'

    # Pipeline services
    App\Service\ResearchService: ~
    App\Service\WriterService: ~
    App\Service\ImagePromptFactory: ~
    App\Service\PostProcessor: ~

    # Main pipeline orchestrator
    App\Service\ArticlePipeline: ~
```

---

### 13. Controller (`src/Controller/ArticlePipelineController.php`)

```php
<?php

namespace App\Controller;

use App\Service\ArticlePipeline;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class ArticlePipelineController extends AbstractController
{
    public function __construct(
        private ArticlePipeline $pipeline,
        private LoggerInterface $logger
    ) {}

    #[Route('/admin/generate-article', name: 'admin_article_generate', methods: ['POST'])]
    public function generate(Request $request): JsonResponse
    {
        set_time_limit(180);

        $masterPrompt = $request->request->get('master_prompt');
        $articleId = $request->request->get('article_id');
        $enableResearch = $request->request->get('research', 'true') === 'true';

        if (empty($masterPrompt)) {
            return new JsonResponse(['success' => false, 'error' => 'Master prompt is required'], 400);
        }

        try {
            $result = $this->pipeline->generate($masterPrompt, [
                'article_id' => $articleId,
                'research' => $enableResearch,
                'target_min' => (int)($_ENV['ARTICLE_TARGET_MIN'] ?? 1100),
                'target_max' => (int)($_ENV['ARTICLE_TARGET_MAX'] ?? 1500)
            ]);

            return new JsonResponse(['success' => true, 'data' => $result['data']]);
        } catch (\Exception $e) {
            return new JsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    #[Route('/admin/article/pipeline/info', name: 'admin_pipeline_info', methods: ['GET'])]
    public function info(): JsonResponse
    {
        return new JsonResponse([
            'pipeline' => 'streamlined-3-step',
            'steps' => ['A' => 'Research (optional)', 'B' => 'Write', 'C' => 'Polish & Assets'],
            'models' => [
                'research' => $_ENV['MODEL_RESEARCH'] ?? 'perplexity/sonar',
                'content' => $_ENV['MODEL_CONTENT'] ?? 'anthropic/claude-sonnet-4.5'
            ],
            'config' => [
                'research_enabled' => $_ENV['RESEARCH_ENABLED'] ?? 'true',
                'target_min' => $_ENV['ARTICLE_TARGET_MIN'] ?? 1100,
                'target_max' => $_ENV['ARTICLE_TARGET_MAX'] ?? 1500
            ]
        ]);
    }
}
```

---

## End-to-End Flow Summary

```
1. POST /admin/generate-article { master_prompt: "...", research: true }
   |
2. ArticlePipeline::generate()
   |
   +-- Step A: ResearchService::run()
   |     -> Perplexity Sonar via OpenRouter (web_search: true, temp: 0.1, max_tokens: 2500)
   |     -> Returns: facts[], citations[], summary
   |     -> Saved to Firestore
   |
   +-- Step B: WriterService::write()
   |     -> Kimi K2.5 via OpenRouter (temp: 0.6, max_tokens: 10000, response_format: json_object)
   |     -> System prompt: German, warm tone, 4-U formula titles, inline image prompts
   |     -> Returns: full article JSON (title, content_html, image prompts, etc.)
   |
   +-- Step C: PostProcessor::polish()
   |     -> Strip external links, whitelist HTML tags, cleanse image prompt
   |     -> Generate JSON-LD schema
   |
   +-- Quality Check: ArticleQualityEvaluator::evaluateDraft()
   |     -> Min 750 words, 3 headings, 6 paragraphs, 1 image
   |     -> Retry up to 3 times if failing
   |
   +-- Save to Firestore + Article Catalog
   |
3. POST /admin/article/{id}/generate-all-images
   |
   +-- Hero Image: ComfyClient::generateZTurbo()
   |     -> Loads config/comfy/z-image-turbo.json
   |     -> POST https://comfy.catdone.com/prompt
   |     -> Poll /history/{promptId} until done
   |     -> Download, optimize to multi-res WebP, upload to GCS
   |
   +-- Inline Images (for each <img> in content):
         -> data-imageModel="qwen" -> Z-Image Turbo (ComfyUI)
         -> data-imageModel="nanobanana" -> Nano Banana Pro (FAL AI)
         -> Optimize + upload to GCS
         -> Replace src in article HTML with responsive srcset
```
