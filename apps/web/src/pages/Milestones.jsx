import { useState } from 'react'
import { useStore } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionTitle } from '../components/ui.jsx'
import { IconCheck, IconPlus, IconTrash } from '../components/Icons.jsx'

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
  const addItem = useStore((s) => s.addItem)
  const updateItem = useStore((s) => s.updateItem)
  const removeItem = useStore((s) => s.removeItem)
  const { projection } = useProjection()

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', target: '', icon: '🎯', metric: 'netWorth' })

  const rows = milestones.map((m) => ({ m, ...evaluate(m, accounts, projection) }))
  const done = rows.filter((r) => r.m.achieved || r.progress >= 100).length

  const save = () => {
    if (!draft.name.trim() || !(Number(draft.target) > 0)) return
    addItem('milestones', {
      name: draft.name.trim(),
      target: Number(draft.target),
      metric: draft.metric,
      icon: draft.icon || '🎯',
      achieved: false,
    })
    setDraft({ name: '', target: '', icon: '🎯', metric: 'netWorth' })
    setAdding(false)
  }

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
            {rows.find((r) => r.m.metric === 'netWorth' && r.m.target >= 30000000)?.achievedYear || '—'}
          </div>
          <div className="text-xs text-ink-400 mt-1">Projected year you hit FI</div>
        </Card>
      </div>

      {/* Add goal */}
      <Card>
        <SectionTitle title="Your Goals" subtitle={`${milestones.length} milestones`}
          action={<button onClick={() => setAdding(!adding)} className="btn-primary !py-1.5"><IconPlus size={16} /> Add goal</button>} />
        {adding && (
          <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 dark:bg-brand-500/5 p-3 space-y-2">
            <div className="flex gap-2">
              <input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} className="input !py-1.5 text-sm w-14 text-center" maxLength={2} />
              <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Goal name (e.g. Dream home)" className="input !py-1.5 text-sm flex-1" />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">₹</span>
                <input type="number" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} placeholder="Target amount" className="input !py-1.5 pl-7 text-sm" />
              </div>
              <select value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value })} className="input !py-1.5 text-sm">
                <option value="netWorth">Net Worth</option>
                <option value="investable">Investments</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="btn-primary flex-1 !py-1.5 text-sm">Save goal</button>
              <button onClick={() => setAdding(false)} className="btn-ghost !py-1.5 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map(({ m, current, progress, achievedYear }) => {
          const complete = progress >= 100
          return (
            <Card key={m.id} className="flex items-center gap-4 group">
              <div className={`grid place-items-center h-14 w-14 shrink-0 rounded-2xl text-2xl ${complete ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-ink-100 dark:bg-ink-800'}`}>
                {complete ? <IconCheck size={26} /> : m.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <input value={m.name} onChange={(e) => updateItem('milestones', m.id, { name: e.target.value })}
                    className="font-bold bg-transparent outline-none min-w-0 flex-1 focus:text-brand-600" />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`chip ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'}`}>
                      {complete ? 'Achieved' : `${progress}%`}
                    </span>
                    <button onClick={() => removeItem('milestones', m.id)} className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-rose-500 transition">
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-ink-400">
                  <span className="flex items-center gap-1">
                    {m.target > 0 ? (
                      <>Target ₹<input type="number" value={m.target} onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) => updateItem('milestones', m.id, { target: Number(e.target.value) })}
                        className="w-20 bg-transparent outline-none tabular-nums focus:text-brand-600 [appearance:textfield]" /></>
                    ) : 'Pay off in full'}
                  </span>
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
