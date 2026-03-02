import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  createPiecePasswordHash,
  generatePiecePassword,
  verifyPiecePasswordHash,
} from "@/lib/piece-auth";
import { TOTAL_PIECES } from "@/lib/piece-config";

const SQLITE_FILE = process.env.SQLITE_DB_PATH?.trim()
  ? path.resolve(process.cwd(), process.env.SQLITE_DB_PATH)
  : path.resolve(process.cwd(), "data", "ily.sqlite");

type SqliteDatabase = InstanceType<typeof Database>;

type DatabaseCache = typeof globalThis & {
  __ilySqliteDb?: SqliteDatabase;
};

const databaseCache = globalThis as DatabaseCache;

export interface PieceSaleRecord {
  image_id: number;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_address: string | null;
  buyer_city: string | null;
  buyer_postal_code: string | null;
  buyer_country: string | null;
  sold_at: string;
  source: "legacy_seed" | "checkout" | "dev_seed";
  printify_status: string | null;
  printify_job_id: string | null;
}

export interface PieceSaleAdminRecord extends PieceSaleRecord {
  piece_slug: string | null;
  piece_title: string | null;
  piece_site_updated_at: string | null;
  piece_password: string | null;
  piece_password_issued_at: string | null;
}

export interface PieceCredentialAdminRecord {
  image_id: number;
  admin_visible_password: string;
  issued_at: string;
  last_rotated_at: string;
  password_version: number;
  buyer_name: string | null;
  buyer_email: string | null;
  piece_slug: string | null;
}

export interface PieceSiteRecord {
  image_id: number;
  slug: string;
  title: string;
  description: string;
  link_url: string;
  link_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchasePieceInput {
  imageId: number;
  buyerName: string;
  buyerEmail: string;
  buyerAddress?: string | null;
  buyerCity?: string | null;
  buyerPostalCode?: string | null;
  buyerCountry?: string | null;
}

export interface UpdatePieceSiteInput {
  imageId: number;
  title: string;
  description: string;
  linkUrl: string;
  linkLabel?: string | null;
}

export class PieceAlreadySoldError extends Error {
  readonly imageId: number;

  constructor(imageId: number) {
    super(`Image ${imageId} is already sold.`);
    this.name = "PieceAlreadySoldError";
    this.imageId = imageId;
  }
}

export class InvalidPieceIdError extends Error {
  constructor(imageId: number) {
    super(`Image id must be an integer between 1 and ${TOTAL_PIECES}. Received: ${imageId}`);
    this.name = "InvalidPieceIdError";
  }
}

export class PieceSiteNotFoundError extends Error {
  readonly imageId: number;

  constructor(imageId: number) {
    super(`No piece site found for image ${imageId}.`);
    this.name = "PieceSiteNotFoundError";
    this.imageId = imageId;
  }
}

export class InvalidPieceSiteInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPieceSiteInputError";
  }
}

function ensureDatabaseDirectory() {
  fs.mkdirSync(path.dirname(SQLITE_FILE), { recursive: true });
}

