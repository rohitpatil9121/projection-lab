# App Flow — ProjectLab India
**Every screen, every state · v1.0**

Covers both platforms. `[W]` web-only, `[M]` mobile-only, unmarked = both.

---

## 0. Navigation map

```
(unauth) Splash [M] → Login → OTP → Onboarding (first time)
                                   ↘ (returning) →
(auth)   Dashboard ─ Plan ─ Accounts ─ Cash Flow ─ Monte Carlo ─ Milestones ─ Settings
Web:    left sidebar (existing) + topbar (scenario switcher, theme, avatar)
Mobile: bottom tabs: Home · Plan · Accounts · More(→ Cash Flow, Monte Carlo, Milestones, Settings)
```

---

## 1. Auth flow

### 1.1 Login screen
- Fields: email or mobile → [Continue] · "Continue with Google" · disclaimer footer.
- **States**: idle → submitting (button spinner) → OTP sent / error (invalid identity, rate-limited "try in X min", network-offline banner).

### 1.2 OTP screen
- 6-digit boxes, auto-advance, auto-submit on 6th; resend timer 30 s.
- **States**: verifying → success (route: has plans? Dashboard : Onboarding) / wrong OTP (shake + clear) / expired (resend CTA).

### 1.3 Session
- Silent refresh; on refresh-fail → soft logout, plans stay cached read-only with "Sign in to sync" banner.

---

## 2. Onboarding wizard (first login)
5 steps, progress dots, all skippable ("I'll do it later" → sample plan loads).

| Step | Inputs | Default |
|---|---|---|
| 1 About you | name, current age, retirement age, life expectancy | 30 / 60 / 85 |
| 2 Income | monthly take-home, growth % | ₹1L, 8% |
| 3 Savings | current: savings/FD, equity MF, EPF, PPF, NPS + monthly SIP each | — |
| 4 Loans | home/car/personal: balance, rate, EMI | none |
| 5 Goals | pick milestones (chips): Emergency fund, ₹1 Cr, child education, ₹5 Cr FI, loan-free | 3 pre-checked |

→ "Building your plan…" (engine runs locally, <1 s) → Dashboard with confetti + readiness score reveal.
**States**: any step valid-empty (skip) / invalid (inline error, e.g. retirement age ≤ current age).

---

## 3. Dashboard (Home)

**Layout** (existing web): 4 stat cards → projection chart → income vs expense + readiness gauge.
Mobile: stat cards horizontal-scroll snap; charts stacked full-width.

- Stat cards: Net Worth Today · At Retirement · Peak Net Worth · Plan Success %.
- Projection chart: stacked area per asset account; retire reference-line; **Today's money / Future value toggle** (persisted); tooltip = year, age, per-account values [W hover / M tap-hold].
- **States**:
  - Loading (skeleton shimmer cards + chart placeholder)
  - Empty (no accounts): illustration + "Add your first account" CTA → Accounts
  - Error (sync fail): cached data + amber "Offline — showing last synced" pill
  - Success < 50%: readiness card turns rose with "See suggestions" link → Monte Carlo explain card

## 4. Plan / Timeline

- Net-worth line + event dots (existing) → event list (timeline rail) → add-event form.
- Add event: name, age (slider 18–90), icon (emoji picker M / text W), cash impact ±.
- **States**: empty (no events → "Add life events like buying a home or retiring"); dot beyond life expectancy → validation toast; delete = hover trash [W] / swipe-left [M] with undo snackbar (5 s).

## 5. Accounts (existing 3-row layout)

Row cards: **Net Worth** (ring + 3 stat blocks) → **Assets** (ring + Savings/Investments/Real chips + editable 2-col list) → **Liabilities** (ring + Total Debt/Debt-to-Assets + editable list).

- Inline edits: name (text), balance (number), SIP chip `↑₹X/mo` (number + × remove), "+ SIP" ghost chip when none.
- Add account: inline dashed form (name, balance, growth, colour) [W] / bottom sheet [M].
- **States**: liability list empty → "Debt free! 🎉"; balance = 0 → row dims; invalid (negative) → red outline, not saved; every edit → debounced sync spinner in topbar (cloud icon: syncing/synced/offline-queued).

## 6. Cash Flow

- 4 mini stats → Sankey → 80C/80CCD(1B)/80D tax card → income/expense breakdown bars.
- Mobile: Sankey rendered horizontal-scroll (min-width 640) — pinch-zoom disabled, scroll hint arrow.
- Tax card states: bucket maxed (green "Maxed") / partial (amber %) / new-regime selected → card collapses to "Deductions don't apply in new regime — compare regimes" CTA (→ F10 screen when built).

## 7. Monte Carlo

- Stat row (Success %, Median, P90, P10) → fan chart → runs selector (250/500/1000) → ↻ re-run → "How to read this" cards.
- **States**: computing (chart dims + progress bar; ≥500 runs on M shows blocking spinner max 2 s); success ≥85 green "Very likely" / 70–84 lime / 50–69 amber "At risk" / <50 rose "Unlikely" + suggestions card (boost SIP / delay retirement / trim expenses — each is a tappable what-if that temporarily applies and shows new %).

## 8. Milestones

- Summary cards (achieved count, next milestone, FI year) → milestone grid with progress bars + projected year.
- **States**: achieved (green check + "by YYYY") / on-track (% + projected year) / unreachable in horizon (grey "Adjust plan" link) / payoff-type shows inverse progress.

## 9. Settings

- Profile & assumptions form · income/expense stream editors · tax regime + slab selects · currency · **dark mode** · data: export JSON, reset to sample, delete account (double-confirm typed "DELETE") · logout · app version.
- **States**: regime switch → instant recompute toast "Tax view updated"; reset → confirm dialog; delete → 30-day notice info.

## 10. Scenario switcher (P1)
- Topbar dropdown [W] / Home header chip [M]: list scenarios, ✓ active, "+ New scenario" (blank/clone), rename inline, delete (not last one).
- Compare mode [W]: pick 2 → Dashboard chart shows both lines (solid/dashed) + delta stat cards.

## 11. Global states
- **Offline**: grey banner; all edits queue; Monte Carlo & projections fully functional (local engine).
- **Sync conflict** (409): "Plan updated on another device — Reload / Keep mine".
- **Paywall**: locked feature shows blur + "Pro" badge → Razorpay sheet → success confetti → unlock without restart.
- **Force update** [M]: config-driven min-version gate screen.

## 12. Chart mapping web → mobile
| Web (Recharts/SVG) | Mobile |
|---|---|
| Stacked AreaChart (projection) | `victory-native` VictoryStack + VictoryArea |
| Line + ReferenceDot (timeline) | VictoryLine + VictoryScatter |
| Custom SVG DonutRing | same SVG via `react-native-svg` (code reuse) |
| Sankey | custom `react-native-svg` port (paths precomputed in engine) |
| MC fan (ComposedChart) | VictoryArea bands + VictoryLine median |
