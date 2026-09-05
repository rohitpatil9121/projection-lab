import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconTrend } from './Icons.jsx'
import { registerBackHandler } from '../hooks/backButton.js'

// Centered modal dialog with backdrop. Portals to body so sticky/filter ancestors don't offset it.
// `className` widens the panel for content-heavy dialogs; max-w-sm is right for a
// confirm, and wrong for a form with fifteen fields in it.
export function Modal({ open, onClose, title, className = 'max-w-sm', children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !onClose) return undefined
    return registerBackHandler(() => {
      onClose()
      return true
    })
  }, [open, onClose])

  if (!open) return null
  // A sheet from the bottom on a phone, a centred dialog on anything wider.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-3 pb-3 sm:px-5 sm:pb-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog" aria-modal="true"
    >
      <div
        className={`card w-full ${className} !rounded-[2rem] animate-sheet-in sm:animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-ink-900/10 dark:bg-white/15" aria-hidden />
        {title && <h3 className="text-lg font-extrabold tracking-tight mb-3">{title}</h3>}
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Card({ className = '', interactive = false, children, ...rest }) {
  return (
    <div className={`card ${interactive ? 'card-interactive' : ''} ${className}`} {...rest}>
      {children}
    </div>
  )
}

// Visily-style uppercase micro-label placed ABOVE a card group.
export function SectionLabel({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-2.5 mt-1">
      <span className="section-label">{children}</span>
      {action}
    </div>
  )
}

// Dark navy hero card (net worth, streaks) — Visily "institutional" look.
export function HeroCard({ className = '', children, ...rest }) {
  return (
    <div className={`hero-card ${className}`} {...rest}>
      {children}
    </div>
  )
}

// One accent per page and per section — the tile colour is what tells them apart at a
// glance before a single word is read. Keep the set small so each colour keeps a meaning.
export const TONES = {
  brand: { tile: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300', text: 'text-brand-600 dark:text-brand-300' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300', text: 'text-emerald-600 dark:text-emerald-300' },
  violet: { tile: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', text: 'text-violet-600 dark:text-violet-300' },
  amber: { tile: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-300' },
  rose: { tile: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300', text: 'text-rose-600 dark:text-rose-300' },
  ink: { tile: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300', text: 'text-ink-500 dark:text-ink-400' },
}

export function IconTile({ tone = 'brand', size = 'md', className = '', children }) {
  const dim = size === 'lg' ? 'h-12 w-12 rounded-2xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'
  return <div className={`grid place-items-center shrink-0 ${dim} ${TONES[tone].tile} ${className}`}>{children}</div>
}

// Page header with an identity: a toned icon tile, an eyebrow in the same tone, the title,
// and an optional slot under it for a summary strip or filters.
export function PageHero({ tone = 'brand', icon, eyebrow, title, subtitle, children }) {
  return (
    <div className="mb-7 animate-fade-in-up">
      <div className="flex items-start gap-4">
        {icon && <IconTile tone={tone} size="lg" className="!rounded-full shadow-card">{icon}</IconTile>}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${TONES[tone].tile}`}>
              {eyebrow}
            </span>
          )}
          <h2 className="text-[26px] md:text-[32px] leading-[1.05] font-extrabold tracking-[-0.03em] mt-2">{title}</h2>
          {subtitle && <p className="text-[13.5px] text-ink-500 dark:text-ink-400 mt-2 leading-relaxed max-w-[42ch]">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// A card that opens with an icon tile + title row, so a screen of several forms reads as
// several subjects rather than one long sheet.
export function SectionCard({ tone = 'brand', icon, title, hint, action, className = '', children }) {
  return (
    <Card className={className}>
      <div className="flex items-center gap-3 mb-5">
        {icon && <IconTile tone={tone}>{icon}</IconTile>}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold leading-tight">{title}</div>
          {hint && <div className="text-[11px] text-ink-400 font-medium mt-0.5 leading-snug">{hint}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  )
}

export function SectionTitle({ title, subtitle, action }) {
  // Stacks below sm: on a 360px phone — the most common Android width — a single
  // row let the action keep its intrinsic width and crushed the title to ~55px,
  // truncating it to "Mont…" and running the subtitle down a one-word column.
  return (
    <div className="mb-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs text-ink-400 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, sub, trend, accent = 'brand' }) {
  const accents = {
    brand: 'from-brand-500/10 to-brand-500/0 text-brand-600',
    green: 'from-emerald-500/10 to-emerald-500/0 text-emerald-600',
    amber: 'from-amber-500/10 to-amber-500/0 text-amber-600',
    rose: 'from-rose-500/10 to-rose-500/0 text-rose-600',
  }
  return (
    <div className={`card bg-gradient-to-br ${accents[accent]} relative overflow-hidden transition-shadow duration-300 hover:shadow-soft`}>
      <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</div>
      <div className="mt-1.5 text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-ink-900 dark:text-white">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
        {trend != null && (
          <span className={`chip ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            <IconTrend size={13} />
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
        {sub && <span className="text-ink-400 truncate">{sub}</span>}
      </div>
    </div>
  )
}

// Progress ring with the percentage in the middle (savings rate, goal completion).
export function Ring({ pct, color = '#377cc8', size = 66, label }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  const thickness = size >= 60 ? 8 : 6
  const r = (size - thickness) / 2
  const circumference = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness}
          className="stroke-ink-100 dark:stroke-white/[0.12]"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness}
          stroke={color} strokeLinecap="round"
          strokeDasharray={`${((p / 100) * circumference).toFixed(1)} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500 ease-out-expo"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="money font-extrabold" style={{ fontSize: size >= 60 ? 14 : 12 }}>
          {label ?? `${p}%`}
        </span>
      </div>
    </div>
  )
}

export function Pill({ color, children }) {
  return (
    <span className="chip bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {children}
    </span>
  )
}

export function ProgressBar({ value, max, color = '#377cc8' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="h-2 w-full rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
      <div className="h-full rounded-full transition-[width] duration-500 ease-out-expo" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// Loading placeholder — pass a Tailwind height/width via className.
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

// Small inline spinner (respects currentColor).
export function Spinner({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// Friendly empty state for zero-data sections.
export function EmptyState({ icon = '✨', title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 animate-fade-in">
      <div className="grid place-items-center h-14 w-14 rounded-2xl bg-ink-100 dark:bg-ink-800 text-2xl mb-3">{icon}</div>
      <p className="font-semibold text-ink-700 dark:text-ink-200">{title}</p>
      {hint && <p className="text-sm text-ink-400 mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
