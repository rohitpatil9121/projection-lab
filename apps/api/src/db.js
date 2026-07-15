import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

// Load apps/api/.env if present (no dependency needed).
try {
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m && process.env[m[1]] == null) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
} catch { /* ignore */ }

export function id() {
  return crypto.randomUUID()
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const DATABASE_URL = process.env.DATABASE_URL

let users, otps, sessions, plans, ready

if (DATABASE_URL) {
  // ---------- Postgres (Supabase) backend ----------
  const { default: pg } = await import('pg')
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 5,
  })

  ready = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        password_hash TEXT,
        name TEXT,
        current_age INTEGER,
        retirement_age INTEGER,
        life_expectancy INTEGER,
        inflation DOUBLE PRECISION,
        tax_regime TEXT,
        tax_slab DOUBLE PRECISION,
        gross_salary DOUBLE PRECISION,
        currency TEXT,
        ui_prefs JSONB DEFAULT '{}',
        created_at TEXT
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gross_salary DOUBLE PRECISION;
      ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
      CREATE TABLE IF NOT EXISTS otps (
        email TEXT PRIMARY KEY,
        code TEXT,
        expires_at BIGINT,
        attempts JSONB DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(refresh_hash);
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        schema_version INTEGER DEFAULT 2,
        version INTEGER DEFAULT 1,
        payload JSONB,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
    `)
    console.log('[db] connected to Postgres (Supabase)')
  })()

  const userFromRow = (r) => r ? {
    id: r.id, email: r.email, phone: r.phone, name: r.name,
    currentAge: r.current_age, retirementAge: r.retirement_age, lifeExpectancy: r.life_expectancy,
    inflation: r.inflation, taxRegime: r.tax_regime, taxSlab: r.tax_slab, grossSalary: r.gross_salary, currency: r.currency,
    uiPrefs: r.ui_prefs || {}, createdAt: r.created_at,
  } : null

  const planFromRow = (r) => r ? {
    id: r.id, userId: r.user_id, name: r.name, isDefault: !!r.is_default,
    schemaVersion: r.schema_version, version: r.version, payload: r.payload,
    createdAt: r.created_at, updatedAt: r.updated_at,
  } : null

  users = {
    async byId(uid) {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [uid])
      return userFromRow(rows[0])
    },
    async byEmail(email) {
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
      return userFromRow(rows[0])
    },
    async byPhone(phone) {
      const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone])
      return userFromRow(rows[0])
    },
    async credByEmail(email) {
      const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email])
      return rows[0] ? { id: rows[0].id, passwordHash: rows[0].password_hash } : null
    },
    async setPassword(userId, passwordHash) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId])
    },
    async create(u) {
      await pool.query(
        `INSERT INTO users (id, email, phone, password_hash, name, current_age, retirement_age, life_expectancy, inflation, tax_regime, tax_slab, gross_salary, currency, ui_prefs, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [u.id, u.email || null, u.phone || null, u.passwordHash || null, u.name, u.currentAge, u.retirementAge, u.lifeExpectancy, u.inflation, u.taxRegime, u.taxSlab, u.grossSalary ?? null, u.currency, JSON.stringify(u.uiPrefs || {}), u.createdAt],
      )
      return u
    },
    async update(uid, patch) {
      const current = await users.byId(uid)
      if (!current) return null
      const next = { ...current, ...patch, uiPrefs: patch.uiPrefs ? { ...current.uiPrefs, ...patch.uiPrefs } : current.uiPrefs }
      await pool.query(
        `UPDATE users SET name=$1, current_age=$2, retirement_age=$3, life_expectancy=$4, inflation=$5, tax_regime=$6, tax_slab=$7, gross_salary=$8, currency=$9, ui_prefs=$10 WHERE id=$11`,
        [next.name, next.currentAge, next.retirementAge, next.lifeExpectancy, next.inflation, next.taxRegime, next.taxSlab, next.grossSalary ?? null, next.currency, JSON.stringify(next.uiPrefs || {}), uid],
      )
      return next
    },
  }

  otps = {
    async get(email) {
      const { rows } = await pool.query('SELECT * FROM otps WHERE email = $1', [email])
      const r = rows[0]
      return r ? { code: r.code, expiresAt: Number(r.expires_at), attempts: r.attempts || [] } : null
    },
    async put(email, bucket) {
      await pool.query(
        `INSERT INTO otps (email, code, expires_at, attempts) VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET code=EXCLUDED.code, expires_at=EXCLUDED.expires_at, attempts=EXCLUDED.attempts`,
        [email, bucket.code, bucket.expiresAt, JSON.stringify(bucket.attempts || [])],
      )
    },
    async del(email) {
      await pool.query('DELETE FROM otps WHERE email = $1', [email])
    },
  }

  sessions = {
    async byHash(hash) {
      const { rows } = await pool.query('SELECT * FROM sessions WHERE refresh_hash = $1', [hash])
      const r = rows[0]
      return r ? { id: r.id, userId: r.user_id, refreshHash: r.refresh_hash, expiresAt: r.expires_at, createdAt: r.created_at } : null
    },
    async create(s) {
      await pool.query('INSERT INTO sessions (id, user_id, refresh_hash, expires_at, created_at) VALUES ($1,$2,$3,$4,$5)',
        [s.id, s.userId, s.refreshHash, s.expiresAt, s.createdAt])
      return s
    },
    async rotate(sessionId, refreshHash, expiresAt) {
      await pool.query('UPDATE sessions SET refresh_hash=$1, expires_at=$2 WHERE id=$3', [refreshHash, expiresAt, sessionId])
    },
    async deleteByHash(hash) {
      await pool.query('DELETE FROM sessions WHERE refresh_hash = $1', [hash])
    },
  }

  plans = {
    async listByUser(uid) {
      const { rows } = await pool.query('SELECT * FROM plans WHERE user_id = $1 ORDER BY updated_at DESC', [uid])
      return rows.map(planFromRow)
    },
    async byId(pid) {
      const { rows } = await pool.query('SELECT * FROM plans WHERE id = $1', [pid])
      return planFromRow(rows[0])
    },
    async countByUser(uid) {
      const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM plans WHERE user_id = $1', [uid])
      return rows[0].c
    },
    async create(p) {
      await pool.query(
        `INSERT INTO plans (id, user_id, name, is_default, schema_version, version, payload, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [p.id, p.userId, p.name, !!p.isDefault, p.schemaVersion, p.version, JSON.stringify(p.payload), p.createdAt, p.updatedAt],
      )
      return p
    },
    async save(p) {
      await pool.query('UPDATE plans SET name=$1, version=$2, payload=$3, updated_at=$4 WHERE id=$5',
        [p.name, p.version, JSON.stringify(p.payload), p.updatedAt, p.id])
      return p
    },
    async del(pid) {
      await pool.query('DELETE FROM plans WHERE id = $1', [pid])
    },
  }
} else {
  // ---------- SQLite backend (local dev fallback) ----------
  const { default: Database } = await import('better-sqlite3')
  const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'projectlab.db')
  const LEGACY_JSON = path.join(DATA_DIR, 'db.json')

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      current_age INTEGER,
      retirement_age INTEGER,
      life_expectancy INTEGER,
      inflation REAL,
      tax_regime TEXT,
      tax_slab REAL,
      gross_salary REAL,
      currency TEXT,
      ui_prefs TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS otps (
      email TEXT PRIMARY KEY,
      code TEXT,
      expires_at INTEGER,
      attempts TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      refresh_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(refresh_hash);
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT,
      is_default INTEGER DEFAULT 0,
      schema_version INTEGER DEFAULT 2,
      version INTEGER DEFAULT 1,
      payload TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
  `)

  // Add newer columns to pre-existing DBs that don't have them yet.
  const cols = sqlite.prepare('PRAGMA table_info(users)').all().map((c) => c.name)
  if (!cols.includes('phone')) sqlite.exec('ALTER TABLE users ADD COLUMN phone TEXT')
  if (!cols.includes('password_hash')) sqlite.exec('ALTER TABLE users ADD COLUMN password_hash TEXT')
  if (!cols.includes('gross_salary')) sqlite.exec('ALTER TABLE users ADD COLUMN gross_salary REAL')

  const userFromRow = (r) => r ? {
    id: r.id, email: r.email, phone: r.phone, name: r.name,
    currentAge: r.current_age, retirementAge: r.retirement_age, lifeExpectancy: r.life_expectancy,
    inflation: r.inflation, taxRegime: r.tax_regime, taxSlab: r.tax_slab, grossSalary: r.gross_salary, currency: r.currency,
    uiPrefs: r.ui_prefs ? JSON.parse(r.ui_prefs) : {}, createdAt: r.created_at,
  } : null

  const planFromRow = (r) => r ? {
    id: r.id, userId: r.user_id, name: r.name, isDefault: !!r.is_default,
    schemaVersion: r.schema_version, version: r.version,
    payload: r.payload ? JSON.parse(r.payload) : null,
    createdAt: r.created_at, updatedAt: r.updated_at,
  } : null

  users = {
    byId: (uid) => userFromRow(sqlite.prepare('SELECT * FROM users WHERE id = ?').get(uid)),
    byEmail: (email) => userFromRow(sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email)),
    byPhone: (phone) => userFromRow(sqlite.prepare('SELECT * FROM users WHERE phone = ?').get(phone)),
    credByEmail(email) {
      const r = sqlite.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email)
      return r ? { id: r.id, passwordHash: r.password_hash } : null
    },
    setPassword(userId, passwordHash) {
      sqlite.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId)
    },
    create(u) {
      sqlite.prepare(`INSERT INTO users (id, email, phone, password_hash, name, current_age, retirement_age, life_expectancy, inflation, tax_regime, tax_slab, gross_salary, currency, ui_prefs, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(u.id, u.email || null, u.phone || null, u.passwordHash || null, u.name, u.currentAge, u.retirementAge, u.lifeExpectancy, u.inflation, u.taxRegime, u.taxSlab, u.grossSalary ?? null, u.currency, JSON.stringify(u.uiPrefs || {}), u.createdAt)
      return u
    },
    update(uid, patch) {
      const current = users.byId(uid)
      if (!current) return null
      const next = { ...current, ...patch, uiPrefs: patch.uiPrefs ? { ...current.uiPrefs, ...patch.uiPrefs } : current.uiPrefs }
      sqlite.prepare(`UPDATE users SET name=?, current_age=?, retirement_age=?, life_expectancy=?, inflation=?, tax_regime=?, tax_slab=?, gross_salary=?, currency=?, ui_prefs=? WHERE id=?`)
        .run(next.name, next.currentAge, next.retirementAge, next.lifeExpectancy, next.inflation, next.taxRegime, next.taxSlab, next.grossSalary ?? null, next.currency, JSON.stringify(next.uiPrefs || {}), uid)
      return next
    },
  }

  otps = {
    get(email) {
      const r = sqlite.prepare('SELECT * FROM otps WHERE email = ?').get(email)
      return r ? { code: r.code, expiresAt: r.expires_at, attempts: r.attempts ? JSON.parse(r.attempts) : [] } : null
    },
    put(email, bucket) {
      sqlite.prepare('INSERT INTO otps (email, code, expires_at, attempts) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET code=excluded.code, expires_at=excluded.expires_at, attempts=excluded.attempts')
        .run(email, bucket.code, bucket.expiresAt, JSON.stringify(bucket.attempts || []))
    },
    del(email) {
      sqlite.prepare('DELETE FROM otps WHERE email = ?').run(email)
    },
  }

  sessions = {
    byHash(hash) {
      const r = sqlite.prepare('SELECT * FROM sessions WHERE refresh_hash = ?').get(hash)
      return r ? { id: r.id, userId: r.user_id, refreshHash: r.refresh_hash, expiresAt: r.expires_at, createdAt: r.created_at } : null
    },
    create(s) {
      sqlite.prepare('INSERT INTO sessions (id, user_id, refresh_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(s.id, s.userId, s.refreshHash, s.expiresAt, s.createdAt)
      return s
    },
    rotate(sessionId, refreshHash, expiresAt) {
      sqlite.prepare('UPDATE sessions SET refresh_hash = ?, expires_at = ? WHERE id = ?').run(refreshHash, expiresAt, sessionId)
    },
    deleteByHash(hash) {
      sqlite.prepare('DELETE FROM sessions WHERE refresh_hash = ?').run(hash)
    },
  }

  plans = {
    listByUser: (uid) => sqlite.prepare('SELECT * FROM plans WHERE user_id = ? ORDER BY updated_at DESC').all(uid).map(planFromRow),
    byId: (pid) => planFromRow(sqlite.prepare('SELECT * FROM plans WHERE id = ?').get(pid)),
    countByUser: (uid) => sqlite.prepare('SELECT COUNT(*) AS c FROM plans WHERE user_id = ?').get(uid).c,
    create(p) {
      sqlite.prepare(`INSERT INTO plans (id, user_id, name, is_default, schema_version, version, payload, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(p.id, p.userId, p.name, p.isDefault ? 1 : 0, p.schemaVersion, p.version, JSON.stringify(p.payload), p.createdAt, p.updatedAt)
      return p
    },
    save(p) {
      sqlite.prepare('UPDATE plans SET name=?, version=?, payload=?, updated_at=? WHERE id=?')
        .run(p.name, p.version, JSON.stringify(p.payload), p.updatedAt, p.id)
      return p
    },
    del(pid) {
      sqlite.prepare('DELETE FROM plans WHERE id = ?').run(pid)
    },
  }

  ready = Promise.resolve()

  // One-time migration from the legacy JSON file DB.
  try {
    const userCount = sqlite.prepare('SELECT COUNT(*) AS c FROM users').get().c
    if (userCount === 0 && fs.existsSync(LEGACY_JSON)) {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON, 'utf8'))
      sqlite.transaction(() => {
        for (const u of Object.values(legacy.users || {})) users.create(u)
        for (const s of Object.values(legacy.sessions || {})) sessions.create(s)
        for (const p of Object.values(legacy.plans || {})) plans.create(p)
      })()
      fs.renameSync(LEGACY_JSON, LEGACY_JSON + '.migrated')
      console.log('[db] migrated legacy db.json → projectlab.db')
    }
  } catch (err) {
    console.error('[db] legacy migration failed:', err.message)
  }

  console.log('[db] using local SQLite at', DB_PATH, '(set DATABASE_URL in apps/api/.env for Supabase)')
}

export { users, otps, sessions, plans, ready }
