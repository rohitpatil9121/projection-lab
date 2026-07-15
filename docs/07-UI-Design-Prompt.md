# Financial Blueprint — UI/UX Design Prompt
**Use this in Figma AI, v0, Galileo, Uizard, or any design tool · Updated July 2026**

Copy everything below the line into your design tool.

---

## PRODUCT CONTEXT

**App name:** Financial Blueprint (India-first financial planning simulator)

**One-liner:** Users model their entire financial life — salary, SIP, EPF/PPF/NPS, loans, life events — and see year-by-year net-worth projections, retirement readiness, Monte Carlo risk, and goal tracking. All money in **₹ lakh/crore**. Not investment advice; illustration only.

**Platform:** Mobile-first Android app (Capacitor WebView) + responsive web. Primary device = phone (360–430px width).

**Target users:**
- Salaried professional 25–40: "Am I saving enough? When can I retire?"
- FIRE aspirant 28–45: aggressive SIP, corpus longevity
- Pre-retiree 45–58: will money last to 85?

**Design personality:** Calm confidence about money. Not a trading app (no panic red/green). Not a bank (no bureaucracy). Friendly, numerate, visual-first. Simple to click, easy to understand. Minimal friction, flat learning curve.

**References:** ProjectionLab (chart clarity), Cred polish (minus drama), Linear restraint.

---

## VISUAL SYSTEM

### Colors
- Primary: Indigo `#4f46e5` (brand-600), `#6366f1` (brand-500)
- Background light: `#f8fafc` (ink-50), cards white
- Background dark: `#0b1120` (ink-950), cards `#0f172a` (ink-900)
- Text: slate scale ink-900 → ink-400
- Semantic: Emerald `#22c55e` = assets/positive · Rose `#ef4444` = liabilities/negative · Amber `#f59e0b` = warning · Violet `#8b5cf6` = retirement accounts

### Typography
- Font: **Inter**
- Hero numbers: 800 weight, tight tracking — e.g. **₹5.67 Cr**, **₹13,200**
- Indian number format always (en-IN grouping, L/Cr compact)
- Scale: 10px nav labels · 12px captions · 14px body · 16px section titles · 24–36px stat values

### Shape
- Cards: 16px radius, soft shadow (light) / border (dark)
- Buttons & inputs: 12px radius, min height 44px (touch-friendly)
- Chips/pills: full radius

### Spacing
- 4pt grid, card padding 16–20px, page gutter 20px mobile

---

## INFORMATION ARCHITECTURE

### Entry flow
1. **Landing** (first open per session) — animated dark hero, logo, tagline, feature chips, progress bar, Get Started / Sign In / Guest
2. **Login** — email+password, OTP, Continue as guest
3. **Onboarding** — walkthrough OR sandbox persona picker (6 India personas)
4. **Main app**

### Bottom navigation (mobile — 5 tabs)
| Tab | Screen | Purpose |
|-----|--------|---------|
| Today | Home | Net worth, **projection chart**, monthly cash flow, account categories, priority checklist |
| Plan | Financial Plan | Hero net worth, main projection chart, retirement age stepper, life events, important factors |
| Accounts | Accounts | Donut rings, assets/liabilities, inline edit, SIP chips |
| Goals | Milestones | Goal progress, on-track badges, required SIP, priority ranking |
| Settings | Settings | Profile, inflation %, income/expense editors, sync, reset |

### Secondary screens (sidebar on web / links from Plan)
- Dashboard — stacked net-worth area chart, income vs expense, readiness gauge
- Cash Flow — income/expense breakdown
- Monte Carlo — success probability fan chart

---

## SCREEN-BY-SCREEN REQUIREMENTS

### 1. Landing (splash)
- Full-screen dark (`ink-950`) with floating indigo/emerald gradient orbs
- Logo with glow ring, animated scale-in
- Headline: "Plan your future in **₹ lakh & crore**"
- 4 feature chips (2×2 grid): projection, goals, Monte Carlo, India instruments
- Animated SVG chart line drawing in background
- Bottom: auto progress bar, **Get started** (white primary), **Sign in** (ghost), **Continue as guest** (text link)
- Motion: stagger fade-in-up, 4–5s auto-advance

### 2. Today (Home) — MOST IMPORTANT
- Top: 4 stat cards in 2×2 grid — Net Worth, Total Assets, Total Loans, Savings Rate %
- **Hero: full-width projection chart** (purple net-worth line + teal surplus bars, age axis, retirement marker, end label ₹X Cr)
- "Open plan →" link on chart card
- This Month: 4 tiles — Income / Expenses / Investing / Left Over (monthly ₹)
- Account category cards (Cash, Investments, Retirement, Property, Debt) with amounts + Manage link
- Financial Priorities checklist (6 items with progress bars): emergency fund, health insurance, high-interest debt, retirement savings, 20% savings rate, SIP running

