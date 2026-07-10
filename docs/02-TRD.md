# TRD — ProjectLab India
**Technical Requirements Document · v1.0**

---

## 1. Architecture overview

```
┌─────────────┐     ┌──────────────┐
│  Web (SPA)  │     │  Mobile App  │
│ React+Vite  │     │ React Native │
└──────┬──────┘     └──────┬───────┘
       │    HTTPS (REST + JWT)
       ▼                   ▼
┌──────────────────────────────────┐
│        API — Node.js/Express      │
│  (Render/Railway, India region)   │
├──────────────────────────────────┤
│ Auth │ Plans │ Scenarios │ Tax    │
└──────────────┬───────────────────┘
               ▼
┌──────────────────────────────────┐
│ PostgreSQL (Supabase/Neon, IN)   │
│ + Redis (session/rate-limit)     │
└──────────────────────────────────┘
```

**Key principle: the projection & Monte Carlo engines stay client-side** (pure JS, already exist in `src/data/store.js`). Server stores *inputs* (plans), not computed outputs. This keeps the server thin, simulations instant, and works offline.

## 2. Stack decisions

| Layer | Choice | Why |
|---|---|---|
| Web | React 18 + Vite + Tailwind (existing) | Already built; fast |
| Charts (web) | Recharts + custom SVG donuts (existing) | Already built |
| Mobile | **React Native + Expo** | Reuse 100% of engine JS + data model; single team |
| Charts (mobile) | `victory-native` / `react-native-svg` | Recharts is DOM-only; Victory matches chart types (area, line, pie) |
| State | Existing `miniStore.js` (zustand-like) → shared package | Works on both platforms (no DOM deps) |
| API | Node.js 20 + Express + zod validation | Team familiarity (Oasis backend is Node/Render) |
| DB | PostgreSQL 16 (Supabase, Mumbai region) | JSONB for plan payloads + relational for auth/billing |
| Cache | Redis (Upstash) | OTP store, rate limiting |
| Auth | Email-OTP + Google OAuth; JWT (15 min) + refresh (30 d) | Matches Indian user expectations (OTP-first) |
| Payments | Razorpay subscriptions | India UPI/cards |
| Analytics | PostHog (self-host EU/IN) | Funnel + retention, DPDP-friendly |
| Errors | Sentry | Both platforms |
| CI/CD | GitHub Actions → Vercel (web), EAS Build (mobile), Render (API) | |

## 3. Monorepo layout

```
projectlab/
├── apps/
│   ├── web/           # existing Vite app (moved)
│   ├── mobile/        # Expo app
│   └── api/           # Express API
├── packages/
│   ├── engine/        # computeProjection, runMonteCarlo, computeTaxSavings,
│   │                  # computeReadiness, format.js  (pure JS, zero deps)
│   ├── schema/        # zod schemas: Plan, Account, Income, Expense, Event…
│   └── ui-tokens/     # colors, spacing (Tailwind config + RN theme)
└── docs/
```

Migration note: `src/data/store.js` splits into `packages/engine` (pure functions) + per-app stores (persistence layer differs: localStorage vs AsyncStorage vs API).

## 4. API surface (REST, `/v1`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/otp/request` · `/auth/otp/verify` | Email/phone OTP login |
| POST | `/auth/google` | OAuth token exchange |
| POST | `/auth/refresh` | Rotate JWT |
| GET/PUT | `/me` | Profile (name, ages, inflation, regime, slab) |
| GET | `/plans` | List scenarios |
| POST | `/plans` | Create scenario (from template or clone) |
| GET/PUT/DELETE | `/plans/:id` | Full plan JSONB read/replace (optimistic concurrency via `version`) |
| PATCH | `/plans/:id` | Partial ops: `{op:'upsert'|'remove', collection, item}` |
| GET | `/tax/config?fy=2026` | Versioned slab/deduction limits |
| POST | `/billing/subscribe` · webhook `/billing/razorpay` | Pro upgrade |
| GET | `/export/:planId/pdf` | (P2) server-rendered plan PDF |

**Sync model**: client is source of truth while editing; debounced PUT (2 s) with `version` check; on 409 → last-write-wins with conflict toast (v1), CRDT not needed.
**Offline (mobile)**: queue mutations in AsyncStorage, replay on reconnect.

## 5. Non-functional requirements
- **Perf**: projection recompute <16 ms for 60-year horizon (already ~2 ms); MC 1000 runs <900 ms on mid-range Android (move to `Worker`/`react-native-worklets` if exceeded); API p95 <300 ms.
- **Availability**: 99.5% API; app fully usable offline with last-synced plan.
- **Security**: TLS everywhere; JWT RS256; rate limit 5 OTP/hour/identity; row-level security (`user_id`) on every table; no PII in analytics events.
- **Privacy (DPDP)**: data in-region, delete-account endpoint hard-deletes within 30 days, consent screen at signup.
- **Testing**: engine = unit tests with golden files (same inputs → same projection on web+mobile); API = supertest integration; mobile = Detox smoke on Dashboard/Accounts.

## 6. Versioning & config
- Plan JSON carries `schemaVersion`; client migrates old versions forward (already-shipped localStorage v1 → server v2 migrator).
- Tax rules (`80C` cap, slabs, cess) come from `/tax/config`, never hardcoded — FY changes are server config, not app releases.

## 7. Risks
| Risk | Mitigation |
|---|---|
| Recharts unusable on RN | Victory-native mapping documented per chart (see App Flow §charts) |
| MC perf on low-end Android | Reduce default runs to 250 on `deviceYearClass < 2019`; worklet offload |
| Engine drift web vs app | Single `packages/engine` + golden-file CI test on both bundles |
| DPDP audit | Data map doc + in-region hosting from day 1 |
