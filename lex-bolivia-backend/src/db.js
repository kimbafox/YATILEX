const crypto = require("crypto");
const { Pool } = require("pg");
const { documents: staticDocuments } = require("./config/documents");

function buildConnectionStringFromParts() {
  const host = process.env.PGHOST || process.env.POSTGRES_HOST;
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || "5432";
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB;

  if (!host || !user || !password || !database) {
    return "";
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  buildConnectionStringFromParts();

const pool = connectionString
  ? new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  })
  : null;

function hasDatabase() {
  return Boolean(pool);
}

async function query(text, params = []) {
  if (!pool) {
    const error = new Error("DATABASE_URL no configurado.");
    error.code = "NO_DATABASE";
    throw error;
  }

  return pool.query(text, params);
}

async function initDb() {
  if (!pool) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      google_sub TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'profesional',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      ip_address TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_liked_books (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doc_key TEXT NOT NULL,
      doc_title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, doc_key)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_page_notes (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doc_key TEXT NOT NULL,
      doc_title TEXT NOT NULL,
      page_number INTEGER NOT NULL CHECK (page_number > 0),
      note_text TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, doc_key, page_number)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS managed_documents (
      id BIGSERIAL PRIMARY KEY,
      doc_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      cover TEXT NOT NULL,
      pdf TEXT NOT NULL,
      aliases TEXT[] NOT NULL DEFAULT '{}',
      created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS catalog_notifications (
      id BIGSERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      doc_key TEXT NOT NULL,
      doc_title TEXT NOT NULL,
      message TEXT NOT NULL,
      actor_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_liked_books_user ON user_liked_books(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_page_notes_user_doc ON user_page_notes(user_id, doc_key);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_managed_documents_doc_key ON managed_documents(doc_key);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_catalog_notifications_created_at ON catalog_notifications(created_at DESC);`);

  const existingCatalog = await query(`SELECT COUNT(*)::int AS total FROM managed_documents`);
  const total = Number(existingCatalog.rows?.[0]?.total || 0);

  if (total === 0) {
    for (const doc of staticDocuments) {
      await query(
        `
        INSERT INTO managed_documents (doc_key, title, description, cover, pdf, aliases)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (doc_key) DO NOTHING
        `,
        [doc.key, doc.title, doc.description || "", doc.cover || "", doc.pdf || "", doc.aliases || []],
      );
    }
  }

  for (const doc of staticDocuments) {
    await query(
      `
      UPDATE managed_documents
      SET
        description = CASE WHEN COALESCE(description, '') = '' THEN $2 ELSE description END,
        cover = CASE WHEN COALESCE(cover, '') = '' THEN $3 ELSE cover END,
        pdf = CASE WHEN COALESCE(pdf, '') = '' THEN $4 ELSE pdf END,
        aliases = CASE
          WHEN aliases IS NULL OR cardinality(aliases) = 0 THEN $5::text[]
          ELSE aliases
        END,
        updated_at = NOW()
      WHERE doc_key = $1
      `,
      [doc.key, doc.description || "", doc.cover || "", doc.pdf || "", doc.aliases || []],
    );
  }
}

function buildToken() {
  return crypto.randomBytes(48).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

module.exports = {
  pool,
  hasDatabase,
  query,
  initDb,
  buildToken,
  hashToken,
};
