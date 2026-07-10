import { IconTrend } from './Icons.jsx'

export function Card({ className = '', children, ...rest }) {
  return <div className={`card ${className}`} {...rest}>{children}</div>
}

export function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
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
    <div className={`card bg-gradient-to-br ${accents[accent]} relative overflow-hidden`}>
      <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</div>
      <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
        {trend != null && (
          <span className={`chip ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            <IconTrend size={13} />
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
        {sub && <span className="text-ink-400">{sub}</span>}
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
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}
