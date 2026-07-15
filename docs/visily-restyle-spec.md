# Visily Restyle Spec — "Institutional Minimalism"

Source: `visily-multiscreens.pdf` (8 mobile mocks), rendered pages at
`C:\Users\rohit\AppData\Local\Temp\claude\D--all-projects-oasis-globe\5b787654-e9dd-4dc1-b62f-2ea79367cab1\scratchpad\visily\page1..8.png`.
Every page must match this system. Mobile-first (~430px), but desktop (sidebar layout) must stay usable — use responsive grids, never break wide screens.

## Tokens & primitives (already implemented — USE THESE, don't invent)
- Canvas: `bg-ink-50` light gray (existing). Cards: `.card` / `<Card>` white rounded-2xl.
- Primary: existing `brand` indigo. Dark hero: `<HeroCard>` / `.hero-card` (navy gradient, white text).
- ALL money figures: add `money` class (mono font, tabular). Big values: `text-3xl font-extrabold money`.
- Section headers OUTSIDE cards: `<SectionLabel action={...}>RETIREMENT VAULT</SectionLabel>` — uppercase 11px gray, optional right-side action link (`text-brand-600 text-xs font-bold uppercase` or normal case link).
- Chips: `.chip` + color classes; XP/tag chips: `.xp-chip`. Status: green `bg-emerald-100 text-emerald-700`, red `bg-rose-100 text-rose-700`, amber for warnings. Dark-mode variants like existing code (`dark:bg-emerald-500/15 dark:text-emerald-300`).
- FAB: `<Fab>` with an icon, only where the mock shows one (Today, Accounts).
- Buttons/inputs: existing `.btn-primary/.btn-secondary/.btn-ghost/.input`.
- Right-side header links in mock ("VIEW ALL", "HISTORY", "rebalance"): `<button|Link className="text-xs font-bold text-brand-600 uppercase tracking-wide">`.
- Icons: `components/Icons.jsx` (stroke SVG). Add new icons there if needed, same style. Emoji only where mock uses illustration-ish icons (quests/milestones use rounded `bg-brand-50` icon tiles).
- Icon tiles: `grid place-items-center h-10 w-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15`.

## Data honesty (hard rule)
Every number comes from real store/engine data. NO fabricated XIRR, bank accounts, or fake streaks. Engine helpers available via `../data/store.js` re-exports or `@projectlab/engine`:
`computeProjection, computeReadiness, runMonteCarlo, computeTaxSummary, deductionsFromPlan, computeFitness, computeStages, computeQuests, computeMoments, growthVsContributions, savingsRateSeries, allocationVsTarget, coastFiAge, corpusLastsToAge, consistencyCells, evaluateGoal, fmtMoney, CURRENT_YEAR`.
`useProjection()` from `../data/useProjection.js` gives `{ projection, readiness, state }`.
Store: `useStore` selectors; mutations `setProfile/updateItem/addItem/removeItem/update`; snapshots at `s.snapshots`.

## Per-screen blueprint

### page1 — Landing (`pages/Landing.jsx`)
Dark navy full-screen. Center: brand icon in indigo circle → H1 "Engineering Your Wealth" (white, bold, 2 lines) → sub "Institutional-grade planning for the modern Indian investor. Secure, precise, and transparent." → two outlined pill chips (shield "Secure Assets", trend "Smart Growth") → full-width `Get Started →` primary + outlined `Sign In ›` → footer `FINANCIAL BLUEPRINT · V1.0.4` (tiny, letterspaced). Keep existing timing/navigation callbacks (`onComplete('guest'|'signin'|...)`) and Android back handling.

### page2 — Login (`pages/Login.jsx`)
Light. Back chevron top-left. Indigo logo dot. H1 "Welcome Back", sub "Sign in to access your Financial Blueprint and track your net worth." Uppercase field labels (EMAIL ADDRESS / PASSWORD with `forgot?` right link), icons inside inputs, "Secure login on this device" checkbox, big `SIGN IN →`, divider "secure authentication", "New to Financial Blueprint? **Open an Account**", footer trust line "🛡 END-TO-END ENCRYPTION ENABLED" (tiny uppercase gray). Keep ALL existing auth logic/modes (password/register/forgot/email-OTP/phone-OTP, guest link) — restyle, don't remove. Tab switcher Log in/Sign up may stay as segmented control.

### page3 — Onboarding intro (`pages/Onboarding.jsx`)
Restyle the FIRST (welcome) step as the mock: logo dot top-left, `SKIP` top-right (→ sandbox/persona quick start), illustration block (use a rounded gradient panel w/ big emoji — no stock images), pill tag `the loop`, H1 "Build Your Wealth Habit", body copy, 3 progress dots, full-width `Continue ›`, tiny ToS line. Keep the existing wizard steps/validation; restyle step chrome (progress dots + uppercase labels + `.input`).

### page4 — Today (`pages/Today.jsx`) — done by main agent, reference only.
Greeting "NAMASTE," + name + bell; navy HeroCard net worth (₹ mono, `+x.x% vs last month` chip from snapshots, INVESTMENTS / CASH & BANK mini columns); Financial Fitness card (ring + band chip + hint, → /milestones); MONTHLY CHECK-INS row (consistencyCells, last 6 months as check squares); WEALTH JOURNEY chart card (projection line, VIEW FORECAST → /monte-carlo); check-in due banner (gradient, START REVIEW → /accounts); ACTIVE QUESTS horizontal rail (computeQuests); PORTFOLIO HIGHLIGHTS rows (top asset accounts, → /accounts); Fab.

