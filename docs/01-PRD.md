# PRD — ProjectLab India
**Product Requirements Document · v1.0 · July 2026**

---

## 1. One-liner
ProjectLab is an India-first financial planning simulator — users model their entire financial life (income, expenses, EPF/PPF/NPS/SIP, loans, life events) and see year-by-year projections, Monte Carlo risk analysis, and tax optimization, in ₹ lakh/crore.

## 2. Problem
- Global tools (ProjectionLab, ProjectionLab-like) assume 401(k)/Roth/Social Security — meaningless for Indians.
- Indian tools (ET Money, INDmoney) track *current* portfolios but don't **simulate the future** (retire at 52? child's education at 48? old vs new regime?).
- CFPs charge ₹10–50k for a one-time plan that goes stale in months.

## 3. Target users
| Persona | Age | Need |
|---|---|---|
| **Salaried optimizer** (primary) | 25–40 | "Am I saving enough? 80C maxed? When can I be FI?" |
| **FIRE aspirant** | 28–45 | Aggressive SIP planning, corpus longevity, success probability |
| **Pre-retiree** | 45–58 | Drawdown planning, will corpus last to 85? |
| **CFP/advisor** (later) | — | Client scenario modelling tool (B2B seat) |

## 4. Platforms
1. **Website (exists)** — React SPA, full planning surface. Primary creation/editing surface.
2. **Mobile app (to build)** — React Native (Android first, then iOS). Primary *check-in* surface: glance at net worth, success %, milestones; light editing.

## 5. Core features (both platforms)

### P0 — must have (already built on web)
- **F1 Dashboard**: stacked net-worth projection (age→life expectancy), today's-money/future-value toggle, income vs expense chart, retirement-readiness score.
- **F2 Accounts**: Net Worth / Assets / Liabilities cards with donut rings, inline-editable balances, names, monthly SIP chips (add/edit/remove), add/delete accounts.
- **F3 Plan/Timeline**: life events (buy car, child education, marriage, retire, downsize) plotted on net-worth line; add/remove events.
- **F4 Cash Flow**: Sankey (income → budget → expenses/savings), savings rate, **80C/80CCD(1B)/80D tax tracker** with est. tax saved.
- **F5 Monte Carlo**: 250/500/1000-run simulation, percentile fan chart, success probability, verdict.
- **F6 Milestones**: goal progress (emergency fund, ₹1 Cr, education corpus, ₹5 Cr FI, loan-free) with projected achievement year.
- **F7 Settings**: profile assumptions (ages, inflation, tax regime/slab), income/expense stream editor, reset.

### P1 — needed for launch
- **F8 Auth & sync**: email/OTP + Google login; plans sync across web/app (currently localStorage only).
- **F9 Multiple scenarios**: Base vs. custom scenarios (Aggressive SIP, Early Retire), side-by-side compare.
- **F10 Old vs New regime comparison**: side-by-side annual tax computation.
- **F11 Onboarding wizard**: 5-step guided setup (age → income → savings → loans → goals) → instant first projection.

### P2 — post-launch
- F12 Term insurance adequacy calculator; F13 step-up SIP modelling; F14 account aggregator (AA) import; F15 advisor/B2B seats; F16 PDF plan export; F17 push notifications ("80C ₹40k left, 3 months to March 31").

## 6. Non-goals (v1)
- No real money movement, no broker integration, no investment advice (SEBI RIA territory — simulator only, with disclaimer).
- No live market data; growth rates are user assumptions.
- No family/multi-user shared plans.

## 7. Monetization
- **Free**: 1 scenario, core projections, 500-run Monte Carlo.
- **Pro ₹149/mo or ₹999/yr**: unlimited scenarios, 10k-run MC, regime comparison, PDF export, priority support.
- **Advisor ₹4,999/yr**: 25 client workspaces (P2).

## 8. Success metrics (first 6 months)
- Activation: ≥60% of signups complete onboarding & see a projection.
- Retention: ≥25% M1 retention (app), ≥15% (web).
- Depth: median user edits ≥8 inputs in first week.
- Conversion: ≥3% free→Pro by month 6.
- NPS ≥40.

## 9. Constraints & compliance
- Data residency: India region (DPDP Act 2023). PII encrypted at rest.
- Disclaimer on every projection: "Illustration, not investment advice."
- Tax rules versioned per FY (FY26-27 slabs configurable server-side).

## 10. Release plan
| Milestone | Scope | Target |
|---|---|---|
| M1 | Backend + auth + sync; web parity | 4 weeks |
| M2 | Mobile app beta (Android): F1,F2,F5,F6 read + light edit | +6 weeks |
| M3 | Public launch: onboarding, scenarios, regime compare, Play Store | +4 weeks |
| M4 | iOS + Pro billing | +4 weeks |
