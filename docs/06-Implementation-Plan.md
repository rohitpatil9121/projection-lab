# Implementation Plan — ProjectLab India
**AI-sized tasks · v1.0**

Each task is scoped to fit one focused AI-agent/dev session (~0.5–1 day), with explicit inputs, outputs, and a verify step. Do phases in order; tasks within a phase marked ∥ can run in parallel.

---

## Phase 0 — Monorepo & engine extraction (week 1)

- [ ] **T0.1 Monorepo scaffold**
  pnpm workspaces: `apps/web`, `apps/mobile`, `apps/api`, `packages/engine`, `packages/schema`, `packages/ui-tokens`. Move existing Vite app to `apps/web` untouched.
  *Verify:* `pnpm -F web dev` serves the current site; `pnpm -F web build` passes.

- [ ] **T0.2 Extract engine package** ∥
  Move `computeProjection`, `runMonteCarlo`, `computeTaxSavings`, `computeReadiness`, `accountRoles`, `mulberry32`, `format.js` from `src/data/store.js` → `packages/engine` (pure, no DOM/localStorage). Web store imports from it.
  *Verify:* web behaves identically; engine has zero imports from react/dom.

- [ ] **T0.3 Golden-file engine tests** ∥
  Vitest: 3 fixture plans (default, negative-net-worth, retiree) → snapshot projections + MC (seeded) + tax outputs.
  *Verify:* `pnpm -F engine test` green; intentional off-by-one breaks snapshot.

- [ ] **T0.4 Zod schema package** ∥
  `packages/schema`: Plan/Account/Income/Expense/Contribution/Milestone/Event + invariants (§Backend-Schema 3). Export TS types.
  *Verify:* default plan parses; 6 crafted invalid payloads each throw the right error.

## Phase 1 — API + auth + sync (weeks 2–3)

- [ ] **T1.1 API scaffold**: Express + zod middleware + error envelope + pino logging + `/healthz`. Deploy to Render (Mumbai).
- [ ] **T1.2 DB migrations**: all tables from Backend-Schema §2 via node-pg-migrate; seed `tax_configs` FY26-27. *Verify:* up/down/up clean.
- [ ] **T1.3 OTP auth**: `/auth/otp/request|verify` (email via Resend; Redis TTL 5 min, 5/hr rate limit), JWT RS256 15 min + refresh rotation, `sessions` rows. *Verify:* supertest happy path + rate-limit 429 + replayed-refresh rejection.
- [ ] **T1.4 Google OAuth** ∥: token exchange, link-by-email if exists.
- [ ] **T1.5 Plans CRUD**: GET/POST/PUT/PATCH/DELETE with version check (409 flow), free-tier 1-plan limit, payload zod-validated. *Verify:* integration tests incl. 409 and oversize payload 413.
- [ ] **T1.6 `/me` + `/tax/config`** ∥.
- [ ] **T1.7 Web auth UI**: Login + OTP screens (per App-Flow §1), token storage, axios interceptor refresh.
- [ ] **T1.8 Web sync layer**: store persist() → debounced PUT; cloud status icon (synced/syncing/offline); localStorage v1→server v2 migration on first login ("We found a local plan — import?").
  *Verify:* edit on two browser tabs → 409 toast appears; offline edit survives reload and syncs.

## Phase 2 — Mobile app core (weeks 4–7)

- [ ] **T2.1 Expo scaffold**: TS template, tabs (Home/Plan/Accounts/More), `ui-tokens` RN theme, Inter font, dark mode via appearance + manual override.
- [ ] **T2.2 Auth screens** (Login, OTP, session refresh, SecureStore tokens).
- [ ] **T2.3 Mobile store**: shared engine + AsyncStorage cache + mutation queue with replay. *Verify:* airplane-mode edit → relaunch → reconnect → server updated.
- [ ] **T2.4 DonutRing RN port** ∥: same SVG math via react-native-svg. *Verify:* pixel-compare screenshot vs web ring.
- [ ] **T2.5 Dashboard screen**: stat cards (snap scroll), VictoryStack projection + retire line + today's-money toggle, readiness gauge, income/expense chart. *Verify:* numbers === web for same plan (golden fixture).
- [ ] **T2.6 Accounts screen**: 3 stacked cards, editable rows (name/balance/SIP chip), bottom-sheet add, swipe-delete + undo.
- [ ] **T2.7 Plan screen** ∥: line+dots chart, event list, add-event sheet with age slider.
- [ ] **T2.8 Milestones screen** ∥: progress cards + projected years.
- [ ] **T2.9 Monte Carlo screen**: fan chart (Victory bands), runs selector, verdict card; 250-run default on low-end devices.
- [ ] **T2.10 Cash Flow screen**: mini stats + horizontal-scroll Sankey (svg port) + tax bucket cards.
- [ ] **T2.11 Settings screen**: assumptions form, regime/slab, dark mode, logout, delete account, export JSON share-sheet.
- [ ] **T2.12 Onboarding wizard**: 5 steps + skip + confetti reveal. *Verify:* new user → projection visible in <60 s of taps.

## Phase 3 — Launch features (weeks 8–11)

- [ ] **T3.1 Scenarios backend**: multi-plan already in schema; clone endpoint.
- [ ] **T3.2 Scenario switcher web** + compare mode (2 lines + delta cards).
- [ ] **T3.3 Scenario switcher mobile** (header chip + sheet).
- [ ] **T3.4 Old-vs-new regime screen**: engine `computeRegimeComparison(income, deductions, taxConfig)` + UI table both platforms. *Verify:* matches 5 hand-computed FY26-27 cases.
- [ ] **T3.5 Web onboarding wizard** (port of T2.12).
- [ ] **T3.6 Razorpay Pro**: subscribe endpoint + webhook (signature verify) + paywall components + entitlement checks (plans>1, MC>1000 runs).
- [ ] **T3.7 Analytics events** ∥: PostHog — activation funnel (signup→onboard→projection), edit-depth, feature usage. No PII.
- [ ] **T3.8 Sentry both apps** ∥.
- [ ] **T3.9 Store release**: EAS build, Play Console listing, privacy policy + DPDP consent screen, force-update gate.
- [ ] **T3.10 Load & security pass**: k6 100 rps on plans PUT; OWASP top-10 checklist; rate limits verified.

## Phase 4 — iOS + polish (weeks 12–15)

- [ ] T4.1 iOS build + TestFlight (fix safe-area/haptics deltas)
- [ ] T4.2 PDF export (server puppeteer render of plan summary) — Pro
- [ ] T4.3 Push notifications: tax-deadline nudges (opt-in), milestone achieved
- [ ] T4.4 Term-insurance adequacy calculator (engine + card on Cash Flow)
- [ ] T4.5 Step-up SIP modelling (contribution `stepUp` % field through engine + UI)
- [ ] T4.6 hi-IN string extraction pass

## Standing rules for every task
1. Engine changes require golden-file test updates in the same PR.
2. Any new plan field → zod schema + `schemaVersion` bump + client migrator.
3. Every screen ships light+dark and offline state, or it's not done.
4. Charts never animate on data edit (known recharts race; same rule on Victory).
5. Numbers formatted via `packages/engine/format` only — no ad-hoc `toLocaleString`.

## Definition of Done (per phase)
- P0: web unchanged but powered by packages; CI green.
- P1: two devices stay in sync; auth abuse-proof (rate limits tested).
- P2: Android beta where a fixture user's Dashboard/MC numbers match web exactly.
- P3: Play Store live, first paying user possible end-to-end.
