// Lightweight inline SVG icon set (stroke-based, inherits currentColor).
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const S = ({ children, size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>{children}</svg>
)

export const IconDashboard = (p) => <S {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></S>
export const IconPlan = (p) => <S {...p}><path d="M4 5h16M4 12h16M4 19h16" /><circle cx="8" cy="5" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="11" cy="19" r="2" fill="currentColor" stroke="none" /></S>
export const IconAccounts = (p) => <S {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></S>
export const IconFlow = (p) => <S {...p}><path d="M4 6h6c4 0 4 12 8 12h2M4 18h6c4 0 4-6 8-6h2" /></S>
export const IconMilestone = (p) => <S {...p}><path d="M12 2v6M5 8l7-3 7 3-7 3-7-3z" /><path d="M12 11v11" /><path d="M6 22h12" /></S>
export const IconSettings = (p) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L16 2H8l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 3 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L8 22h8l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></S>
export const IconSun = (p) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></S>
export const IconMoon = (p) => <S {...p}><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" /></S>
export const IconPlus = (p) => <S {...p}><path d="M12 5v14M5 12h14" /></S>
export const IconTrash = (p) => <S {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></S>
export const IconTrend = (p) => <S {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></S>
export const IconTarget = (p) => <S {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></S>
export const IconCheck = (p) => <S {...p}><path d="M5 13l4 4L19 7" /></S>
export const IconChevron = (p) => <S {...p}><path d="M9 6l6 6-6 6" /></S>

// Google's four-colour "G". Their brand guidelines require the official mark in its
// own colours, so this one opts out of the stroke/currentColor treatment above.
export const GoogleMark = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
  </svg>
)
export const IconDice = (p) => <S {...p}><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" /><circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" /></S>
export const IconTax = (p) => <S {...p}><path d="M19 5L5 19" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></S>
export const IconHome = (p) => <S {...p}><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></S>
export const IconBell = (p) => <S {...p}><path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M10.3 20a2 2 0 0 0 3.4 0" /></S>
export const IconShield = (p) => <S {...p}><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></S>
export const IconMail = (p) => <S {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7.5l9 6 9-6" /></S>
export const IconLock = (p) => <S {...p}><rect x="4" y="10.5" width="16" height="9.5" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></S>
