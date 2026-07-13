import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconTrend } from './Icons.jsx'

// Centered modal dialog with backdrop. Portals to body so sticky/filter ancestors don't offset it.
export function Modal({ open, onClose, title, children }) {
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

  if (!open) return null
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-5 bg-ink-950/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog" aria-modal="true"
    >
      <div
        className="card w-full max-w-sm shadow-lift animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 className="text-base font-bold tracking-tight mb-3">{title}</h3>}
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

export function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs text-ink-400 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {action}
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

export function Pill({ color, children }) {
  return (
    <span className="chip bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {children}
    </span>
  )
}

export function ProgressBar({ value, max, color = '#6366f1' }) {
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