### 3. Plan
- Current net worth large at top + Tail Risk link
- Same projection chart as home (larger)
- Retirement age stepper (− / 60 RETIREMENT / +) + Update button
- Important Factors: 3 cards — Events, Asset Allocation, Income & Expense
- **Life Events section always visible** with **+ Add** button; empty state = dashed box "Add your first life event"
- Event markers as emoji circles below chart (not on chart line)

### 4. Accounts
- Net Worth card with **donut ring** (center value + colored segments per account)
- Assets card: donut + category chips (Savings / Investments / Real) + editable rows
- Each row: color dot · name · SIP chip `↑ ₹X/mo` · progress bar · balance · return % input
- Liabilities card: same pattern, rose tones
- Add account: dashed inline form or bottom sheet

### 5. Goals (Milestones)
- 3 summary cards: Goals achieved, Behind schedule, FI year
- Goal list with: emoji, name, progress bar, on-track badge (ahead/on-track/behind), required monthly SIP, inflation-adjusted target
- Priority reorder (↑↓)
- + Add goal button

### 6. Settings
- Account & Sync card (sign in / cloud sync status)
- Profile: name, ages, **inflation as %** (e.g. 6 not 0.06), currency
- **No tax regime fields** (removed for simplicity)
- Income Streams & Expenses: editable rows with **growth shown as %** (5% not 0.05), age range, yearly ₹ amount
- Reset / Clear account actions

### 7. Login
- Split hero (desktop) / card-only (mobile)
- Animated gradient background orbs
- Tabs: Log in / Sign up
- Email, password, OTP option, **Continue as guest**
- Feature bullets with emoji icons

### 8. Monte Carlo
- Success % hero (color-coded verdict)
- Fan chart (percentile bands + median line)
- Run count toggle: 250 / 500 / 1000
- "How to read this" explainer cards

---

## CHART DESIGN RULES (critical)

1. **Net-worth line:** solid indigo `#4f46e5`, stroke 3px, linear (not curved) — avoids overshoot on big jumps
2. **Surplus bars:** teal `#14b8a6` pre-retirement, indigo post-retirement; separate Y-axis from line
3. **Retirement marker:** green dashed vertical line with label
4. **End label:** indigo pill badge with compact ₹ (e.g. ₹1.76 Cr) — must not clip off screen
5. **Event/goal markers:** emoji circles in a strip **below** chart, not scatter on line
6. **No chart animation on data change** — values snap instantly
7. Tooltip: Age, Net worth, Surplus on tap/hover

---

## INTERACTION PRINCIPLES

1. **Edit in place** — no Save buttons; autosync with cloud status icon
2. **Every edit re-projects instantly** — living plan feeling
3. **Rates always in %** — inflation 6%, growth 5%, never decimals like 0.06
4. **One hero number per screen** — Today: net worth; Plan: net worth; MC: success %
5. **Visual-first** — charts and rings over tables
6. **Android back button** — navigates back in app, doesn't close; modals close first
7. **Dark mode** — class toggle, full parity required

---

## MOTION

- Landing: float orbs, stagger chips, chart line draw, progress bar fill, fade-out exit
- Micro: 150–250ms ease-out on buttons (active scale 0.97)
- Cards: subtle hover lift on web
- Charts: NO re-animation on edit
- Respect reduced-motion preference

---

## EMPTY STATES

- No accounts: "Add accounts and income to see your projection" centered in chart area
- No life events: dashed CTA box with emoji + "Add your first life event"
- No goals: prompt to add first goal
- Negative net worth: neutral copy, rose accents — "Liabilities exceed assets"

---

## OUT OF SCOPE (do not design)

- Tax regime comparison / 80C tracker (removed from v1 UI)
- Broker integration, live market data
- Real money movement
- Family/multi-user plans

---

## DELIVERABLES CHECKLIST

- [ ] Mobile frames: 390×844 — all 8 screens × light + dark
- [ ] Component library: DonutRing, StatCard, ProjectionChart, SIP chip, Editable row, Priority item, Life Event row
- [ ] Landing animation storyboard (3 phases)
- [ ] Bottom nav + top bar with scenario switcher
- [ ] App icon + splash (logo on indigo gradient)
- [ ] Play Store screenshots: Today chart, Plan, Goals, Monte Carlo success %

---

## COPY-PASTE PROMPT (short version for AI tools)

> Design a mobile-first financial planning app called **Financial Blueprint** for Indian users. Dark-mode capable, indigo primary (#4f46e5), Inter font, ₹ lakh/crore numbers. Screens: animated landing splash, login, onboarding, **Today home with large net-worth projection chart**, Plan page with retirement slider and life events, Accounts with donut rings and SIP chips, Goals with progress bars, Settings with % rates. Style: calm, visual, simple — like ProjectionLab meets Cred. Charts: purple net-worth line + teal bars, emoji event markers below chart. Bottom nav: Today, Plan, Accounts, Goals, Settings. Touch targets 44px+, cards rounded-2xl, no clutter, no tax forms. Show light and dark variants.
