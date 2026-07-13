# Financial Blueprint

India-first financial planning simulator — model income, EPF/PPF/NPS/SIP, loans, life events, and see year-by-year projections, Monte Carlo risk analysis, and tax optimization in ₹ lakh/crore.

## Quick start

```bash
npm install
npm run dev
```

This starts:
- **Web app** → http://localhost:5173
- **API** → http://localhost:3001

## Features

| Screen | What it does |
|---|---|
| Today | Priority checklist and quick financial health |
| Dashboard | Net-worth projection, income vs expense, readiness score |
| Accounts | Asset/liability cards with donut rings, inline editing, SIP chips |
| Plan | Life events timeline (car, education, retire, etc.) |
| Cash Flow | Sankey diagram + 80C/80CCD/80D tax tracker |
| Monte Carlo | 250–1000 run simulation with percentile fan chart |
| Milestones | Goal progress with projected achievement year |
| Settings | Profile assumptions, income/expense editor |

## Auth & sync

- **Guest mode**: works immediately with localStorage (no sign-in required)
- **Sign in**: email + password (primary), or OTP via email / mobile number
- **Forgot password**: email reset code when SMTP/Brevo is configured
- In **development only**, OTP/reset codes may appear in API responses when email/SMS is not configured. Production never exposes codes in responses.
- Edits sync to the API after 2 seconds (debounced), stored per-user in Postgres
- First login with a local plan imports guest data to the cloud

## Architecture

- **Web** — React + Vite + Tailwind SPA, wrapped as an Android app via Capacitor
- **API** — Express REST, JWT (15 min access) + rotating refresh tokens, helmet + rate limiting, Zod-validated payloads
- **Database** — Supabase Postgres (set `DATABASE_URL`); falls back to local SQLite for dev
- **Hosting** — API on Render, database on Supabase (Singapore region)

## Deployment

### API (Render)

Required env vars: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`

Optional (for auth delivery):
- `BREVO_API_KEY` + `EMAIL_FROM` (recommended on Render)
- or `SMTP_*` for email
- `TWILIO_*` for phone OTP

See `apps/api/.env.example`.

Privacy policy is served at `/privacy-policy.html` on both the web app and API.

### Android builds

Set your deployed API before building:

```bash
# Windows PowerShell
$env:VITE_API_URL = "https://your-api.onrender.com"
npm run apk    # debug APK for testing
npm run aab    # release AAB for Play Store (requires signing — see below)
```

Output:
- `FinancialBlueprint-debug.apk` — sideload / testing
- `FinancialBlueprint-release.aab` — upload to Play Console

### Play Store signing

Create a keystore once:

```bash
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Set env vars before `npm run aab`:

```bash
$env:KEYSTORE_PATH = "D:\path\to\upload-keystore.jks"
$env:KEYSTORE_PASSWORD = "your-store-password"
$env:KEY_PASSWORD = "your-key-password"
$env:KEY_ALIAS = "upload"
```

## Project structure

```
projectlab/
├── apps/
│   ├── web/       React + Vite + Tailwind (main UI) + Capacitor Android
│   └── api/       Express REST API (Postgres/Supabase, SQLite fallback)
├── packages/
│   ├── engine/    Pure JS projection + Monte Carlo engine
│   ├── schema/    Zod validation for plan payloads
│   └── ui-tokens/ Design tokens (shared theme)
└── docs/          PRD, TRD, app flow, implementation plan
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start web + API together |
| `npm run dev:web` | Web only |
| `npm run dev:api` | API only |
| `npm run build` | Production build (web) |
| `npm run preview` | Preview production build |
| `npm run apk` | Build debug APK → `FinancialBlueprint-debug.apk` |
| `npm run aab` | Build release AAB → `FinancialBlueprint-release.aab` |
| `npm run icons` | Regenerate Android launcher icons from `apps/web/assets/icon.png` |

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Health check |
| GET | `/privacy-policy.html` | Privacy policy (Play Store) |
| POST | `/v1/auth/register` | Create account (email + password) |
| POST | `/v1/auth/login` | Sign in (email + password) |
| POST | `/v1/auth/password/forgot` | Request password reset code |
| POST | `/v1/auth/password/reset` | Reset password with code |
| POST | `/v1/auth/otp/request` | Send email OTP |
| POST | `/v1/auth/otp/verify` | Verify email OTP |
| POST | `/v1/auth/phone/request` | Send phone OTP (Twilio) |
| POST | `/v1/auth/phone/verify` | Verify phone OTP |
| POST | `/v1/auth/refresh` | Refresh access token |
| POST | `/v1/auth/logout` | Revoke refresh token |
| GET | `/v1/plans` | List plans |
| PUT | `/v1/plans/:id` | Sync plan (optimistic concurrency) |
| GET | `/v1/tax/config` | FY26-27 tax slabs |

## Disclaimer

Illustration only — not investment advice. Tax rules are configurable per financial year.
