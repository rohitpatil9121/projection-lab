import { useStore } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionTitle } from '../components/ui.jsx'
import { IconCheck } from '../components/Icons.jsx'

// Resolve current value + projected achievement age for each milestone.
function evaluate(m, accounts, projection) {
  let current = 0
  if (m.accountId) {
    current = accounts.find((a) => a.id === m.accountId)?.balance ?? 0
  } else if (m.metric === 'netWorth') {
    current = projection[0].netWorth
  } else if (m.metric === 'investable') {
    current = projection[0].investable
  }

  // Liability milestone (pay off): target is 0, invert progress.
  const isPayoff = m.accountId && accounts.find((a) => a.id === m.accountId)?.kind === 'liability'

  let achievedYear = null
  for (const row of projection) {
    const val = m.metric === 'netWorth' ? row.netWorth : m.metric === 'investable' ? row.investable : (row[m.accountId] ?? 0)
    if (isPayoff ? val <= (m.target || 0) : val >= m.target) { achievedYear = row.year; break }
  }

  const progress = isPayoff
    ? Math.min(100, Math.round((1 - current / (accounts.find((a) => a.id === m.accountId)?.balance || 1)) * 100))
    : Math.min(100, Math.round((current / m.target) * 100))

  return { current, progress: m.achieved ? 100 : progress, achievedYear, isPayoff }
}

export default function Milestones() {
  const milestones = useStore((s) => s.milestones)
  const accounts = useStore((s) => s.accounts)
  const { projection } = useProjection()

  const rows = milestones.map((m) => ({ m, ...evaluate(m, accounts, projection) }))
  const done = rows.filter((r) => r.m.achieved || r.progress >= 100).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0">
          <div className="text-sm font-semibold text-brand-100">Goals achieved</div>
          <div className="text-4xl font-extrabold mt-1">{done}<span className="text-brand-200 text-2xl">/{milestones.length}</span></div>
          <div className="text-xs text-brand-100 mt-1">Keep going — you're building momentum.</div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-ink-400">Next milestone</div>
          <div className="text-lg font-extrabold mt-1">
            {rows.find((r) => r.progress < 100)?.m.name || 'All done! 🎉'}
          </div>
          <div className="text-xs text-ink-400 mt-1">
            {rows.find((r) => r.progress < 100)?.achievedYear ? `Projected ${rows.find((r) => r.progress < 100)?.achievedYear}` : 'Adjust your plan to reach it'}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-ink-400">Financial Independence</div>
          <div className="text-lg font-extrabold mt-1">
            {rows.find((r) => r.m.id === 'm4')?.achievedYear || '—'}
          </div>
          <div className="text-xs text-ink-400 mt-1">Projected year you hit FI</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map(({ m, current, progress, achievedYear }) => {
          const complete = progress >= 100
          return (
            <Card key={m.id} className="flex items-center gap-4">
              <div className={`grid place-items-center h-14 w-14 shrink-0 rounded-2xl text-2xl ${complete ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-ink-100 dark:bg-ink-800'}`}>
                {complete ? <IconCheck size={26} /> : m.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold truncate">{m.name}</span>
                  <span className={`chip ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'}`}>
                    {complete ? 'Achieved' : `${progress}%`}
                  </span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-ink-400">
                  <span>{m.target > 0 ? `Target ${fmtMoney(m.target, { compact: true })}` : 'Pay off in full'}</span>
                  <span>{complete && achievedYear ? `by ${achievedYear}` : `now ${fmtMoney(current, { compact: true })}`}</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
