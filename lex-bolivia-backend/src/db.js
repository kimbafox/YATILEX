const crypto = require("crypto");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

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

  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_liked_books_user ON user_liked_books(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_page_notes_user_doc ON user_page_notes(user_id, doc_key);`);
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
