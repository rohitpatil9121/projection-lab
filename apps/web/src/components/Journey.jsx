import { Card, SectionTitle } from './ui.jsx'
import { IconCheck } from './Icons.jsx'

// Band → ring colour. Kept calm: indigo for the score, emerald once excellent.
const ringColor = (score) => (score >= 90 ? '#469b88' : '#377cc8')

const DIM_STATUS = {
  good: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', word: 'Strong' },
  ok: { chip: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300', word: 'Good' },
  warn: { chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', word: 'Needs care' },
}

// Reusable fitness ring — used large on the Journey page and small in the Topbar.
export function FitnessRing({ score, size = 160, stroke = 12, showLabel = true }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth={stroke} className="text-ink-100 dark:text-ink-800" stroke="currentColor" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={ringColor(score)} strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center leading-none">
            <div className="font-extrabold tracking-tight" style={{ fontSize: size * 0.26 }}>{score}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// Tiny sparkline of past fitness scores (from snapshots that carry a score).
function Sparkline({ points }) {
  if (points.length < 2) return null
  const w = 300, h = 44
  const xs = points.map((_, i) => (i / (points.length - 1)) * w)
  const min = Math.min(...points), max = Math.max(...points)
  const span = max - min || 1
  const ys = points.map((v) => h - 6 - ((v - min) / span) * (h - 12))
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" className="mt-1">
      <defs><linearGradient id="fitSpark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#377cc8" stopOpacity="0.25" /><stop offset="100%" stopColor="#377cc8" stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#fitSpark)" />
      <path d={d} fill="none" stroke="#377cc8" strokeWidth="2.4" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="4" fill="#377cc8" stroke="currentColor" strokeWidth="2" className="text-white dark:text-ink-900" />
    </svg>
  )
}

export function FitnessCard({ fitness, stage, scoreHistory = [] }) {
  const points = scoreHistory.filter((s) => typeof s.score === 'number').map((s) => s.score)
  const delta = points.length >= 2 ? points[points.length - 1] - points[0] : null

  return (
    <Card>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] items-center">
        <div className="flex flex-col items-center text-center">
          <FitnessRing score={fitness.score} size={168} />
          <div className="mt-2">
            <div className="text-sm font-bold text-brand-600">{fitness.band}{stage ? ` · ${stage.current.label} stage` : ''}</div>
            <div className="text-xs text-ink-400">Financial Fitness</div>
          </div>
          {points.length >= 2 && (
            <div className="w-full mt-3">
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-ink-400 font-medium">Recent trend</span>
                {delta != null && (
                  <span className={`chip ${delta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} pts
                  </span>
                )}
              </div>
              <Sparkline points={points} />
            </div>
          )}
        </div>

        <div>
          <SectionTitle title="The five dimensions" subtitle="What moves your score" />
          <div className="space-y-3.5">
            {fitness.dimensions.map((d) => {
              const st = DIM_STATUS[d.status]
              return (
                <div key={d.key}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold">{d.label}</span>
                    <span className={`chip ml-auto ${st.chip}`}>{st.word} · {d.score}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out-expo" style={{ width: `${d.score}%` }} />
                  </div>
                  {d.hint && <p className="mt-1 text-[11px] text-ink-400">{d.hint}</p>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function StagesStrip({ stages, currentIndex, next, coastAge }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-5">
        <span className="chip bg-brand-50 text-brand-600 dark:bg-brand-500/10 font-bold">
          ◉ You are here — {stages[currentIndex]?.label}
        </span>
        {next && (
          <span className="text-xs font-medium text-ink-400 ml-auto">
            Next: <span className="font-bold text-ink-600 dark:text-ink-300">{next.label}</span>
            {coastAge != null && next.key === 'freedom' ? ` · coast-FI at age ${coastAge}` : ''}
          </span>
        )}
      </div>
      <div className="flex">
        {stages.map((s, i) => (
          <div key={s.key} className="flex-1 relative pt-9 text-center min-w-0">
            {i > 0 && (
              <span className={`absolute top-[15px] right-1/2 w-full h-[3px] ${i <= currentIndex ? 'bg-emerald-500' : 'bg-ink-100 dark:bg-ink-800'}`} />
            )}
            <span className={`absolute top-1.5 left-1/2 -translate-x-1/2 grid place-items-center h-6 w-6 rounded-full border-[3px] z-10
              ${s.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white'
                : s.status === 'here' ? 'bg-brand-600 border-brand-600 ring-4 ring-brand-600/20'
                : 'bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-700'}`}>
              {s.status === 'done' && <IconCheck size={13} />}
            </span>
            <div className={`text-xs font-bold truncate ${s.status === 'upcoming' ? 'text-ink-400' : ''}`}>{s.label}</div>
            <div className="text-[10px] text-ink-400 mt-0.5 truncate">{s.sub}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

const HEAT_COLORS = ['bg-ink-100 dark:bg-ink-800', 'bg-brand-200 dark:bg-brand-900', 'bg-brand-400 dark:bg-brand-700', 'bg-brand-600']

export function ConsistencyCard({ cells, steady }) {
  return (
    <Card>
      <SectionTitle title="Consistency" subtitle="SIP + monthly check-ins" />
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-extrabold tracking-tight">{steady}</span>
        <span className="text-sm text-ink-400 font-medium">month{steady === 1 ? '' : 's'} steady</span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
        {cells.map((c) => (
          <div key={c.ym} className={`aspect-square rounded-[3px] ${HEAT_COLORS[c.level]}`} title={c.ym} />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-ink-400">A calm rhythm, not a streak to shatter — grey months are neutral. Resume anytime.</p>
    </Card>
  )
}

const QUEST_TONE = {
  warn: 'bg-amber-100 dark:bg-amber-500/15',
  brand: 'bg-brand-50 dark:bg-brand-500/10',
}
const QUEST_TAG = {
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
}

export function QuestsCard({ quests }) {
  if (!quests.length) {
    return (
      <Card>
        <SectionTitle title="This month" subtitle="Your next good moves" />
        <div className="flex items-center gap-3 py-4">
          <span className="grid place-items-center h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 text-lg">✓</span>
          <p className="text-sm font-medium text-ink-500">Nothing pressing — your fundamentals are covered. Keep the rhythm going.</p>
        </div>
      </Card>
    )
  }
  return (
    <Card>
      <SectionTitle title="This month" subtitle={`${quests.length} high-leverage move${quests.length === 1 ? '' : 's'}`} />
      <div className="divide-y divide-ink-100 dark:divide-ink-800">
        {quests.map((q) => (
          <div key={q.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className={`grid place-items-center h-9 w-9 rounded-xl text-base shrink-0 ${QUEST_TONE[q.tone]}`}>{q.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{q.title}</div>
              <div className="text-xs text-ink-400 mt-0.5 leading-snug">{q.desc}</div>
            </div>
            <span className={`chip self-start shrink-0 ${QUEST_TAG[q.tone]}`}>{q.tag}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function MomentsCard({ moments }) {
  if (!moments.length) return null
  const [hero, ...rest] = moments
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br from-brand-600 via-brand-500 to-[#469b88] shadow-card">
        <div className="text-[10px] font-extrabold tracking-[0.14em] uppercase opacity-85">{hero.label}</div>
        <div className="text-xl font-extrabold tracking-tight mt-1.5 leading-tight">{hero.title}</div>
        <div className="text-xs opacity-85 mt-2 leading-relaxed">{hero.detail}</div>
      </div>
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl bg-ink-50 dark:bg-ink-800/60 px-3.5 py-2.5">
              <span className="grid place-items-center h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 text-sm">🎉</span>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{m.title}</div>
                <div className="text-[11px] text-ink-400 truncate">{m.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
