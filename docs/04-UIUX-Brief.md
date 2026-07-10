# UI/UX Brief — ProjectLab India
**How it looks and feels · v1.0**

---

## 1. Design personality
**"Calm confidence about money."** Not a trading app (no red/green panic), not a bank (no bureaucracy). A planner that makes a 30-year future feel legible. Friendly, numerate, slightly celebratory when users hit goals.

Feel references: existing web build (keep it), Linear's restraint, Cred's polish minus the drama.

## 2. Design tokens (already implemented in `tailwind.config.js` — mirror in RN theme)

### Color
| Token | Value | Use |
|---|---|---|
| `brand-600` | `#4f46e5` (indigo) | Primary actions, active nav, median lines |
| `brand-500` | `#6366f1` | Charts primary, accents |
| `ink-900…50` | slate scale | Text/surfaces (light) |
| `ink-950` | `#0b1120` | Dark-mode background |
| Success | emerald `#22c55e` | Assets, achieved, positive |
| Danger | rose `#ef4444` | Liabilities, deficits |
| Warning | amber `#f59e0b` | Real estate, at-risk |
| Per-account | user-pickable; defaults: equity indigo, EPF violet, PPF purple, NPS sky, home amber, loans rose | Chart segments must match list dots everywhere |

Semantic rule: **emerald = what you own, rose = what you owe, indigo = what we project.** Never break it.

### Type
- **Inter** (web, loaded) / Inter via `expo-font` (mobile).
- Display numbers: 800 weight, tight tracking (`₹5.67 Cr` is the hero everywhere).
- Scale: 11 caption · 12 label · 14 body · 16 emphasized · 20 section title · 24–30 stat values.
- Numerals: Indian grouping always (`en-IN`), compact = `L`/`Cr` (formatter exists).

### Shape & depth
- Radius: cards 16 (rounded-2xl), inputs/buttons 12, chips full.
- Shadows: `shadow-card` subtle 2-layer; dark mode = borders instead of shadows (`ink-800`).
- Cards on `ink-50` canvas (light) / `ink-900` on `ink-950` (dark).

### Spacing
4-pt grid. Card padding 20. Page gutter 20 [M] / 32 [W]. Section gap 24.

## 3. Signature components (exist on web — port faithfully)
1. **DonutRing** — SVG ring, value+label centered, per-account segments, track in `ink-100`. The brand mark of the product.
2. **Stat card** — caption-top, big number, sub/chip below; gradient tint variants (brand/green/amber/rose).
3. **SIP chip** — emerald pill `↑ ₹15,000/mo`, inline-editable number, × to remove; dashed ghost "+ SIP" when absent.
4. **Editable row** — dot · name(input) · chip · progress bar+% · ₹ balance(input) · hover/swipe delete. No "edit mode" — everything is always editable in place.
5. **Fan chart** — layered percentile bands (10-90 light, 25-75 mid) + bold median.
6. **Tax bucket card** — progress to cap, "Maxed" state, CFP tip footnote.

## 4. Motion
- Micro only, 150–250 ms ease-out: card hover lift [W], tab crossfade, number count-up on first Dashboard load (600 ms), ring sweep-in on mount (400 ms, once).
- Charts: **no** re-animation on data edits (learned: recharts animation race) — values snap, tooltip follows.
- Celebrations: confetti burst (lottie) on milestone achieved + onboarding completion. Max once per event.
- Respect `prefers-reduced-motion` / RN `AccessibilityInfo.isReduceMotionEnabled`.

## 5. Interaction principles
1. **Edit-in-place, save-never** — no save buttons; debounced autosave with cloud-status icon (synced ✓ / syncing ↻ / offline ⏸).
2. **Every edit re-projects instantly** — the "living plan" feeling is the core delight; keep recompute <16 ms.
3. **Money in, jargon out** — say "Today's money", not "inflation-adjusted real terms" (keep tooltip explainer).
4. **Hinglish-tolerant microcopy** — EN default; strings externalized for later hi-IN.
5. **One number to rule a screen** — each screen has a hero number (Dashboard: success %; Accounts: net worth; MC: success %; Cash Flow: savings rate).

## 6. Mobile-specific patterns
- Bottom tabs (5): Home, Plan, Accounts, More. FAB "+ " on Accounts/Plan for add.
- Bottom sheets for all forms (add account, add event, SIP edit keyboard-type numeric).
- Pull-to-refresh = re-sync. Swipe-left row = delete with undo snackbar.
- Number entry: custom ₹ keypad with `+₹10k / +₹1L` quick-add buttons.
- Charts: tap-hold scrubber with haptic tick per year.

## 7. Dark mode
Class-based (exists on web). Charts: same hues, 85% opacity fills, gridlines `ink-800`, tooltips `ink-800` surface. Rings: track `ink-800`. Test every screen — parity is a launch requirement.

## 8. Accessibility
- Contrast AA minimum (indigo-600 on white passes; never amber text < 16 px).
- All charts get a data-table fallback ("View as table" link) for screen readers.
- Touch targets ≥44 pt; inline inputs get visible focus ring (`brand-500/20` glow, exists).
- Financial figures announced with full words: "₹5.67 crore" not "5.67 Cr".

## 9. Empty/edge content
- Empty states: single-line + soft illustration + one CTA (no walls of text).
- Negative net worth: ring turns rose, copy stays neutral: "Liabilities exceed assets — your plan shows the path out."
- Huge numbers (>₹100 Cr): formatter already handles; chart Y-axis switches to `Cr` steps.

## 10. Deliverables checklist (design)
- [ ] Figma library: tokens, 6 signature components, all 9 screens × light/dark × W/M
- [ ] RN theme file mirroring Tailwind tokens (`packages/ui-tokens`)
- [ ] Lottie: confetti, onboarding "building your plan"
- [ ] App icon + splash (PL ring motif), Play Store listing assets
