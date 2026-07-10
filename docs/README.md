# ProjectLab India — Documentation

Product & engineering docs for taking the existing web prototype to a production **website + mobile app**.

| # | Doc | Answers |
|---|---|---|
| 1 | [PRD](01-PRD.md) | What we're building, for whom, why, and how we'll know it worked |
| 2 | [TRD](02-TRD.md) | The stack: monorepo, React Native + Expo, Node API, Postgres, client-side engine |
| 3 | [App Flow](03-App-Flow.md) | Every screen and every state (loading/empty/error/offline/conflict), web + mobile |
| 4 | [UI/UX Brief](04-UIUX-Brief.md) | Design tokens, signature components, motion, mobile patterns, a11y |
| 5 | [Backend Schema](05-Backend-Schema.md) | Tables, plan JSONB payload, sync protocol, DPDP compliance jobs |
| 6 | [Implementation Plan](06-Implementation-Plan.md) | 4 phases of AI-sized tasks with verify steps |

## Current state (July 2026)
Web prototype is **feature-complete for P0** at `apps` root (`npm run dev` → localhost:5173):
Dashboard · Plan/Timeline · Accounts (donut rings, inline editing, SIP chips) · Cash Flow (Sankey + 80C/80CCD/80D tracker) · Monte Carlo (fan chart) · Milestones · Settings. India-first: ₹ lakh/crore, EPF/PPF/NPS, 6% inflation, old/new regime awareness. Data = localStorage, no auth yet.

## Reading order
Building the backend? → 2, 5, 6. Building mobile? → 3, 4, 6. Stakeholder? → 1.
