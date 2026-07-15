// Flat vector illustrations that replace emojis on goal/milestone cards.
// Self-contained inline SVG — crisp at any size, offline-safe, no licensing.
// Each art is drawn on a 64×64 grid with bold shapes so it reads at 36–80px.

const S = ({ size = 72, children }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm select-none">
    {children}
  </svg>
)

// Piggy bank — savings
const Piggy = (p) => (
  <S {...p}>
    <ellipse cx="30" cy="36" rx="20" ry="15" fill="#f472b6" />
    <path d="M12 30c-3-1-6 1-6 4 0 2 2 3 4 3l3-1z" fill="#ec4899" />
    <circle cx="47" cy="34" r="7" fill="#ec4899" />
    <circle cx="46" cy="34" r="2.2" fill="#831843" />
    <circle cx="49" cy="33" r="2.2" fill="#831843" />
    <rect x="24" y="20" width="12" height="4" rx="2" fill="#be185d" />
    <circle cx="33" cy="31" r="2" fill="#831843" />
    <rect x="18" y="48" width="4" height="7" rx="2" fill="#be185d" />
    <rect x="38" y="48" width="4" height="7" rx="2" fill="#be185d" />
    <path d="M14 26c1-3 4-4 6-2" stroke="#f9a8d4" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="33" cy="12" r="7" fill="#fbbf24" />
    <circle cx="33" cy="12" r="4.5" fill="#f59e0b" />
    <path d="M33 9v6M31 12h4" stroke="#fff7ed" strokeWidth="1.6" strokeLinecap="round" />
  </S>
)

// Graduation cap — education
const Grad = (p) => (
  <S {...p}>
    <path d="M32 14 6 26l26 12 26-12z" fill="#1e293b" />
    <path d="M32 20 16 27l16 7 16-7z" fill="#334155" />
    <path d="M18 30v9c0 3 6 6 14 6s14-3 14-6v-9l-14 6z" fill="#0f172a" />
    <path d="M58 26v11" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="58" cy="39" r="3.5" fill="#f59e0b" />
    <path d="M58 39v6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
  </S>
)

// Diamond — net worth / wealth
const Diamond = (p) => (
  <S {...p}>
    <path d="M18 16h28l10 12-24 26L8 28z" fill="#38bdf8" />
    <path d="M18 16 8 28h48L46 16z" fill="#7dd3fc" />
    <path d="M8 28h48L32 54z" fill="#0ea5e9" />
    <path d="M18 16 24 28l8 26M46 16 40 28l-8 26M8 28h48" stroke="#e0f2fe" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M24 28h16" stroke="#bae6fd" strokeWidth="1.4" />
  </S>
)

// Palm + sun — retirement / financial freedom
const Beach = (p) => (
  <S {...p}>
    <circle cx="46" cy="18" r="9" fill="#fbbf24" />
    <path d="M46 5v-3M46 34v3M58 18h3M31 18h3M55 9l2-2M35 27l2 2M55 27l2 2M35 9l2-2" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
    <path d="M26 54c0-14 1-22 2-30" stroke="#a16207" strokeWidth="4" strokeLinecap="round" />
    <path d="M28 22c-6-4-13-3-17 2 5-1 9 0 12 3M28 22c-1-7-6-12-13-12 4 3 6 7 6 11M28 22c6-4 13-3 17 3-5-2-9-1-12 2M28 22c2-6 8-10 15-9-5 2-8 6-9 10" fill="#22c55e" />
    <ellipse cx="32" cy="55" rx="24" ry="3" fill="#fde68a" />
  </S>
)

// House — real estate
const House = (p) => (
  <S {...p}>
    <path d="M32 10 8 30h48z" fill="#ef4444" />
    <path d="M32 10 8 30h6l18-15 18 15h6z" fill="#dc2626" />
    <rect x="14" y="30" width="36" height="24" fill="#fca5a5" />
    <rect x="14" y="30" width="36" height="24" stroke="#fecaca" strokeWidth="1" />
    <rect x="27" y="40" width="10" height="14" rx="1" fill="#7f1d1d" />
    <rect x="18" y="35" width="7" height="7" rx="1" fill="#fef2f2" />
    <rect x="39" y="35" width="7" height="7" rx="1" fill="#fef2f2" />
    <circle cx="35" cy="47" r="1" fill="#fbbf24" />
  </S>
)

// Car — vehicle
const Car = (p) => (
  <S {...p}>
    <path d="M8 40c0-3 2-5 4-6l6-9c1-2 3-3 5-3h14c2 0 4 1 5 3l6 9c2 1 3 3 3 6v5H8z" fill="#377cc8" />
    <path d="M23 24h8v9H17z" fill="#b3d0ec" />
    <path d="M35 24h6l4 9H35z" fill="#b3d0ec" />
    <rect x="6" y="42" width="52" height="6" rx="3" fill="#274a75" />
    <circle cx="19" cy="48" r="6" fill="#1e293b" /><circle cx="19" cy="48" r="2.5" fill="#94a3b8" />
    <circle cx="45" cy="48" r="6" fill="#1e293b" /><circle cx="45" cy="48" r="2.5" fill="#94a3b8" />
    <rect x="50" y="36" width="5" height="4" rx="1" fill="#fde68a" />
  </S>
)

// Interlocked rings — wedding / life event
const Rings = (p) => (
  <S {...p}>
    <circle cx="25" cy="38" r="13" stroke="#fbbf24" strokeWidth="5" fill="none" />
    <circle cx="40" cy="38" r="13" stroke="#f59e0b" strokeWidth="5" fill="none" />
    <path d="M27 16l5-6 5 6-5 5z" fill="#38bdf8" />
    <path d="M27 16h10l-5 5z" fill="#0ea5e9" />
  </S>
)

