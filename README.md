# ProjectLab India

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
| Dashboard | Net-worth projection, income vs expense, readiness score |
| Accounts | Asset/liability cards with donut rings, inline editing, SIP chips |
| Plan | Life events timeline (car, education, retire, etc.) |
| Cash Flow | Sankey diagram + 80C/80CCD/80D tax tracker |
| Monte Carlo | 250–1000 run simulation with percentile fan chart |
| Milestones | Goal progress with projected achievement year |
| Settings | Profile assumptions, income/expense editor |

## Auth & sync

- **Guest mode**: works immediately with localStorage (no sign-in required)
- **Sign in**: mobile-number OTP (Twilio Verify) or email OTP at `/login`
- When SMS/email delivery isn't configured, the OTP is returned in the API response for testing (`devOtp`). **Configure Twilio/SMTP before public launch.**
- Edits sync to the API after 2 seconds (debounced), stored per-user in Postgres
- First login with a local plan prompts to import it to the cloud

## Architecture

- **Web** — React + Vite + Tailwind SPA, wrapped as an Android app via Capacitor
- **API** — Express REST, JWT (15 min access) + rotating refresh tokens, helmet + rate limiting, Zod-validated payloads
- **Database** — Supabase Postgres (set `DATABASE_URL`); falls back to local SQLite for dev
- **Hosting** — API on Render, database on Supabase (both Singapore region)

## Deployment

- API env vars (Render): `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, and optionally `SMTP_*` / `TWILIO_*` for OTP delivery. See `apps/api/.env.example`.
- Build the APK against the deployed API: `VITE_API_URL=https://your-api npm run apk`
- Privacy policy is served at `/privacy-policy.html` (required for the Play Store listing)

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
| `npm run apk` | Build Android APK → `ProjectLab-debug.apk` |

## Android APK

The app is packaged with **Capacitor** (web UI in a native shell). To build:

```bash
npm run apk
```

Output: **`ProjectLab-debug.apk`** in the project root (~4 MB).

Install on your phone: enable "Install from unknown sources", transfer the APK, and open it.

> **Note:** Cloud sync (sign-in) requires the API running on your PC/network. Guest mode works fully offline with local data.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Health check |
| POST | `/v1/auth/otp/request` | Send OTP |
| POST | `/v1/auth/otp/verify` | Verify OTP, get tokens |
| GET | `/v1/plans` | List plans |
| PUT | `/v1/plans/:id` | Sync plan (optimistic concurrency) |
| GET | `/v1/tax/config` | FY26-27 tax slabs |

## Disclaimer

Illustration only — not investment advice. Tax rules are configurable per financial year.