### page5 — Plan (`pages/Plan.jsx`)
Header: H1 "Future Blueprint" sub "Strategic wealth mapping". Stage stepper across top: `computeStages()` 5 stages — done = filled indigo circle w/ check, current = outlined indigo number, upcoming = gray; connector lines; uppercase tiny labels. RETIREMENT VAULT card: "Planned Retirement Age" + big `58 YRS` (mono), the EXISTING draftRetire slider, then two bordered mini-cells: Target Corpus (investable at retirement from projection, mono) + Monthly Pension (4% SWR / 12 of that corpus, mono, label "est. pension (4% rule)"). MICRO-QUESTS section: `computeQuests()` rows (icon tile, title, desc, right `+Protection`-style tag chip). STRATEGIC MILESTONES: life events list (icon, name, year → `CURRENT_YEAR + (age - currentAge)`, amount mono, On Track status where derivable). Keep existing add/edit/remove event modal + the projection chart with event markers (place chart inside a card below the vault).

### page6 — Accounts (`pages/Accounts.jsx`)
Header row: avatar dot + "Portfolio Value" + big mono total assets + search omitted. Stat cells: LIQUIDITY (CASH) = cash+FD balances; second cell "AVG GROWTH (WTD)" = balance-weighted growth rate of assets (label honestly, NOT XIRR). ASSET ALLOCATION card: donut (SVG or recharts Pie) of asset types (Equity=investment, Retirement, Cash, Property) with center "NET WORTH ₹x", legend grid w/ colored dots + mono values, `rebalance` link → keep existing per-account editing below. ACTIVE INVESTMENTS (SIP) horizontal cards from contributions (name of target account, ₹/yr mono, growth chip). WEALTH PROJECTION (5Y) card: small area/line from projection next 5 years, `CONFIG RATES` link → /settings. ACCOUNTS list: existing account rows restyled as bank-row style (icon tile, name, mono balance, chip for kind), keep inline edit + add. TAX OPTIMIZATION: two cards from `deductionsFromPlan` (80C used/cap, utilization chip, hint line) linking → /tax. INSTITUTIONAL INSIGHT: indigo gradient card with top quest from `computeQuests` + button. Fab (+ add account).

### page8 — Settings (`pages/Settings.jsx`)
Header + sub "Manage your profile, financial assumptions, and ritual preferences". USER PROFILE section: card w/ avatar circle (initials), name, "since ..." or plan status, chevron; contact-style cards for email (from auth) — omit phone if absent. FINANCIAL RATES (%) section w/ `Reset to Default` link: grid of labeled inputs — Inflation, plus keep existing profile fields (ages, currency, regime, gross salary) styled the same; keep FlowEditors under "INCOME & EXPENSES" SectionLabel. PREFERENCES section: toggle rows (icon + label + Switch) for Dark Mode, Real terms, Tax-aware projections — real toggles only. Subscription Plan row w/ `Pro` chip (static upsell → no billing). SUPPORT: Help/Privacy Policy rows (privacy → existing /privacy-policy.html link). Red-outline `Sign Out` (auth only) + existing reset/clear cards restyled as rows. Footer: tiny centered "Financial Blueprint v1.0 · Institutional Minimalism Theme". Use a shared `<ToggleRow>`/`<Row>` local component.

### page7 — Goals (`pages/Milestones.jsx`)
Header: target icon tile + H1 "Life Goals" sub "mapping your financial future". Streak HeroCard (indigo `bg-brand-600` gradient variant): `🔥 {steady}-MONTH CHECK-IN STREAK` (consistencyCells), "Monthly check-in complete/due", yearly contributions this month figure (sum contributions/12, mono), NEXT REVIEW = 1st of next month, `View Schedule`-style button → keeps existing behavior or scrolls. RECENT MILESTONES: horizontal chips from `computeMoments`. YOUR ACTIVE GOALS + `+ NEW GOAL` button (existing add flow): each goal card = gradient header band (per-goal hue from its color/icon, big emoji centered) + category pill + goal name + `REACHED x%` + CURRENT SAVINGS / TARGET AMOUNT (mono) + progress bar + status dot (Ahead/On track/Needs correction from evaluateGoal) + target year. Keep existing edit/priority/SIP-gap details (can live in expander or below card). Preserve Journey components (`components/Journey.jsx`) if currently rendered — integrate its fitness/stage content only if it fits the mock layout; the page must look like mock p7.

## Consistency checklist (apply on every page)
- Section headers use `<SectionLabel>` OUTSIDE cards; card-internal titles only when the mock shows them inside.
- Money = `money` class everywhere (values, not labels).
- Dark mode must remain legible (existing `dark:` conventions).
- Keep every existing feature/handler — this is a RESTYLE + additive redesign, never remove functionality. If a mock element has no honest data source, use the closest real metric and label it truthfully.
- No new npm deps. Recharts + inline SVG only.
- After editing, the file must compile: `npm run build -w web`.
