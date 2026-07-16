import { useState } from 'react'
import { useStore } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import {
  fmtMoney, evaluateGoal, CURRENT_YEAR,
  computeMoments, consistencyCells,
} from '@projectlab/engine'
import { Card, SectionLabel } from '../components/ui.jsx'
import { IconCheck, IconPlus, IconTrash, IconTarget, IconTrend } from '../components/Icons.jsx'
import { ConsistencyCard } from '../components/Journey.jsx'
import GoalGraphic, { MOMENT_KIND } from '../components/GoalGraphic.jsx'
import { goalStatus, goalColor } from '../utils/goalStatus.js'

// ---- Category inference (honest: name hints, then linked account, then metric)
function goalCategory(m, accounts) {
  const n = m.name || ''
  if (/home|house|flat|apartment|property|estate/i.test(n)) return 'REAL ESTATE'
  if (/educat|college|school|study|degree|ivy/i.test(n)) return 'EDUCATION'
  if (/retire|freedom|independence|\bfire?\b/i.test(n)) return 'FINANCIAL FREEDOM'
  if (/car|vehicle|bike/i.test(n)) return 'VEHICLE'
  if (/wedding|marriage|travel|trip/i.test(n)) return 'LIFE EVENT'
  if (m.accountId) {
    const a = accounts.find((x) => x.id === m.accountId)
    if (a?.kind === 'liability') return 'DEBT PAYOFF'
    if (a?.type === 'retirement') return 'RETIREMENT'
    if (a?.type === 'real-estate') return 'REAL ESTATE'
    if (a?.type === 'cash') return 'SAVINGS'
    return 'INVESTMENT'
  }
  return m.metric === 'investable' ? 'INVESTMENT' : 'NET WORTH'
}

