import { useState } from 'react'
import { useStore } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import {
  fmtMoney, evaluateGoal, CURRENT_YEAR,
  computeFitness, computeStages, computeQuests, computeMoments, consistencyCells,
} from '@projectlab/engine'
import { Card, SectionLabel } from '../components/ui.jsx'
import { IconCheck, IconPlus, IconTrash, IconTarget, IconTrend } from '../components/Icons.jsx'
import { FitnessCard, StagesStrip, QuestsCard, ConsistencyCard } from '../components/Journey.jsx'
import GoalGraphic, { MOMENT_KIND, kindFromText } from '../components/GoalGraphic.jsx'

// ---- Goal status (from evaluateGoal track) ---------------------------------
const STATUS = {
  ahead: { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', label: 'Ahead of Schedule' },
  'on-track': { dot: 'bg-brand-500', text: 'text-brand-700 dark:text-brand-400', label: 'On Track' },
  behind: { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', label: 'Needs Correction' },
}

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
  'REAL ESTATE': { band: 'from-rose-300 via-orange-300 to-amber-200', pill: 'text-rose-600' },
  EDUCATION: { band: 'from-teal-500 via-emerald-400 to-cyan-300', pill: 'text-teal-700' },
  'FINANCIAL FREEDOM': { band: 'from-violet-400 via-purple-400 to-indigo-300', pill: 'text-violet-600' },
  RETIREMENT: { band: 'from-violet-400 via-purple-400 to-indigo-300', pill: 'text-violet-600' },
  'DEBT PAYOFF': { band: 'from-amber-300 via-orange-300 to-yellow-200', pill: 'text-amber-700' },
  SAVINGS: { band: 'from-sky-400 via-cyan-300 to-blue-200', pill: 'text-sky-700' },
  INVESTMENT: { band: 'from-indigo-400 via-blue-400 to-sky-300', pill: 'text-indigo-600' },
  VEHICLE: { band: 'from-slate-400 via-zinc-300 to-gray-200', pill: 'text-slate-600' },
  'LIFE EVENT': { band: 'from-fuchsia-400 via-pink-300 to-rose-200', pill: 'text-fuchsia-600' },
  'NET WORTH': { band: 'from-brand-500 via-indigo-400 to-violet-300', pill: 'text-brand-600' },
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
  const { projection, readiness, state } = useProjection()

  // ---- Journey layer: fitness, stages, quests, moments, consistency ----
  const fitness = computeFitness(state, projection, readiness)
  const stages = computeStages(state, projection, readiness)
  const quests = computeQuests(state, fitness)
  const moments = computeMoments(state, snapshots, projection)
  const consistency = consistencyCells(snapshots)

  // ---- Streak hero figures (all real data) ----
  const yearlyContrib = contributions.reduce((s, c) => s + c.amount, 0)
  const monthlyAlloc = yearlyContrib / 12
  const now = new Date()
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const checkedIn = snapshots.some((s) => s.ym === currentYm)
  const nextReview = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState(null)
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
      {/* ---- Header ---- */}
      <div className="flex items-center gap-3">
        <span className="grid place-items-center h-11 w-11 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15">
          <IconTarget size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Life Goals</h1>
          <p className="text-xs text-ink-400 font-medium">mapping your financial future</p>
        </div>
      </div>

      {/* ---- Streak hero (brand-indigo gradient) ---- */}
      <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-600 shadow-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="absolute -right-4 -top-4 h-36 w-36 text-white/10" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
          <circle cx="14.5" cy="15" r="3.5" /><path d="M14.5 13.5V15l1.2 1.2" />
        </svg>
        <div className="relative">
          <div className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-brand-100">
            🔥 {consistency.steady > 0 ? `${consistency.steady}-month check-in streak` : 'Start your check-in streak'}
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mt-2">
            {checkedIn ? 'Monthly Check-in Complete' : 'Monthly Check-in Due'}
          </h2>
          <p className="text-sm text-brand-100/90 mt-2 leading-relaxed max-w-md">
            {monthlyAlloc > 0 ? (
              <>You're allocating <span className="money font-bold text-white">{fmtMoney(monthlyAlloc, { compact: true })}</span> a
                month towards your goals. Keep the momentum going to stay on track for your targets.</>
            ) : (
              <>Set up a monthly SIP in Accounts to start funding your goals automatically.</>
            )}
          </p>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-brand-200">Next review</div>
              <div className="text-lg font-extrabold money mt-0.5">{nextReview}</div>
            </div>
            <button
              onClick={() => document.getElementById('active-goals')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-xl bg-white text-brand-700 px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-brand-50 transition">
              View Goals
            </button>
          </div>
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
          {rows.map(({ m, current, progress, achievedYear, isPayoff, targetAge, nominalTarget, inflationAdjusted, requiredSip, actualSip, sipGap, expectedProgress, track, priority }, idx) => {
            const complete = progress >= 100
            const category = goalCategory(m, accounts)
            const style = CATEGORY_STYLE[category] || CATEGORY_STYLE['NET WORTH']
            const status = complete ? null : (track ? STATUS[track] : null)
            const targetYear = targetAge != null
              ? CURRENT_YEAR + (targetAge - profile.currentAge)
              : achievedYear
            const open = openId === m.id
            return (
              <Card key={m.id} className="!p-0 overflow-hidden group">
                {/* Gradient header band */}
                <div className={`relative h-28 bg-gradient-to-br ${style.band}`}>
                  <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
                    <GoalGraphic kind={complete ? 'FLAG' : category} size={72} />
                  </div>
                  <span className={`absolute left-4 bottom-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${style.pill}`}>
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

                  <div className="mt-3 h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden relative">
                    <div className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${progress}%` }} />
                    {expectedProgress != null && !complete && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-ink-400/70" style={{ left: `${expectedProgress}%` }} title={`Expected ${expectedProgress}% by now`} />
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    {complete ? (
                      <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                        <IconCheck size={13} /> Achieved
                      </span>
                    ) : status ? (
                      <span className={`flex items-center gap-1.5 font-bold ${status.text}`}>
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} /> {status.label}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-bold text-ink-400">
                        <span className="h-2 w-2 rounded-full bg-ink-300" /> Set target age
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-bold text-ink-500 dark:text-ink-300 money">
                      <IconTrend size={13} /> {targetYear ?? '—'}
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

      {/* ---- Goal stats (kept from previous layout) ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0">
          <div className="text-sm font-semibold text-brand-100">Goals achieved</div>
          <div className="text-4xl font-extrabold mt-1 money">{done}<span className="text-brand-200 text-2xl">/{milestones.length}</span></div>
          <div className="text-xs text-brand-100 mt-1">Keep going — you're building momentum.</div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-ink-400">Needs correction</div>
          <div className="text-4xl font-extrabold mt-1 text-amber-600 money">{behind}</div>
          <div className="text-xs text-ink-400 mt-1">Goals where funding lags the timeline</div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-ink-400">Financial Independence</div>
          <div className="text-lg font-extrabold mt-1 money">
            {rows.find((r) => r.m.metric === 'netWorth' && r.m.target >= 30000000)?.achievedYear || '—'}
          </div>
          <div className="text-xs text-ink-400 mt-1">Projected year you hit FI</div>
        </Card>
      </div>

      {/* ---- Financial fitness (kept below the mock layout) ---- */}
      <div>
        <SectionLabel>Financial Fitness</SectionLabel>
        <div className="space-y-6">
          <FitnessCard fitness={fitness} stage={stages} scoreHistory={snapshots} />
          <StagesStrip stages={stages.stages} currentIndex={stages.currentIndex} next={stages.next} coastAge={stages.coastAge} />
          <div className="grid gap-6 lg:grid-cols-2">
            <QuestsCard quests={quests} />
            <ConsistencyCard cells={consistency.cells} steady={consistency.steady} />
          </div>
        </div>
      </div>
    </div>
  )
}
