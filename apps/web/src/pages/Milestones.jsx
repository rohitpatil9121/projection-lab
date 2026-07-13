import { useState } from 'react'
import { useStore } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney, evaluateGoal, CURRENT_YEAR } from '@projectlab/engine'
import { Card, SectionTitle } from '../components/ui.jsx'
import { IconCheck, IconPlus, IconTrash } from '../components/Icons.jsx'

const TRACK_STYLE = {
  ahead: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'on-track': 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  behind: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
}

const TRACK_LABEL = {
  ahead: 'Ahead of plan',
  'on-track': 'On track',
  behind: 'Behind plan',
}

export default function Milestones() {
  const milestones = useStore((s) => s.milestones)
  const accounts = useStore((s) => s.accounts)
  const profile = useStore((s) => s.profile)
  const contributions = useStore((s) => s.contributions)
  const addItem = useStore((s) => s.addItem)
  const updateItem = useStore((s) => s.updateItem)
  const removeItem = useStore((s) => s.removeItem)
  const moveMilestone = useStore((s) => s.moveMilestone)
  const { projection } = useProjection()

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', target: '', targetAge: '', icon: '🎯', metric: 'netWorth' })

  const ctx = { accounts, projection, profile, contributions, currentYear: CURRENT_YEAR }
  const rows = [...milestones]
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .map((m) => ({ m, ...evaluateGoal(m, ctx) }))

  const done = rows.filter((r) => r.m.achieved || r.progress >= 100).length
  const behind = rows.filter((r) => r.track === 'behind' && r.progress < 100).length

  const save = () => {
    if (!draft.name.trim() || !(Number(draft.target) > 0)) return
    addItem('milestones', {
      name: draft.name.trim(),
      target: Number(draft.target),
      metric: draft.metric,
      icon: draft.icon || '🎯',
      achieved: false,
      targetAge: Number(draft.targetAge) > profile.currentAge ? Number(draft.targetAge) : undefined,
    })
    setDraft({ name: '', target: '', targetAge: '', icon: '🎯', metric: 'netWorth' })
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
          <div className="text-sm font-semibold text-ink-400">Behind schedule</div>
          <div className="text-4xl font-extrabold mt-1 text-amber-600">{behind}</div>
          <div className="text-xs text-ink-400 mt-1">Goals where funding lags the timeline</div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-ink-400">Financial Independence</div>
          <div className="text-lg font-extrabold mt-1">
            {rows.find((r) => r.m.metric === 'netWorth' && r.m.target >= 30000000)?.achievedYear || '—'}
          </div>
          <div className="text-xs text-ink-400 mt-1">Projected year you hit FI</div>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Your Goals" subtitle="Ranked by funding priority — fund #1 before lower goals"
          action={<button onClick={() => setAdding(!adding)} className="btn-primary !py-1.5"><IconPlus size={16} /> Add goal</button>} />
        {adding && (
          <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 dark:bg-brand-500/5 p-3 space-y-2">
            <div className="flex gap-2">
              <input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} className="input !py-1.5 text-sm w-14 text-center" maxLength={2} />
              <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Goal name (e.g. Dream home)" className="input !py-1.5 text-sm flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">Target amount</span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm font-semibold">₹</span>
                  <input type="number" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} placeholder="10000000" className="input pl-7 text-sm" />
                </div>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">Target by age</span>
                <input type="number" value={draft.targetAge} onChange={(e) => setDraft({ ...draft, targetAge: e.target.value })} placeholder={`e.g. ${profile.currentAge + 10}`} className="input text-sm mt-1" />
              </label>
            </div>
            <label className="block">
              <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">Measure progress against</span>
              <select value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value })} className="input text-sm mt-1">
                <option value="netWorth">Net Worth</option>
                <option value="investable">Investments</option>
              </select>
            </label>
            <div className="flex gap-2 pt-1">
              <button onClick={save} className="btn-primary flex-1 text-sm">Save goal</button>
              <button onClick={() => setAdding(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map(({ m, current, progress, achievedYear, isPayoff, targetAge, nominalTarget, inflationAdjusted, requiredSip, actualSip, sipGap, expectedProgress, track, priority }, idx) => {
          const complete = progress >= 100
          return (
            <Card key={m.id} className="group">
              <div className="flex items-start gap-3">
                <div className={`grid place-items-center h-14 w-14 shrink-0 rounded-2xl text-2xl ${complete ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-ink-100 dark:bg-ink-800'}`}>
                  {complete ? <IconCheck size={26} /> : m.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <input value={m.name} onChange={(e) => updateItem('milestones', m.id, { name: e.target.value })}
                      className="font-bold bg-transparent outline-none min-w-0 flex-1 focus:text-brand-600" />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300 tabular-nums">#{priority}</span>
                      <button type="button" disabled={idx === 0} onClick={() => moveMilestone(m.id, 'up')}
                        className="h-6 w-6 rounded text-xs text-ink-400 hover:text-brand-600 disabled:opacity-30" title="Raise priority">↑</button>
                      <button type="button" disabled={idx === rows.length - 1} onClick={() => moveMilestone(m.id, 'down')}
                        className="h-6 w-6 rounded text-xs text-ink-400 hover:text-brand-600 disabled:opacity-30" title="Lower priority">↓</button>
                      <button onClick={() => removeItem('milestones', m.id)} className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-rose-500 transition">
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={`chip ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'}`}>
                      {complete ? 'Achieved' : `${progress}% funded`}
                    </span>
                    {!complete && track && (
                      <span className={`chip ${TRACK_STYLE[track]}`}>{TRACK_LABEL[track]}</span>
                    )}
                    {!complete && !track && targetAge == null && (
                      <span className="chip bg-ink-100 text-ink-500">Set target age</span>
                    )}
                  </div>

                  <div className="mt-2 h-2.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden relative">
                    <div className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${progress}%` }} />
                    {expectedProgress != null && !complete && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-ink-400/70" style={{ left: `${expectedProgress}%` }} title={`Expected ${expectedProgress}% by now`} />
                    )}
                  </div>
                  {expectedProgress != null && !complete && (
                    <div className="mt-0.5 text-[10px] text-ink-400">Timeline marker at {expectedProgress}% expected today</div>
                  )}

                  <div className="mt-2 space-y-1 text-xs text-ink-500">
                    <div className="flex flex-wrap items-center justify-between gap-x-2">
                      <span>
                        {isPayoff ? 'Pay off in full' : (
                          <>Target ₹<input type="number" value={m.target} onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => updateItem('milestones', m.id, { target: Number(e.target.value) })}
                            className="w-20 bg-transparent outline-none tabular-nums focus:text-brand-600 [appearance:textfield]" /> today</>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        by age
                        <input type="number" value={m.targetAge ?? ''} placeholder="—"
                          onChange={(e) => updateItem('milestones', m.id, { targetAge: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-10 bg-transparent outline-none tabular-nums text-center focus:text-brand-600 [appearance:textfield]" />
                      </span>
                    </div>

                    {!isPayoff && inflationAdjusted && m.target > 0 && (
                      <div className="text-ink-400">
                        Inflation-adjusted: {fmtMoney(m.target, { compact: true })} today →{' '}
                        <span className="font-semibold text-ink-600 dark:text-ink-300">{fmtMoney(nominalTarget, { compact: true })}</span>
                        {targetAge != null && ` at age ${targetAge}`}
                      </div>
                    )}

                    {!complete && !isPayoff && requiredSip > 0 && (
                      <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 px-2 py-1.5 space-y-0.5">
                        <div>
                          Required SIP: <span className="font-bold text-ink-700 dark:text-ink-200">{fmtMoney(requiredSip)}/mo</span>
                          {actualSip > 0 && (
                            <> · You invest: <span className="font-semibold">{fmtMoney(actualSip)}/mo</span></>
                          )}
                        </div>
                        {sipGap > 0 && (
                          <div className="text-amber-700 dark:text-amber-400 font-medium">Shortfall: {fmtMoney(sipGap)}/mo to stay on plan</div>
                        )}
                        {sipGap === 0 && actualSip >= requiredSip && (
                          <div className="text-emerald-700 dark:text-emerald-400 font-medium">SIP allocation meets this goal</div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between text-ink-400 pt-0.5">
                      <span>Now: {fmtMoney(current, { compact: true })}</span>
                      <span>{achievedYear ? `Projected ${achievedYear}` : complete ? 'Done' : 'Extend plan horizon'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
