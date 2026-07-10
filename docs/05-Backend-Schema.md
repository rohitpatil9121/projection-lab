# Backend Schema — ProjectLab India
**Data layer · PostgreSQL 16 · v1.0**

Design principle: **relational for identity/billing, JSONB for the plan document.** The plan payload is exactly the client store shape (accounts/incomes/expenses/contributions/milestones/events) so the engine consumes it with zero mapping. Tax rules are versioned config tables.

---

## 1. ER overview

```
users 1───n sessions
users 1───n plans (scenarios)         plans.payload = JSONB plan document
users 1───1 subscriptions
users 1───n audit_events
tax_configs (global, versioned by FY)
```

## 2. Tables

```sql
-- ============ identity ============
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE,
  phone         TEXT UNIQUE,               -- E.164, +91…
  google_sub    TEXT UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  -- profile assumptions (flat: queried for cohort analytics, not part of payload)
  current_age       SMALLINT CHECK (current_age BETWEEN 16 AND 100),
  retirement_age    SMALLINT,
  life_expectancy   SMALLINT DEFAULT 85,
  inflation         NUMERIC(5,4) DEFAULT 0.0600,
  tax_regime        TEXT DEFAULT 'old' CHECK (tax_regime IN ('old','new')),
  tax_slab          NUMERIC(4,3) DEFAULT 0.300,
  currency          CHAR(3) DEFAULT 'INR',
  ui_prefs      JSONB NOT NULL DEFAULT '{"dark":false,"realTerms":true}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ                -- soft delete → hard purge job at +30d (DPDP)
);

CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash  TEXT NOT NULL,             -- sha256 of refresh token
  device_info   TEXT,                      -- "web/chrome", "android/13/Pixel"
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON sessions (user_id);

-- OTPs live in Redis (key otp:<identity>, TTL 5 min, attempts counter) — not in PG.

-- ============ plans (scenarios) ============
CREATE TABLE plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT 'Base scenario',
  is_default     BOOLEAN NOT NULL DEFAULT false,
  schema_version SMALLINT NOT NULL DEFAULT 2,
  version        INTEGER NOT NULL DEFAULT 1,   -- optimistic concurrency
  payload        JSONB NOT NULL,               -- see §3
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_default_plan ON plans (user_id) WHERE is_default;
CREATE INDEX ON plans (user_id, updated_at DESC);
-- free tier: max 1 plan; pro: unlimited — enforced in API, not DB.

-- ============ billing ============
CREATE TABLE subscriptions (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier              TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','advisor')),
  razorpay_sub_id   TEXT UNIQUE,
  status            TEXT NOT NULL DEFAULT 'none',   -- none|active|past_due|cancelled
  current_period_end TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ versioned tax config ============
CREATE TABLE tax_configs (
  fy            TEXT PRIMARY KEY,          -- '2026-27'
  effective_from DATE NOT NULL,
  config        JSONB NOT NULL
  /* {
       "old":  { "deductions": { "80C":150000, "80CCD1B":50000,
                                 "80D": {"self":25000,"senior":50000} },
                 "slabs":[[250000,0],[500000,0.05],[1000000,0.2],[null,0.3]] },
       "new":  { "slabs":[[300000,0],[700000,0.05],[1000000,0.1],
                          [1200000,0.15],[1500000,0.2],[null,0.3]],
                 "standardDeduction":75000 },
       "cess": 0.04
     } */
);

-- ============ audit / analytics seed ============
CREATE TABLE audit_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event       TEXT NOT NULL,              -- 'plan.updated','auth.login','account.deleted'
  meta        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_events (user_id, created_at DESC);
```

Row-level security: `ALTER TABLE plans ENABLE ROW LEVEL SECURITY; POLICY user_isolation USING (user_id = auth.uid())` (Supabase) or WHERE-clause enforcement in API layer.

## 3. Plan payload (JSONB) — schemaVersion 2

Mirrors the shipped client store; zod schema lives in `packages/schema` and is the single source of truth for both API validation and client types.

```jsonc
{
  "accounts": [{
    "id": "epf", "name": "EPF", "kind": "asset",            // asset|liability
    "type": "retirement",       // cash|investment|retirement|real-estate|loan
    "balance": 620000, "growth": 0.0815,
    "payoff": null,             // liabilities: annual paydown fraction
    "color": "#8b5cf6"
  }],
  "incomes":  [{ "id":"salary","name":"Salary","amount":1800000,"growth":0.08,
                 "startAge":32,"endAge":60,"color":"#6366f1" }],
  "expenses": [{ "id":"living","name":"Household","amount":600000,"growth":0.06,
                 "startAge":32,"endAge":85,"section":null,"color":"#ef4444" }],   // section: '80D'…
  "contributions": [{ "id":"c1","accountId":"epf","amount":180000,"section":"80C" }],
  "milestones": [{ "id":"m1","name":"Emergency Fund","target":360000,
                   "accountId":"savings","metric":null,"icon":"🛟","achieved":true }],
  "events": [{ "id":"e1","name":"Buy a car","age":35,"amount":-1200000,
               "icon":"🚗","color":"#f59e0b" }]
}
```

Validation invariants (zod): `endAge ≥ startAge`; `growth ∈ [-0.5, 0.5]`; `balance ≥ 0`; contributions reference existing asset account; ≤100 items per collection; payload ≤256 KB.

## 4. Client persistence
| Platform | Store | Notes |
|---|---|---|
| Web | localStorage `projectlab-state-in-v1` (existing) → becomes write-through cache of active plan | migrator v1→v2 on first login |
| Mobile | AsyncStorage mirror + mutation queue `pending_ops[]` | replayed FIFO on reconnect; each op carries `baseVersion` |

## 5. Sync protocol
1. Client edit → local store update → engine recompute (instant UI).
2. Debounce 2 s → `PUT /plans/:id {payload, version}`.
3. 200 → `version++` locally. 409 → fetch server copy → toast "Updated elsewhere: Reload / Keep mine" (Keep mine = force PUT with fresh version).
4. Mobile offline → op queued; badge shows ⏸ count.

## 6. Purge & compliance jobs
- Nightly: hard-delete users where `deleted_at < now() - 30 days` (cascades).
- Session GC: delete expired sessions.
- Audit retention: 180 days rolling.

## 7. Migrations tooling
`node-pg-migrate`; every migration reversible; CI runs `migrate up && down && up` against ephemeral PG.