function initializeSchema(database: SqliteDatabase) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS piece_sales (
      image_id INTEGER PRIMARY KEY,
      buyer_name TEXT,
      buyer_email TEXT,
      buyer_address TEXT,
      buyer_city TEXT,
      buyer_postal_code TEXT,
      buyer_country TEXT,
      sold_at TEXT NOT NULL,
      source TEXT NOT NULL,
      printify_status TEXT,
      printify_job_id TEXT,
      printify_payload TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_piece_sales_sold_at
      ON piece_sales (sold_at DESC);

    CREATE TABLE IF NOT EXISTS piece_sites (
      image_id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      link_url TEXT NOT NULL,
      link_label TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (image_id) REFERENCES piece_sales (image_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_piece_sites_slug
      ON piece_sites (slug);

    CREATE TABLE IF NOT EXISTS piece_site_credentials (
      image_id INTEGER PRIMARY KEY,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      admin_visible_password TEXT NOT NULL,
      password_version INTEGER NOT NULL DEFAULT 1,
      issued_at TEXT NOT NULL,
      last_rotated_at TEXT NOT NULL,
      FOREIGN KEY (image_id) REFERENCES piece_sites (image_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS piece_site_password_delivery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_id INTEGER NOT NULL,
      buyer_email TEXT,
      delivery_channel TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (image_id) REFERENCES piece_sites (image_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_piece_site_password_delivery_image
      ON piece_site_password_delivery (image_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bidder_name TEXT NOT NULL,
      bidder_email TEXT NOT NULL,
      bid_amount INTEGER NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bids_created_at
      ON bids (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_bids_amount
      ON bids (bid_amount DESC);

    CREATE TABLE IF NOT EXISTS blog_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      topic_key TEXT,
      hero_image TEXT,
      word_count INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_blog_articles_slug
      ON blog_articles (slug);
    CREATE INDEX IF NOT EXISTS idx_blog_articles_published
      ON blog_articles (published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_blog_articles_category
      ON blog_articles (category);

    CREATE TABLE IF NOT EXISTS blog_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      prompt TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (article_id) REFERENCES blog_articles (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_blog_images_article
      ON blog_images (article_id);

    CREATE TABLE IF NOT EXISTS blog_scheduler_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generation_date TEXT NOT NULL UNIQUE,
      scheduled_hour INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      article_id INTEGER,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_blog_scheduler_date
      ON blog_scheduler_log (generation_date);

    CREATE TABLE IF NOT EXISTS blog_article_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      language TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(article_id, language),
      FOREIGN KEY (article_id) REFERENCES blog_articles (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_blog_translations_article
      ON blog_article_translations (article_id);
    CREATE INDEX IF NOT EXISTS idx_blog_translations_slug
      ON blog_article_translations (slug);

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_session_id TEXT UNIQUE,
      stripe_payment_intent_id TEXT,
      buyer_email TEXT NOT NULL,
      buyer_name TEXT,
      shipping_name TEXT,
      shipping_address1 TEXT,
      shipping_address2 TEXT,
      shipping_city TEXT,
      shipping_state TEXT,
      shipping_postal_code TEXT,
      shipping_country TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      unit_price INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      item_count INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      paid_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_stripe_session
      ON orders (stripe_session_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status
      ON orders (status);

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      image_id INTEGER NOT NULL,
      frame_color TEXT NOT NULL DEFAULT 'black',
      unit_price INTEGER NOT NULL,
      printful_order_id TEXT,
      printful_status TEXT,
      printful_tracking_url TEXT,
      printful_tracking_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      UNIQUE(order_id, image_id)
    );

    CREATE INDEX IF NOT EXISTS idx_order_items_order
      ON order_items (order_id);
  `);
}

function deleteLegacySeededSales(database: SqliteDatabase) {
  database.prepare(`
    DELETE FROM piece_sales
    WHERE source = 'legacy_seed'
  `).run();
}

function createDatabase() {
  ensureDatabaseDirectory();

  const database = new Database(SQLITE_FILE, { timeout: 10000 });
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 10000");
  database.pragma("foreign_keys = ON");

  initializeSchema(database);
  deleteLegacySeededSales(database);

  return database;
}

const db = databaseCache.__ilySqliteDb ?? createDatabase();

// Always re-run schema so new tables (IF NOT EXISTS) are created on cached connections
initializeSchema(db);

// Migrate blog_images: add status + is_selected columns
try { db.exec(`ALTER TABLE blog_images ADD COLUMN status TEXT NOT NULL DEFAULT 'ok'`); } catch { /* column already exists */ }
try { db.exec(`ALTER TABLE blog_images ADD COLUMN is_selected INTEGER NOT NULL DEFAULT 1`); } catch { /* column already exists */ }

if (process.env.NODE_ENV !== "production") {
  databaseCache.__ilySqliteDb = db;
}

deleteLegacySeededSales(db);

const listPieceSalesStatement = db.prepare(`
  SELECT
    sales.image_id,
    sales.buyer_name,
    sales.buyer_email,
    sales.buyer_address,
    sales.buyer_city,
    sales.buyer_postal_code,
    sales.buyer_country,
    sales.sold_at,
    sales.source,
    sales.printify_status,
    sales.printify_job_id,
    site.slug AS piece_slug,
    site.title AS piece_title,
    site.updated_at AS piece_site_updated_at,
    credential.admin_visible_password AS piece_password,
    credential.issued_at AS piece_password_issued_at
  FROM piece_sales AS sales
  LEFT JOIN piece_sites AS site
    ON site.image_id = sales.image_id
  LEFT JOIN piece_site_credentials AS credential
    ON credential.image_id = sales.image_id
  ORDER BY sales.sold_at DESC, sales.image_id ASC
`);

const listSoldImageIdsStatement = db.prepare(`
  SELECT image_id
  FROM piece_sales
  ORDER BY image_id ASC
`);

const countSoldPiecesStatement = db.prepare(`
  SELECT COUNT(*) AS sold_count
  FROM piece_sales
`);

const selectPieceSaleByImageStatement = db.prepare(`
  SELECT
    image_id,
    buyer_name,
    buyer_email,
    buyer_address,
    buyer_city,
    buyer_postal_code,
    buyer_country,
    sold_at,
    source,
    printify_status,
    printify_job_id
  FROM piece_sales
  WHERE image_id = ?
`);

const insertPieceSaleStatement = db.prepare(`
  INSERT INTO piece_sales (
    image_id,
    buyer_name,
    buyer_email,
    buyer_address,
    buyer_city,
    buyer_postal_code,
    buyer_country,
    sold_at,
    source,
    printify_status,
    printify_job_id,
    printify_payload
  ) VALUES (
    @image_id,
    @buyer_name,
    @buyer_email,
    @buyer_address,
    @buyer_city,
    @buyer_postal_code,
    @buyer_country,
    @sold_at,
    'checkout',
    @printify_status,
    @printify_job_id,
    @printify_payload
  )
`);

const selectPieceSiteBySlugStatement = db.prepare(`
  SELECT
    image_id,
    slug,
    title,
    description,
    link_url,
    link_label,
    created_at,
    updated_at
  FROM piece_sites
  WHERE slug = ?
`);

const selectPieceSiteByImageStatement = db.prepare(`
  SELECT
    image_id,
    slug,
    title,
    description,
    link_url,
    link_label,
    created_at,
    updated_at
  FROM piece_sites
  WHERE image_id = ?
`);

const selectPieceSiteSlugOwnerStatement = db.prepare(`
  SELECT image_id
  FROM piece_sites
  WHERE slug = ?
`);

const selectPieceCredentialByImageStatement = db.prepare(`
  SELECT
    image_id,
    password_hash,
    password_salt,
    admin_visible_password,
    issued_at
  FROM piece_site_credentials
  WHERE image_id = ?
`);

const insertPieceSiteStatement = db.prepare(`
  INSERT INTO piece_sites (
    image_id,
    slug,
    title,
    description,
    link_url,
    link_label,
    created_at,
    updated_at
  ) VALUES (
    @image_id,
    @slug,
    @title,
    @description,
    @link_url,
    @link_label,
    @created_at,
    @updated_at
  )
`);

const updatePieceSiteStatement = db.prepare(`
  UPDATE piece_sites
  SET
    slug = @slug,
    title = @title,
    description = @description,
    link_url = @link_url,
    link_label = @link_label,
    updated_at = @updated_at
  WHERE image_id = @image_id
`);

const insertPieceSiteCredentialStatement = db.prepare(`
  INSERT INTO piece_site_credentials (
    image_id,
    password_hash,
    password_salt,
    admin_visible_password,
    password_version,
    issued_at,
    last_rotated_at
  ) VALUES (
    @image_id,
    @password_hash,
    @password_salt,
    @admin_visible_password,
    1,
    @issued_at,
    @last_rotated_at
  )
`);

const insertPieceSitePasswordDeliveryStatement = db.prepare(`
  INSERT INTO piece_site_password_delivery (
    image_id,
    buyer_email,
    delivery_channel,
    delivery_status,
    created_at,
    updated_at
  ) VALUES (
    @image_id,
    @buyer_email,
    'email_stub',
    @delivery_status,
    @created_at,
    @updated_at
  )
`);

const listCheckoutSalesWithoutSiteStatement = db.prepare(`
  SELECT
    sales.image_id,
    sales.buyer_email
  FROM piece_sales AS sales
  LEFT JOIN piece_sites AS site
    ON site.image_id = sales.image_id
  WHERE sales.source = 'checkout'
    AND site.image_id IS NULL
  ORDER BY sales.image_id ASC
`);

const listPieceCredentialsStatement = db.prepare(`
  SELECT c.image_id, c.admin_visible_password, c.issued_at, c.last_rotated_at, c.password_version,
         s.buyer_name, s.buyer_email, site.slug AS piece_slug
  FROM piece_site_credentials AS c
  LEFT JOIN piece_sales AS s ON s.image_id = c.image_id
  LEFT JOIN piece_sites AS site ON site.image_id = c.image_id
  ORDER BY c.last_rotated_at DESC
`);

const countPieceCredentialsStatement = db.prepare(`
  SELECT COUNT(*) AS credential_count FROM piece_site_credentials
`);

const updatePieceCredentialStatement = db.prepare(`
  UPDATE piece_site_credentials
  SET password_hash = @password_hash,
      password_salt = @password_salt,
      admin_visible_password = @admin_visible_password,
      password_version = password_version + 1,
      last_rotated_at = @last_rotated_at
  WHERE image_id = @image_id
`);

function isSqliteConstraintError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String((error as { code?: string }).code ?? "") : "";
  return code.startsWith("SQLITE_CONSTRAINT");
}

function assertValidImageId(imageId: number) {
  if (!Number.isInteger(imageId) || imageId < 1 || imageId > TOTAL_PIECES) {
    throw new InvalidPieceIdError(imageId);
  }
}

function normalizeOptionalValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function slugifyPieceName(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || "piece";
}

function resolveUniquePieceSlug(baseSlug: string, imageId?: number) {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = selectPieceSiteSlugOwnerStatement.get(candidate) as
      | { image_id: number }
      | undefined;

    if (!existing || (typeof imageId === "number" && existing.image_id === imageId)) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function createDefaultPieceSiteContent(imageId: number) {
  const title = `Piece ${imageId}`;
  return {
    title,
    description: `This is piece #${imageId} from the I LAUGH YOU artwork.`,
    linkUrl: "https://i-laugh-you.com",
    linkLabel: "I LAUGH YOU",
  };
}

function createPieceSiteArtifacts(imageId: number, buyerEmail: string | null) {
  const existingSite = selectPieceSiteByImageStatement.get(imageId) as
    | PieceSiteRecord
    | undefined;
  const now = new Date().toISOString();

  if (!existingSite) {
    const defaults = createDefaultPieceSiteContent(imageId);
    const baseSlug = slugifyPieceName(defaults.title);
    const slug = resolveUniquePieceSlug(baseSlug, imageId);

    insertPieceSiteStatement.run({
      image_id: imageId,
      slug,
      title: defaults.title,
      description: defaults.description,
      link_url: defaults.linkUrl,
      link_label: defaults.linkLabel,
      created_at: now,
      updated_at: now,
    });
  }

  const existingCredential = selectPieceCredentialByImageStatement.get(imageId) as
    | {
        image_id: number;
      }
    | undefined;

  if (!existingCredential) {
    const plaintextPassword = generatePiecePassword();
    const passwordHash = createPiecePasswordHash(plaintextPassword);

    insertPieceSiteCredentialStatement.run({
      image_id: imageId,
      password_hash: passwordHash.hash,
      password_salt: passwordHash.salt,
      admin_visible_password: plaintextPassword,
      issued_at: now,
      last_rotated_at: now,
    });

    insertPieceSitePasswordDeliveryStatement.run({
      image_id: imageId,
      buyer_email: normalizeOptionalValue(buyerEmail),
      delivery_status: normalizeOptionalValue(buyerEmail) ? "queued" : "unavailable",
      created_at: now,
      updated_at: now,
    });
  }
}

function createPrintifyDraft(input: PurchasePieceInput) {
  const requestId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const payload = {
    requestId,
    createdAt,
    imageId: input.imageId,
    customer: {
      name: input.buyerName,
      email: input.buyerEmail,
      address: normalizeOptionalValue(input.buyerAddress),
      city: normalizeOptionalValue(input.buyerCity),
      postalCode: normalizeOptionalValue(input.buyerPostalCode),
      country: normalizeOptionalValue(input.buyerCountry),
    },
    mode: "dummy_printify_draft",
  };

  return {
    printifyStatus: "queued_dummy",
    printifyJobId: `printify-dummy-${requestId}`,
    printifyPayload: JSON.stringify(payload),
  };
}

const backfillPieceSitesForExistingSalesTransaction = db.transaction(() => {
  const salesWithoutSites = listCheckoutSalesWithoutSiteStatement.all() as {
    image_id: number;
    buyer_email: string | null;
  }[];

  for (const sale of salesWithoutSites) {
    createPieceSiteArtifacts(sale.image_id, sale.buyer_email);
  }
});

backfillPieceSitesForExistingSalesTransaction();

function seedDevDummyData() {
  if (process.env.NODE_ENV === "production") return;

  const { sold_count } = countSoldPiecesStatement.get() as { sold_count: number };
  if (sold_count > 0) return;

  const now = new Date();
  const devSeedInsert = db.prepare(`
    INSERT OR IGNORE INTO piece_sales (
      image_id, buyer_name, buyer_email, buyer_address,
      buyer_city, buyer_postal_code, buyer_country,
      sold_at, source, printify_status, printify_job_id, printify_payload
    ) VALUES (
      @image_id, @buyer_name, @buyer_email, @buyer_address,
      @buyer_city, @buyer_postal_code, @buyer_country,
      @sold_at, 'dev_seed', @printify_status, @printify_job_id, NULL
    )
  `);

  const seeds = [
    {
      image_id: 42,
      buyer_name: "Max Mustermann",
      buyer_email: "max@example.com",
      buyer_address: "Musterstraße 123",
      buyer_city: "Berlin",
      buyer_postal_code: "10115",
      buyer_country: "Germany",
      sold_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      printify_status: "pending",
      printify_job_id: "pfy_abc123",
      slug: "piece-42",
      title: "Sunset Dreams",
      description: "A beautiful piece capturing the essence of a golden sunset over rolling hills. This artwork brings warmth and tranquility to any space.",
      link_url: "https://example.com/sunset-dreams",
      link_label: "View on Gallery",
      password: "demo1234",
    },
    {
      image_id: 1337,
      buyer_name: "Erika Musterfrau",
      buyer_email: "erika@example.de",
      buyer_address: "Hauptstraße 45",
      buyer_city: "München",
      buyer_postal_code: "80331",
      buyer_country: "Germany",
      sold_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      printify_status: "shipped",
      printify_job_id: "pfy_xyz789",
      slug: "piece-1337",
      title: "Ocean Waves",
      description: "Deep blue ocean waves crashing against rocky shores. Feel the power and serenity of the sea.",
      link_url: "https://example.com/ocean-waves",
      link_label: "Explore More",
      password: "wave5678",
    },
    {
      image_id: 8888,
      buyer_name: "John Doe",
      buyer_email: "john@example.org",
      buyer_address: "123 Main St",
      buyer_city: "New York",
      buyer_postal_code: "10001",
      buyer_country: "USA",
      sold_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      printify_status: "delivered",
      printify_job_id: "pfy_def456",
      slug: "lucky-eight",
      title: "Lucky Eight",
      description: "An auspicious piece featuring the number 8, symbolizing prosperity and good fortune.",
      link_url: "https://example.com/lucky-eight",
      link_label: "Learn More",
      password: "luck8888",
    },
  ];

  const seedTransaction = db.transaction(() => {
    for (const seed of seeds) {
      devSeedInsert.run({
        image_id: seed.image_id,
        buyer_name: seed.buyer_name,
        buyer_email: seed.buyer_email,
        buyer_address: seed.buyer_address,
        buyer_city: seed.buyer_city,
        buyer_postal_code: seed.buyer_postal_code,
        buyer_country: seed.buyer_country,
        sold_at: seed.sold_at,
        printify_status: seed.printify_status,
        printify_job_id: seed.printify_job_id,
      });

      const seedNow = new Date().toISOString();

      insertPieceSiteStatement.run({
        image_id: seed.image_id,
        slug: seed.slug,
        title: seed.title,
        description: seed.description,
        link_url: seed.link_url,
        link_label: seed.link_label,
        created_at: seedNow,
        updated_at: seedNow,
      });

      const passwordHash = createPiecePasswordHash(seed.password);
      insertPieceSiteCredentialStatement.run({
        image_id: seed.image_id,
        password_hash: passwordHash.hash,
        password_salt: passwordHash.salt,
        admin_visible_password: seed.password,
        issued_at: seedNow,
        last_rotated_at: seedNow,
      });
    }
  });

  seedTransaction();
}

seedDevDummyData();

const purchasePieceTransaction = db.transaction((input: PurchasePieceInput) => {
  assertValidImageId(input.imageId);

  const buyerName = input.buyerName.trim();
  const buyerEmail = input.buyerEmail.trim();

  const printifyDraft = createPrintifyDraft({
    ...input,
    buyerName,
    buyerEmail,
  });

  try {
    insertPieceSaleStatement.run({
      image_id: input.imageId,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_address: normalizeOptionalValue(input.buyerAddress),
      buyer_city: normalizeOptionalValue(input.buyerCity),
      buyer_postal_code: normalizeOptionalValue(input.buyerPostalCode),
      buyer_country: normalizeOptionalValue(input.buyerCountry),
      sold_at: new Date().toISOString(),
      printify_status: printifyDraft.printifyStatus,
      printify_job_id: printifyDraft.printifyJobId,
      printify_payload: printifyDraft.printifyPayload,
    });
  } catch (error) {
    if (isSqliteConstraintError(error)) {
      throw new PieceAlreadySoldError(input.imageId);
    }

    throw error;
  }

  createPieceSiteArtifacts(input.imageId, buyerEmail);

  const createdSale = selectPieceSaleByImageStatement.get(input.imageId) as
    | PieceSaleRecord
    | undefined;

  if (!createdSale) {
    throw new Error("Failed to load created sale row.");
  }

  return createdSale;
});

export function listPieceSales() {
  return listPieceSalesStatement.all() as PieceSaleAdminRecord[];
}

export function getPieceSiteBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const site = selectPieceSiteBySlugStatement.get(normalizedSlug) as
    | PieceSiteRecord
    | undefined;
  return site ?? null;
}

export function getPieceSiteByImageId(imageId: number) {
  assertValidImageId(imageId);
  const site = selectPieceSiteByImageStatement.get(imageId) as
    | PieceSiteRecord
    | undefined;
  return site ?? null;
}

export function verifyPieceSitePassword(imageId: number, password: string) {
  assertValidImageId(imageId);

  const credential = selectPieceCredentialByImageStatement.get(imageId) as
    | {
        image_id: number;
        password_hash: string;
        password_salt: string;
      }
    | undefined;

  if (!credential || !password.trim()) {
    return false;
  }

  return verifyPiecePasswordHash(
    password,
    credential.password_hash,
    credential.password_salt
  );
}

const updatePieceSiteTransaction = db.transaction((input: UpdatePieceSiteInput) => {
  assertValidImageId(input.imageId);

  const existing = selectPieceSiteByImageStatement.get(input.imageId) as
    | PieceSiteRecord
    | undefined;

  if (!existing) {
    throw new PieceSiteNotFoundError(input.imageId);
  }

  const title = input.title.trim();
  const description = input.description.trim();
  const linkUrl = input.linkUrl.trim();
  const linkLabel = normalizeOptionalValue(input.linkLabel);

  if (!title) {
    throw new InvalidPieceSiteInputError("Title is required.");
  }

  if (!description) {
    throw new InvalidPieceSiteInputError("Description is required.");
  }

  if (!linkUrl) {
    throw new InvalidPieceSiteInputError("Link URL is required.");
  }

  if (!isValidHttpUrl(linkUrl)) {
    throw new InvalidPieceSiteInputError("Link URL must use http:// or https://.");
  }

  const baseSlug = slugifyPieceName(title);
  const nextSlug = resolveUniquePieceSlug(baseSlug, input.imageId);
  const updatedAt = new Date().toISOString();

  updatePieceSiteStatement.run({
    image_id: input.imageId,
    slug: nextSlug,
    title,
    description,
    link_url: linkUrl,
    link_label: linkLabel,
    updated_at: updatedAt,
  });

  const updated = selectPieceSiteByImageStatement.get(input.imageId) as
    | PieceSiteRecord
    | undefined;

  if (!updated) {
    throw new Error("Failed to load updated piece site row.");
  }

  return updated;
});

export function updatePieceSite(input: UpdatePieceSiteInput) {
  return updatePieceSiteTransaction(input);
}

export function listSoldImageIds() {
  return (listSoldImageIdsStatement.all() as { image_id: number }[]).map(
    (entry) => entry.image_id
  );
}

export function getSoldPieceCount() {
  const row = countSoldPiecesStatement.get() as { sold_count: number };
  return row.sold_count;
}

export function purchasePiece(input: PurchasePieceInput) {
  return purchasePieceTransaction(input);
}

export function listPieceCredentials() {
  return listPieceCredentialsStatement.all() as PieceCredentialAdminRecord[];
}

export function getPieceCredentialCount() {
  const row = countPieceCredentialsStatement.get() as { credential_count: number };
  return row.credential_count;
}

export function regeneratePieceCredential(imageId: number) {
  assertValidImageId(imageId);

  const existing = selectPieceCredentialByImageStatement.get(imageId) as
    | { image_id: number }
    | undefined;

  if (!existing) {
    return null;
  }

  const plaintextPassword = generatePiecePassword();
  const passwordHash = createPiecePasswordHash(plaintextPassword);
  const now = new Date().toISOString();

  updatePieceCredentialStatement.run({
    image_id: imageId,
    password_hash: passwordHash.hash,
    password_salt: passwordHash.salt,
    admin_visible_password: plaintextPassword,
    last_rotated_at: now,
  });

  return { newPassword: plaintextPassword, lastRotatedAt: now };
}

export function getLegacySoldImageIds() {
  return [];
}

export function getSqliteFilePath() {
  return SQLITE_FILE;
}

// --- Bids ---

export interface BidRecord {
  id: number;
  bidder_name: string;
  bidder_email: string;
  bid_amount: number;
  message: string | null;
  created_at: string;
}

export interface CreateBidInput {
  bidderName: string;
  bidderEmail: string;
  bidAmount: number;
  message?: string | null;
}

const insertBidStatement = db.prepare(`
  INSERT INTO bids (
    bidder_name,
    bidder_email,
    bid_amount,
    message,
    created_at
  ) VALUES (
    @bidder_name,
    @bidder_email,
    @bid_amount,
    @message,
    @created_at
  )
`);

const listBidsStatement = db.prepare(`
  SELECT id, bidder_name, bidder_email, bid_amount, message, created_at
  FROM bids
  ORDER BY bid_amount DESC, created_at ASC
`);

const getHighestBidStatement = db.prepare(`
  SELECT id, bidder_name, bidder_email, bid_amount, message, created_at
  FROM bids
  ORDER BY bid_amount DESC
  LIMIT 1
`);

const countBidsStatement = db.prepare(`
  SELECT COUNT(*) AS bid_count FROM bids
`);

export function createBid(input: CreateBidInput): BidRecord {
  const bidderName = input.bidderName.trim();
  const bidderEmail = input.bidderEmail.trim();
  const bidAmount = Math.max(1, Math.floor(input.bidAmount));
  const message = normalizeOptionalValue(input.message);
  const createdAt = new Date().toISOString();

  const result = insertBidStatement.run({
    bidder_name: bidderName,
    bidder_email: bidderEmail,
    bid_amount: bidAmount,
    message,
    created_at: createdAt,
  }) as { lastInsertRowid: number | bigint };

  return {
    id: Number(result.lastInsertRowid),
    bidder_name: bidderName,
    bidder_email: bidderEmail,
    bid_amount: bidAmount,
    message,
    created_at: createdAt,
  };
}

export function listBids(): BidRecord[] {
  return listBidsStatement.all() as BidRecord[];
}

export function getHighestBid(): BidRecord | null {
  const row = getHighestBidStatement.get() as BidRecord | undefined;
  return row ?? null;
}

export function getBidCount(): number {
  const row = countBidsStatement.get() as { bid_count: number };
  return row.bid_count;
}

// --- Blog ---

export interface BlogArticleRecord {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  topic_key: string | null;
  hero_image: string | null;
  word_count: number;
  published_at: string;
  created_at: string;
}

export interface BlogImageRecord {
  id: number;
  article_id: number;
  file_path: string;
  alt_text: string;
  prompt: string | null;
  position: number;
  status: string;
  is_selected: number;
  created_at: string;
}

export interface BlogSchedulerLogRecord {
  id: number;
  generation_date: string;
  scheduled_hour: number;
  status: string;
  article_id: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const insertBlogArticleStatement = db.prepare(`
  INSERT INTO blog_articles (
    slug, title, excerpt, content, category, tags,
    topic_key, hero_image, word_count, published_at, created_at
  ) VALUES (
    @slug, @title, @excerpt, @content, @category, @tags,
    @topic_key, @hero_image, @word_count, @published_at, @created_at
  )
`);

const selectBlogArticleBySlugStatement = db.prepare(`
  SELECT * FROM blog_articles WHERE slug = ?
`);

const selectBlogArticleByIdStatement = db.prepare(`
  SELECT * FROM blog_articles WHERE id = ?
`);

const listBlogArticlesStatement = db.prepare(`
  SELECT id, slug, title, excerpt, category, tags, hero_image, word_count, published_at
  FROM blog_articles
  ORDER BY published_at DESC
  LIMIT ? OFFSET ?
`);

const countBlogArticlesStatement = db.prepare(`
  SELECT COUNT(*) AS total FROM blog_articles
`);

const listRecentBlogTopicKeysStatement = db.prepare(`
  SELECT topic_key FROM blog_articles
  WHERE topic_key IS NOT NULL
  ORDER BY published_at DESC
  LIMIT ?
`);

const insertBlogImageStatement = db.prepare(`
  INSERT INTO blog_images (
    article_id, file_path, alt_text, prompt, position, created_at
  ) VALUES (
    @article_id, @file_path, @alt_text, @prompt, @position, @created_at
  )
`);

const listBlogImagesByArticleStatement = db.prepare(`
  SELECT * FROM blog_images WHERE article_id = ? ORDER BY position ASC
`);

const listAllBlogImagesStatement = db.prepare(`
  SELECT
    img.*,
    art.title AS article_title,
    art.slug AS article_slug
  FROM blog_images img
  JOIN blog_articles art ON art.id = img.article_id
  ORDER BY img.created_at DESC
  LIMIT ? OFFSET ?
`);

const countAllBlogImagesStatement = db.prepare(`
  SELECT COUNT(*) AS total FROM blog_images
`);

const insertBlogSchedulerLogStatement = db.prepare(`
  INSERT INTO blog_scheduler_log (
    generation_date, scheduled_hour, status, created_at
  ) VALUES (
    @generation_date, @scheduled_hour, 'pending', @created_at
  )
`);

const selectBlogSchedulerLogByDateStatement = db.prepare(`
  SELECT * FROM blog_scheduler_log WHERE generation_date = ?
`);

const updateBlogSchedulerLogStatusStatement = db.prepare(`
  UPDATE blog_scheduler_log
  SET status = @status,
      article_id = @article_id,
      error_message = @error_message,
      started_at = @started_at,
      completed_at = @completed_at
  WHERE generation_date = @generation_date
`);

export function insertBlogArticle(input: {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  topicKey: string | null;
  heroImage: string | null;
  wordCount: number;
}): BlogArticleRecord {
  const now = new Date().toISOString();

  let slug = input.slug;
  let suffix = 2;
  while (selectBlogArticleBySlugStatement.get(slug)) {
    slug = `${input.slug}-${suffix}`;
    suffix++;
  }

  const result = insertBlogArticleStatement.run({
    slug,
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    category: input.category,
    tags: JSON.stringify(input.tags),
    topic_key: input.topicKey,
    hero_image: input.heroImage,
    word_count: input.wordCount,
    published_at: now,
    created_at: now,
  }) as { lastInsertRowid: number | bigint };

  return selectBlogArticleByIdStatement.get(
    Number(result.lastInsertRowid)
  ) as BlogArticleRecord;
}

export function getBlogArticleBySlug(slug: string): BlogArticleRecord | null {
  const row = selectBlogArticleBySlugStatement.get(slug) as
    | BlogArticleRecord
    | undefined;
  return row ?? null;
}

export function listBlogArticles(
  page: number = 1,
  perPage: number = 12
): { articles: BlogArticleRecord[]; total: number; pages: number } {
  const offset = (page - 1) * perPage;
  const articles = listBlogArticlesStatement.all(perPage, offset) as BlogArticleRecord[];
  const { total } = countBlogArticlesStatement.get() as { total: number };
  return { articles, total, pages: Math.ceil(total / perPage) };
}

export function getRecentBlogTopicKeys(limit: number = 10): string[] {
  const rows = listRecentBlogTopicKeysStatement.all(limit) as {
    topic_key: string;
  }[];
  return rows.map((r) => r.topic_key);
}

export function insertBlogImage(input: {
  articleId: number;
  filePath: string;
  altText: string;
  prompt: string | null;
  position: number;
}): BlogImageRecord {
  const now = new Date().toISOString();
  const result = insertBlogImageStatement.run({
    article_id: input.articleId,
    file_path: input.filePath,
    alt_text: input.altText,
    prompt: input.prompt,
    position: input.position,
    created_at: now,
  }) as { lastInsertRowid: number | bigint };

  return {
    id: Number(result.lastInsertRowid),
    article_id: input.articleId,
    file_path: input.filePath,
    alt_text: input.altText,
    prompt: input.prompt,
    position: input.position,
    status: "ok",
    is_selected: 1,
    created_at: now,
  };
}

export function getBlogImagesByArticle(articleId: number): BlogImageRecord[] {
  return listBlogImagesByArticleStatement.all(articleId) as BlogImageRecord[];
}

export function listAllBlogImages(
  page: number = 1,
  perPage: number = 24
): {
  images: (BlogImageRecord & { article_title: string; article_slug: string })[];
  total: number;
  pages: number;
} {
  const offset = (page - 1) * perPage;
  const images = listAllBlogImagesStatement.all(perPage, offset) as (BlogImageRecord & {
    article_title: string;
    article_slug: string;
  })[];
  const { total } = countAllBlogImagesStatement.get() as { total: number };
  return { images, total, pages: Math.ceil(total / perPage) };
}

export function getOrCreateBlogSchedulerLog(
  date: string,
  scheduledHour: number
): BlogSchedulerLogRecord {
  const existing = selectBlogSchedulerLogByDateStatement.get(date) as
    | BlogSchedulerLogRecord
    | undefined;
  if (existing) return existing;

  insertBlogSchedulerLogStatement.run({
    generation_date: date,
    scheduled_hour: scheduledHour,
    created_at: new Date().toISOString(),
  });

  return selectBlogSchedulerLogByDateStatement.get(date) as BlogSchedulerLogRecord;
}

export function updateBlogSchedulerLog(input: {
  generationDate: string;
  status: string;
  articleId?: number | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}): void {
  updateBlogSchedulerLogStatusStatement.run({
    generation_date: input.generationDate,
    status: input.status,
    article_id: input.articleId ?? null,
    error_message: input.errorMessage ?? null,
    started_at: input.startedAt ?? null,
    completed_at: input.completedAt ?? null,
  });
}

// --- Blog Image Check Gallery ---

const listBlogImageSetsStatement = db.prepare(`
  SELECT
    img.*,
    art.title AS article_title,
    art.slug AS article_slug,
    art.hero_image AS article_hero_image
  FROM blog_images img
  JOIN blog_articles art ON art.id = img.article_id
  ORDER BY img.article_id DESC, img.position ASC, img.id ASC
`);

const getBlogImageByIdStatement = db.prepare(`
  SELECT * FROM blog_images WHERE id = ?
`);

const markBlogImageSetFailedStatement = db.prepare(`
  UPDATE blog_images
  SET status = 'failed'
  WHERE article_id = @article_id AND position = @position
`);

const deselectBlogImageVariantsStatement = db.prepare(`
  UPDATE blog_images
  SET is_selected = 0
  WHERE article_id = @article_id AND position = @position
`);

const selectBlogImageVariantStatement = db.prepare(`
  UPDATE blog_images
  SET is_selected = 1, status = 'ok'
  WHERE id = @id
`);

const clearBlogImageSetFailedStatement = db.prepare(`
  UPDATE blog_images
  SET status = 'ok'
  WHERE article_id = @article_id AND position = @position
`);

const insertBlogImageVariantStatement = db.prepare(`
  INSERT INTO blog_images (
    article_id, file_path, alt_text, prompt, position, status, is_selected, created_at
  ) VALUES (
    @article_id, @file_path, @alt_text, @prompt, @position, 'ok', 0, @created_at
  )
`);

export function listBlogImageSets(): (BlogImageRecord & {
  article_title: string;
  article_slug: string;
  article_hero_image: string | null;
})[] {
  return listBlogImageSetsStatement.all() as (BlogImageRecord & {
    article_title: string;
    article_slug: string;
    article_hero_image: string | null;
  })[];
}

export function getBlogImageById(id: number): BlogImageRecord | null {
  const row = getBlogImageByIdStatement.get(id) as BlogImageRecord | undefined;
  return row ?? null;
}

export function markBlogImageSetFailed(articleId: number, position: number): void {
  markBlogImageSetFailedStatement.run({ article_id: articleId, position });
}

const selectBlogImageVariantTransaction = db.transaction(
  (imageId: number, articleId: number, position: number) => {
    deselectBlogImageVariantsStatement.run({ article_id: articleId, position });
    selectBlogImageVariantStatement.run({ id: imageId });
    clearBlogImageSetFailedStatement.run({ article_id: articleId, position });
  }
);

export function selectBlogImageVariant(
  imageId: number,
  articleId: number,
  position: number
): void {
  selectBlogImageVariantTransaction(imageId, articleId, position);
}

export function insertBlogImageVariant(input: {
  articleId: number;
  filePath: string;
  altText: string;
  prompt: string | null;
  position: number;
}): BlogImageRecord {
  const now = new Date().toISOString();
  const result = insertBlogImageVariantStatement.run({
    article_id: input.articleId,
    file_path: input.filePath,
    alt_text: input.altText,
    prompt: input.prompt,
    position: input.position,
    created_at: now,
  }) as { lastInsertRowid: number | bigint };

  return {
    id: Number(result.lastInsertRowid),
    article_id: input.articleId,
    file_path: input.filePath,
    alt_text: input.altText,
    prompt: input.prompt,
    position: input.position,
    status: "ok",
    is_selected: 0,
    created_at: now,
  };
}

// --- Blog Article Translations ---

export interface BlogArticleTranslationRecord {
  id: number;
  article_id: number;
  language: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  created_at: string;
}

const upsertBlogArticleTranslationStatement = db.prepare(`
  INSERT INTO blog_article_translations (
    article_id, language, title, slug, excerpt, content, created_at
  ) VALUES (
    @article_id, @language, @title, @slug, @excerpt, @content, @created_at
  )
  ON CONFLICT(article_id, language) DO UPDATE SET
    title = excluded.title,
    slug = excluded.slug,
    excerpt = excluded.excerpt,
    content = excluded.content,
    created_at = excluded.created_at
`);

const selectBlogArticleTranslationStatement = db.prepare(`
  SELECT * FROM blog_article_translations
  WHERE article_id = ? AND language = ?
`);

const listBlogArticleTranslationsStatement = db.prepare(`
  SELECT * FROM blog_article_translations
  WHERE article_id = ?
  ORDER BY language ASC
`);

const selectBlogArticleByIdForTranslation = db.prepare(`
  SELECT * FROM blog_articles WHERE id = ?
`);

export function upsertBlogArticleTranslation(input: {
  articleId: number;
  language: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
}): BlogArticleTranslationRecord {
  const now = new Date().toISOString();

  upsertBlogArticleTranslationStatement.run({
    article_id: input.articleId,
    language: input.language,
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content: input.content,
    created_at: now,
  });

  return selectBlogArticleTranslationStatement.get(
    input.articleId,
    input.language
  ) as BlogArticleTranslationRecord;
}

export function getBlogArticleTranslation(
  articleId: number,
  language: string
): BlogArticleTranslationRecord | null {
  const row = selectBlogArticleTranslationStatement.get(articleId, language) as
    | BlogArticleTranslationRecord
    | undefined;
  return row ?? null;
}

export function listBlogArticleTranslations(
  articleId: number
): BlogArticleTranslationRecord[] {
  return listBlogArticleTranslationsStatement.all(articleId) as BlogArticleTranslationRecord[];
}

export function getBlogArticleById(id: number): BlogArticleRecord | null {
  const row = selectBlogArticleByIdForTranslation.get(id) as
    | BlogArticleRecord
    | undefined;
  return row ?? null;
}

// --- Orders ---

export interface OrderRecord {
  id: number;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  buyer_email: string;
  buyer_name: string | null;
  shipping_name: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  currency: string;
  unit_price: number;
  total_amount: number;
  item_count: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
}

export interface OrderItemRecord {
  id: number;
  order_id: number;
  image_id: number;
  frame_color: string;
  unit_price: number;
  printful_order_id: string | null;
  printful_status: string | null;
  printful_tracking_url: string | null;
  printful_tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  stripeSessionId: string;
  buyerEmail: string;
  currency: string;
  unitPrice: number;
  totalAmount: number;
  itemCount: number;
}

export interface CreateOrderItemInput {
  orderId: number;
  imageId: number;
  frameColor: string;
  unitPrice: number;
}

const insertOrderStatement = db.prepare(`
  INSERT INTO orders (
    stripe_session_id,
    buyer_email,
    currency,
    unit_price,
    total_amount,
    item_count,
    status,
    created_at,
    updated_at
  ) VALUES (
    @stripe_session_id,
    @buyer_email,
    @currency,
    @unit_price,
    @total_amount,
    @item_count,
    'pending',
    @created_at,
    @updated_at
  )
`);

const selectOrderByStripeSessionStatement = db.prepare(`
  SELECT * FROM orders WHERE stripe_session_id = ?
`);

const selectOrderByIdStatement = db.prepare(`
  SELECT * FROM orders WHERE id = ?
`);

const updateOrderStatusStatement = db.prepare(`
  UPDATE orders
  SET status = @status,
      stripe_payment_intent_id = COALESCE(@stripe_payment_intent_id, stripe_payment_intent_id),
      buyer_name = COALESCE(@buyer_name, buyer_name),
      shipping_name = COALESCE(@shipping_name, shipping_name),
      shipping_address1 = COALESCE(@shipping_address1, shipping_address1),
      shipping_address2 = COALESCE(@shipping_address2, shipping_address2),
      shipping_city = COALESCE(@shipping_city, shipping_city),
      shipping_state = COALESCE(@shipping_state, shipping_state),
      shipping_postal_code = COALESCE(@shipping_postal_code, shipping_postal_code),
      shipping_country = COALESCE(@shipping_country, shipping_country),
      paid_at = COALESCE(@paid_at, paid_at),
      updated_at = @updated_at
  WHERE id = @id
`);

const insertOrderItemStatement = db.prepare(`
  INSERT INTO order_items (
    order_id,
    image_id,
    frame_color,
    unit_price,
    created_at,
    updated_at
  ) VALUES (
    @order_id,
    @image_id,
    @frame_color,
    @unit_price,
    @created_at,
    @updated_at
  )
`);

const selectOrderItemsByOrderStatement = db.prepare(`
  SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC
`);

const updateOrderItemPrintfulStatement = db.prepare(`
  UPDATE order_items
  SET printful_order_id = @printful_order_id,
      printful_status = @printful_status,
      printful_tracking_url = @printful_tracking_url,
      printful_tracking_number = @printful_tracking_number,
      updated_at = @updated_at
  WHERE id = @id
`);

const checkPiecesAvailableStatement = db.prepare(`
  SELECT image_id FROM piece_sales WHERE image_id IN (SELECT value FROM json_each(?))
`);

export function createOrder(input: CreateOrderInput): OrderRecord {
  const now = new Date().toISOString();

  const result = insertOrderStatement.run({
    stripe_session_id: input.stripeSessionId,
    buyer_email: input.buyerEmail,
    currency: input.currency,
    unit_price: input.unitPrice,
    total_amount: input.totalAmount,
    item_count: input.itemCount,
    created_at: now,
    updated_at: now,
  }) as { lastInsertRowid: number | bigint };

  return selectOrderByIdStatement.get(Number(result.lastInsertRowid)) as OrderRecord;
}

export function getOrderByStripeSession(sessionId: string): OrderRecord | null {
  const row = selectOrderByStripeSessionStatement.get(sessionId) as
    | OrderRecord
    | undefined;
  return row ?? null;
}

export function getOrderById(orderId: number): OrderRecord | null {
  const row = selectOrderByIdStatement.get(orderId) as OrderRecord | undefined;
  return row ?? null;
}

export function updateOrderStatus(input: {
  id: number;
  status: string;
  stripePaymentIntentId?: string | null;
  buyerName?: string | null;
  shippingName?: string | null;
  shippingAddress1?: string | null;
  shippingAddress2?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPostalCode?: string | null;
  shippingCountry?: string | null;
  paidAt?: string | null;
}): void {
  updateOrderStatusStatement.run({
    id: input.id,
    status: input.status,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    buyer_name: input.buyerName ?? null,
    shipping_name: input.shippingName ?? null,
    shipping_address1: input.shippingAddress1 ?? null,
    shipping_address2: input.shippingAddress2 ?? null,
    shipping_city: input.shippingCity ?? null,
    shipping_state: input.shippingState ?? null,
    shipping_postal_code: input.shippingPostalCode ?? null,
    shipping_country: input.shippingCountry ?? null,
    paid_at: input.paidAt ?? null,
    updated_at: new Date().toISOString(),
  });
}

export function getOrderItems(orderId: number): OrderItemRecord[] {
  return selectOrderItemsByOrderStatement.all(orderId) as OrderItemRecord[];
}

export function updateOrderItemPrintful(input: {
  id: number;
  printfulOrderId?: string | null;
  printfulStatus?: string | null;
  printfulTrackingUrl?: string | null;
  printfulTrackingNumber?: string | null;
}): void {
  updateOrderItemPrintfulStatement.run({
    id: input.id,
    printful_order_id: input.printfulOrderId ?? null,
    printful_status: input.printfulStatus ?? null,
    printful_tracking_url: input.printfulTrackingUrl ?? null,
    printful_tracking_number: input.printfulTrackingNumber ?? null,
    updated_at: new Date().toISOString(),
  });
}

export function checkPiecesAvailable(imageIds: number[]): number[] {
  const soldRows = checkPiecesAvailableStatement.all(
    JSON.stringify(imageIds)
  ) as { image_id: number }[];
  const soldSet = new Set(soldRows.map((r) => r.image_id));
  return imageIds.filter((id) => !soldSet.has(id));
}

/**
 * Atomically fulfills an order: marks pieces sold, creates order items, updates order status.
 * Returns array of image IDs that were successfully sold (excludes already-sold conflicts).
 */
const fulfillOrderTransactionInner = db.transaction((input: {
  orderId: number;
  buyerEmail: string;
  buyerName: string;
  items: CreateOrderItemInput[];
  shippingName?: string | null;
  shippingAddress1?: string | null;
  shippingAddress2?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPostalCode?: string | null;
  shippingCountry?: string | null;
  stripePaymentIntentId?: string | null;
}) => {
  const now = new Date().toISOString();
  const fulfilledImageIds: number[] = [];
  const conflictedImageIds: number[] = [];

  for (const item of input.items) {
    try {
      insertPieceSaleStatement.run({
        image_id: item.imageId,
        buyer_name: input.buyerName,
        buyer_email: input.buyerEmail,
        buyer_address: input.shippingAddress1 ?? null,
        buyer_city: input.shippingCity ?? null,
        buyer_postal_code: input.shippingPostalCode ?? null,
        buyer_country: input.shippingCountry ?? null,
        sold_at: now,
        printify_status: null,
        printify_job_id: null,
        printify_payload: null,
      });

      insertOrderItemStatement.run({
        order_id: input.orderId,
        image_id: item.imageId,
        frame_color: item.frameColor,
        unit_price: item.unitPrice,
        created_at: now,
        updated_at: now,
      });

      createPieceSiteArtifacts(item.imageId, input.buyerEmail);
      fulfilledImageIds.push(item.imageId);
    } catch (error) {
      if (isSqliteConstraintError(error)) {
        conflictedImageIds.push(item.imageId);
      } else {
        throw error;
      }
    }
  }

  updateOrderStatusStatement.run({
    id: input.orderId,
    status: conflictedImageIds.length > 0 && fulfilledImageIds.length > 0
      ? "partial"
      : conflictedImageIds.length > 0
        ? "conflict"
        : "paid",
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    buyer_name: input.buyerName,
    shipping_name: input.shippingName ?? null,
    shipping_address1: input.shippingAddress1 ?? null,
    shipping_address2: input.shippingAddress2 ?? null,
    shipping_city: input.shippingCity ?? null,
    shipping_state: input.shippingState ?? null,
    shipping_postal_code: input.shippingPostalCode ?? null,
    shipping_country: input.shippingCountry ?? null,
    paid_at: now,
    updated_at: now,
  });

  return { fulfilledImageIds, conflictedImageIds };
});

export function fulfillOrderTransaction(input: Parameters<typeof fulfillOrderTransactionInner>[0]) {
  return fulfillOrderTransactionInner(input);
}
