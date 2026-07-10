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
- **Sign in**: email OTP at `/login` — in dev, OTP is shown on screen and logged in the API console
- Edits sync to the API after 2 seconds (debounced)
- First login with a local plan prompts to import it to the cloud

## Project structure

```
projectlab/
├── apps/
│   ├── web/       React + Vite + Tailwind (main UI)
│   ├── api/       Express REST API (file-based DB for local dev)
│   └── mobile/    Expo scaffold (Phase 2)
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