// Rising bars + arrow — investment
const Chart = (p) => (
  <S {...p}>
    <rect x="10" y="38" width="9" height="16" rx="2" fill="#85b4e0" />
    <rect x="24" y="30" width="9" height="24" rx="2" fill="#5695d4" />
    <rect x="38" y="20" width="9" height="34" rx="2" fill="#377cc8" />
    <path d="M12 34l12-8 10 5 14-14" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M42 17h8v8" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

// Shield with check — debt payoff / protection
const Shield = (p) => (
  <S {...p}>
    <path d="M32 8 12 15v13c0 13 9 22 20 28 11-6 20-15 20-28V15z" fill="#22c55e" />
    <path d="M32 8 12 15v13c0 13 9 22 20 28V8z" fill="#16a34a" />
    <path d="M23 31l6 7 12-14" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

// Trophy — achieved / crore
const Trophy = (p) => (
  <S {...p}>
    <path d="M20 12h24v10c0 8-5 13-12 13s-12-5-12-13z" fill="#fbbf24" />
    <path d="M20 14h-6c0 6 3 9 7 10M44 14h6c0 6-3 9-7 10" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round" />
    <rect x="28" y="34" width="8" height="8" fill="#f59e0b" />
    <rect x="22" y="42" width="20" height="5" rx="2" fill="#d97706" />
    <rect x="18" y="47" width="28" height="6" rx="2" fill="#b45309" />
    <path d="M28 20l3 4 5-6" stroke="#fffbeb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

// Checkered flag — goal complete
const Flag = (p) => (
  <S {...p}>
    <path d="M16 8v48" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
    <path d="M20 10h30v22H20z" fill="#f8fafc" />
    <g fill="#1e293b">
      <rect x="20" y="10" width="7.5" height="5.5" /><rect x="35" y="10" width="7.5" height="5.5" />
      <rect x="27.5" y="15.5" width="7.5" height="5.5" /><rect x="42.5" y="15.5" width="7.5" height="5.5" />
      <rect x="20" y="21" width="7.5" height="5.5" /><rect x="35" y="21" width="7.5" height="5.5" />
      <rect x="27.5" y="26.5" width="7.5" height="5.5" /><rect x="42.5" y="26.5" width="7.5" height="5.5" />
    </g>
  </S>
)

// Bird — debt-free
const Bird = (p) => (
  <S {...p}>
    <path d="M14 34c0-9 7-16 16-16 6 0 10 3 13 7l7-2-3 6 4 3-6 1c-1 8-8 14-16 14-2 0-4 0-6-1l-9 5 3-9c-2-2-3-5-3-8z" fill="#38bdf8" />
    <path d="M43 25l7-2-3 6 4 3-6 1" fill="#0ea5e9" />
    <circle cx="24" cy="30" r="2" fill="#0c4a6e" />
    <path d="M20 42c4-3 9-4 14-2" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" />
  </S>
)

// Target — generic goal
const Target = (p) => (
  <S {...p}>
    <circle cx="32" cy="32" r="22" fill="#e0e7ff" />
    <circle cx="32" cy="32" r="22" stroke="#377cc8" strokeWidth="3" />
    <circle cx="32" cy="32" r="14" fill="#b3d0ec" stroke="#377cc8" strokeWidth="3" />
    <circle cx="32" cy="32" r="6" fill="#377cc8" />
    <path d="M32 32l16-16M46 12h4v4" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

const ART = {
  SAVINGS: Piggy,
  EDUCATION: Grad,
  'NET WORTH': Diamond,
  INVESTMENT: Chart,
  'FINANCIAL FREEDOM': Beach,
  RETIREMENT: Beach,
  'REAL ESTATE': House,
  VEHICLE: Car,
  'LIFE EVENT': Rings,
  'DEBT PAYOFF': Shield,
  TROPHY: Trophy,
  FLAG: Flag,
  BIRD: Bird,
  TARGET: Target,
}

// Map a free-text name (life events, quests) to an illustration kind.
export function kindFromText(text = '') {
  const n = text.toLowerCase()
  // Order matters: more specific intents first (marriage before the generic
  // "child…" that also appears in "child's education").
  if (/wedding|marriage|engagement/.test(n)) return 'LIFE EVENT'
  if (/home|house|flat|apartment|property|estate|downsize/.test(n)) return 'REAL ESTATE'
  if (/educat|college|school|study|degree|ivy|tuition/.test(n)) return 'EDUCATION'
  if (/car|vehicle|bike|scooter/.test(n)) return 'VEHICLE'
  if (/retire|freedom|independence|fire|sabbatical|travel|trip|vacation|holiday/.test(n)) return 'RETIREMENT'
  if (/emergency|safety|insurance|health|protect|shield|debt|loan|clear|payoff/.test(n)) return 'DEBT PAYOFF'
  if (/sip|invest|equity|mutual|nps|epf|ppf|portfolio/.test(n)) return 'INVESTMENT'
  if (/crore|net worth|wealth|corpus|₹1/.test(n)) return 'NET WORTH'
  return 'TARGET'
}

// Moment id → illustration kind.
export const MOMENT_KIND = { crore: 'TROPHY', 'debt-free': 'BIRD', doubled: 'INVESTMENT', emergency: 'DEBT PAYOFF' }

export default function GoalGraphic({ kind = 'TARGET', size = 72, className = '' }) {
  const Art = ART[kind] || ART.TARGET
  return (
    <span className={`inline-grid place-items-center ${className}`}>
      <Art size={size} />
    </span>
  )
}