const CATEGORY_STYLE = {
  'REAL ESTATE': { band: 'from-[#e0533d] via-[#e78c9d] to-[#eed868]', pill: 'text-[#e0533d]' },
  EDUCATION: { band: 'from-[#469b88] via-[#469b88] to-[#9da7d0]', pill: 'text-[#469b88]' },
  'FINANCIAL FREEDOM': { band: 'from-[#377cc8] via-[#9da7d0] to-[#e78c9d]', pill: 'text-[#377cc8]' },
  RETIREMENT: { band: 'from-[#377cc8] via-[#9da7d0] to-[#469b88]', pill: 'text-[#377cc8]' },
  'DEBT PAYOFF': { band: 'from-[#eed868] via-[#eed868] to-[#e78c9d]', pill: 'text-[#b8860b]' },
  SAVINGS: { band: 'from-[#377cc8] via-[#9da7d0] to-[#eed868]', pill: 'text-[#377cc8]' },
  INVESTMENT: { band: 'from-[#377cc8] via-[#469b88] to-[#9da7d0]', pill: 'text-[#377cc8]' },
  VEHICLE: { band: 'from-[#9da7d0] via-[#9da7d0] to-[#377cc8]', pill: 'text-[#377cc8]' },
  'LIFE EVENT': { band: 'from-[#e78c9d] via-[#e78c9d] to-[#eed868]', pill: 'text-[#e0533d]' },
  'NET WORTH': { band: 'from-[#377cc8] via-[#469b88] to-[#eed868]', pill: 'text-brand-600' },
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
  const snapshots = useStore((s) => s.snapshots)
  const { projection, state } = useProjection()

  // ---- Input-derived milestones + check-in consistency ----
  const moments = computeMoments(state, snapshots, projection)
  const consistency = consistencyCells(snapshots)

  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [draft, setDraft] = useState({ name: '', target: '', targetAge: '', icon: '🎯', metric: 'netWorth' })

  const ctx = { accounts, projection, profile, contributions, currentYear: CURRENT_YEAR }
  const rows = [...milestones]
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .map((m) => ({ m, ...evaluateGoal(m, ctx) }))

  const done = rows.filter((r) => r.m.achieved || r.progress >= 100).length
  const overallPct = rows.length ? Math.round(rows.reduce((s, r) => s + r.progress, 0) / rows.length) : 0

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
      {/* ---- Header ---- */}
      <div className="flex items-center gap-3">
        <span className="grid place-items-center h-11 w-11 rounded-[13px] bg-brand-50 text-brand-600 dark:bg-brand-500/15">
          <IconTarget size={22} />
        </span>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Life Goals</h1>
          <p className="text-[13px] text-ink-500 mt-0.5">mapping your financial future</p>
        </div>
      </div>

      {/* ---- Overall progress hero ---- */}
      <div className="rounded-[22px] bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white shadow-[0_18px_40px_-20px_rgba(55,124,200,.6)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-100">🔥 Overall goal progress</div>
        <div className="mt-1.5 flex items-end gap-2">
          <div className="money text-[40px] font-extrabold leading-none">{overallPct}%</div>
          <div className="pb-1.5 text-[13px] text-brand-100">{done} of {milestones.length} goals complete</div>
        </div>
        <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white transition-[width] duration-500 ease-out-expo" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* ---- Recent milestones rail (never empty: moments → achieved goals → next targets) ---- */}
      <div>
        <SectionLabel>Recent Milestones</SectionLabel>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {moments.map((mo) => (
            <Card key={mo.id} className="!p-3 flex items-center gap-3 min-w-[250px] shrink-0 snap-start">
              <span className="grid place-items-center h-12 w-12 rounded-xl bg-brand-50 dark:bg-brand-500/15 shrink-0">
                <GoalGraphic kind={MOMENT_KIND[mo.id] || 'TROPHY'} size={34} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{mo.title}</div>
                <div className="text-[11px] text-ink-400 truncate">{mo.detail}</div>
              </div>
            </Card>
          ))}
          {rows.filter((r) => r.m.achieved || r.progress >= 100).map((r) => (
            <Card key={`done-${r.m.id}`} className="!p-3 flex items-center gap-3 min-w-[250px] shrink-0 snap-start">
              <span className="grid place-items-center h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 shrink-0">
                <GoalGraphic kind="FLAG" size={34} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{r.m.name} — done</div>
                <div className="text-[11px] text-ink-400 truncate">Target {fmtMoney(r.m.target, { compact: true })} reached</div>
              </div>
            </Card>
          ))}
          {rows.filter((r) => !r.m.achieved && r.progress < 100).slice(0, 2).map((r) => (
            <Card key={`next-${r.m.id}`} className="!p-3 flex items-center gap-3 min-w-[250px] shrink-0 snap-start border-dashed">
              <span className="grid place-items-center h-12 w-12 rounded-xl bg-ink-100 dark:bg-ink-800 shrink-0">
                <GoalGraphic kind={goalCategory(r.m, accounts)} size={34} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">Next up: {r.m.name}</div>
                <div className="text-[11px] text-ink-400 truncate">{Math.round(r.progress)}% there — keep going</div>
              </div>
            </Card>
          ))}
          {moments.length === 0 && rows.length === 0 && (
            <Card className="!p-3 text-sm text-ink-400 min-w-[250px]">Add your first goal to start collecting milestones.</Card>
          )}
        </div>
      </div>

      {/* ---- Active goals ---- */}
      <div id="active-goals">
        <SectionLabel action={
          <button onClick={() => setAdding(!adding)}
            className="inline-flex items-center gap-1 rounded-full border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-700 dark:text-ink-200 shadow-sm hover:border-brand-400 hover:text-brand-600 transition">
            <IconPlus size={13} /> New Goal
          </button>
        }>Your Active Goals</SectionLabel>

        {adding && (
          <Card className="mb-4">
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
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((row, idx) => {
            const { m, current, progress, achievedYear, isPayoff, targetAge, nominalTarget, inflationAdjusted,
              requiredSip, actualSip, sipGap, expectedProgress, priority } = row
            const complete = progress >= 100
            const category = goalCategory(m, accounts)
            const style = CATEGORY_STYLE[category] || CATEGORY_STYLE['NET WORTH']
            const status = goalStatus(row)
            const barColor = goalColor(row)
            const targetYear = targetAge != null
              ? CURRENT_YEAR + (targetAge - profile.currentAge)
              : achievedYear
            const open = openId === m.id
            return (
              <Card key={m.id} className="!p-0 overflow-hidden group">
                {/* Gradient header band with a frosted icon tile */}
                <div className={`relative h-[104px] grid place-items-center bg-gradient-to-br ${style.band}`}>
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl border border-white/45 bg-white/25 backdrop-blur-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,.4)] drop-shadow-[0_4px_8px_rgba(0,0,0,.16)]"
                    aria-hidden="true"
                  >
                    <GoalGraphic kind={complete ? 'FLAG' : category} size={32} />
                  </span>
                  <span className={`absolute left-3.5 bottom-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${style.pill}`}>
                    {category}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <input value={m.name} onChange={(e) => updateItem('milestones', m.id, { name: e.target.value })}
                      className="text-lg font-extrabold tracking-tight bg-transparent outline-none min-w-0 flex-1 focus:text-brand-600" />
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-wide text-ink-400">Reached</div>
                      <div className={`text-xl font-extrabold money ${complete ? 'text-emerald-600' : 'text-brand-600'}`}>{progress}%</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wide text-ink-400">Current Savings</div>
                      <div className="text-base font-extrabold money mt-0.5">{fmtMoney(current, { compact: true })}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-extrabold uppercase tracking-wide text-ink-400">Target Amount</div>
                      <div className="text-base font-bold money text-ink-500 dark:text-ink-300 mt-0.5">
                        {isPayoff ? 'Pay off' : fmtMoney(m.target, { compact: true })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden relative">
                    <div className="h-full rounded-full transition-[width] duration-500 ease-out-expo"
                      style={{ width: `${progress}%`, background: barColor }} />
                    {expectedProgress != null && !complete && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-ink-400/70" style={{ left: `${expectedProgress}%` }} title={`Expected ${expectedProgress}% by now`} />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-[7px] font-bold">
                      {complete
                        ? <IconCheck size={13} className="text-emerald-600" />
                        : <span className="h-[9px] w-[9px] rounded-full" style={{ background: status.color }} />}
                      {status.label}
                    </span>
                    <span className="flex items-center gap-1.5 font-bold text-ink-500 dark:text-ink-300">
                      <IconTrend size={14} /> <span className="money">{targetYear ?? '—'}</span>
                    </span>
                  </div>

                  {/* Expandable details: edit target/age, priority, SIP maths, delete */}
                  <button onClick={() => setOpenId(open ? null : m.id)}
                    className="mt-3 w-full text-left text-[11px] font-bold uppercase tracking-wide text-brand-600 hover:text-brand-700">
                    {open ? 'Hide details ▴' : 'Adjust goal ▾'}
                  </button>
                  {open && (
                    <div className="mt-2 space-y-2 text-xs text-ink-500 border-t border-ink-100 dark:border-ink-800 pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-x-2">
                        <span>
                          {isPayoff ? 'Pay off in full' : (
                            <>Target ₹<input type="number" value={m.target} onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => updateItem('milestones', m.id, { target: Number(e.target.value) })}
                              className="w-24 bg-transparent outline-none money focus:text-brand-600 [appearance:textfield]" /> today</>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          by age
                          <input type="number" value={m.targetAge ?? ''} placeholder="—"
                            onChange={(e) => updateItem('milestones', m.id, { targetAge: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-10 bg-transparent outline-none money text-center focus:text-brand-600 [appearance:textfield]" />
                        </span>
                      </div>

                      {!isPayoff && inflationAdjusted && m.target > 0 && (
                        <div className="text-ink-400">
                          Inflation-adjusted: {fmtMoney(m.target, { compact: true })} today →{' '}
                          <span className="font-semibold text-ink-600 dark:text-ink-300 money">{fmtMoney(nominalTarget, { compact: true })}</span>
                          {targetAge != null && ` at age ${targetAge}`}
                        </div>
                      )}

                      {!complete && !isPayoff && requiredSip > 0 && (
                        <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 px-2 py-1.5 space-y-0.5">
                          <div>
                            Required SIP: <span className="font-bold text-ink-700 dark:text-ink-200 money">{fmtMoney(requiredSip)}/mo</span>
                            {actualSip > 0 && (
                              <> · You invest: <span className="font-semibold money">{fmtMoney(actualSip)}/mo</span></>
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

                      <div className="flex items-center justify-between pt-1">
                        <span className="flex items-center gap-1">
                          <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300 money">Priority #{priority}</span>
                          <button type="button" disabled={idx === 0} onClick={() => moveMilestone(m.id, 'up')}
                            className="h-6 w-6 rounded text-xs text-ink-400 hover:text-brand-600 disabled:opacity-30" title="Raise priority">↑</button>
                          <button type="button" disabled={idx === rows.length - 1} onClick={() => moveMilestone(m.id, 'down')}
                            className="h-6 w-6 rounded text-xs text-ink-400 hover:text-brand-600 disabled:opacity-30" title="Lower priority">↓</button>
                        </span>
                        <span className="flex items-center gap-2 text-ink-400">
                          {achievedYear ? `Projected ${achievedYear}` : complete ? 'Done' : 'Extend plan horizon'}
                          <button onClick={() => removeItem('milestones', m.id)} className="text-ink-400 hover:text-rose-500 transition" title="Delete goal">
                            <IconTrash size={14} />
                          </button>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ---- Check-in consistency (from your recorded snapshots) ---- */}
      <div>
        <SectionLabel>Check-in Consistency</SectionLabel>
        <ConsistencyCard cells={consistency.cells} steady={consistency.steady} />
      </div>
    </div>
  )
}
