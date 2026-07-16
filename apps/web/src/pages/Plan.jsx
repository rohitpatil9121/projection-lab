import { useMemo, useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore, computeProjection, computeReadiness } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney, CURRENT_YEAR, accountRoles, corpusLastsToAge } from '@projectlab/engine'
import { Card, SectionLabel, HeroCard, Modal } from '../components/ui.jsx'
import { IconPlus, IconTrash } from '../components/Icons.jsx'
import GoalGraphic, { kindFromText } from '../components/GoalGraphic.jsx'
import JourneyPanel from '../components/JourneyPanel.jsx'

const SCENARIO_COLORS = ['#377cc8', '#469b88', '#eed868', '#e78c9d', '#9da7d0']

// Read the four headline knobs back out of the saved plan, so the sliders open
// on the user's real position and "Reset to base plan" has something to return to.
function draftFromState({ profile, accounts, contributions, expenses }) {
  const investment = accounts.filter((a) => a.kind === 'asset' && a.type === 'investment')
  const investedTotal = investment.reduce((s, a) => s + a.balance, 0)
  const activeAtRetire = (e) => e.startAge <= profile.retirementAge && profile.retirementAge <= e.endAge
  return {
    retireAge: profile.retirementAge,
    monthlySip: Math.round(contributions.reduce((s, c) => s + c.amount, 0) / 12),
    // Balance-weighted so the slider opens on the blended return actually in the plan.
    equityReturn: investedTotal > 0
      ? investment.reduce((s, a) => s + a.balance * (a.growth || 0), 0) / investedTotal
      : 0.12,
    retMonthlyExpense: Math.round(expenses.filter(activeAtRetire).reduce((s, e) => s + e.amount, 0) / 12),
  }
}

/**
 * Projects the four slider values back onto the real plan shape.
 *
 * The design models the plan as four flat knobs; this app models it richly (growth per
 * account, SIPs routed per account, expenses as age-bounded flows). The mapping is
 * therefore proportional rather than exact: we scale what already exists so the
 * user's structure survives. It drives the preview only — nothing is written to the
 * store until Apply.
 */
function applyDraft(state, draft) {
  const { investableIds } = accountRoles(state.accounts)

  // Expected return applies to equity holdings only — EPF/PPF/NPS keep their own rates.
  const accounts = state.accounts.map((a) =>
    a.kind === 'asset' && a.type === 'investment' ? { ...a, growth: draft.equityReturn } : a,
  )

  // Scale existing SIPs to the drafted monthly total; if none exist yet, route it to
  // the first investable account so the slider still does something.
  const baseSipYear = state.contributions.reduce((s, c) => s + c.amount, 0)
  const targetSipYear = Math.max(0, draft.monthlySip) * 12
  let contributions
  if (baseSipYear > 0) {
    const scale = targetSipYear / baseSipYear
    contributions = state.contributions.map((c) => ({ ...c, amount: Math.round(c.amount * scale) }))
  } else if (targetSipYear > 0 && investableIds.length) {
    contributions = [{ id: 'draft-sip', accountId: investableIds[0], amount: targetSipYear, section: null }]
  } else {
    contributions = state.contributions
  }

  // Scale the expenses that are live at retirement to hit the drafted spend.
  const activeAtRetire = (e) => e.startAge <= draft.retireAge && draft.retireAge <= e.endAge
  const baseRetExpYear = state.expenses.filter(activeAtRetire).reduce((s, e) => s + e.amount, 0)
  const targetRetExpYear = Math.max(0, draft.retMonthlyExpense) * 12
  const expenses = baseRetExpYear > 0
    ? state.expenses.map((e) => (activeAtRetire(e)
        ? { ...e, amount: Math.round(e.amount * (targetRetExpYear / baseRetExpYear)) }
        : e))
    : state.expenses

  return {
    ...state,
    profile: { ...state.profile, retirementAge: draft.retireAge },
    accounts,
    contributions,
    expenses,
  }
}

// The design's verdict, judged against the user's own life expectancy rather than
// the mockup's hardcoded ages.
function verdictFor(lastsToAge, lifeExpectancy) {
  if (lastsToAge >= lifeExpectancy) return { label: 'Very likely', color: '#7bd0bc', bg: 'rgba(70,155,136,.22)' }
  if (lastsToAge >= lifeExpectancy - 3) return { label: 'On track', color: '#7bd0bc', bg: 'rgba(70,155,136,.22)' }
  if (lastsToAge >= lifeExpectancy - 11) return { label: 'At risk', color: '#cdb475', bg: 'rgba(238,216,104,.2)' }
  return { label: 'Unlikely', color: '#eda192', bg: 'rgba(224,83,61,.22)' }
}

export default function Plan() {
  const { state } = useProjection()
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const events = useStore((s) => s.events)
  const accounts = useStore((s) => s.accounts)
  const contributions = useStore((s) => s.contributions)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const addItem = useStore((s) => s.addItem)
  const updateItem = useStore((s) => s.updateItem)
  const removeItem = useStore((s) => s.removeItem)
  const scenarios = useStore((s) => s.scenarios) || []
  const activeScenarioId = useStore((s) => s.activeScenarioId)
  const snapshots = useStore((s) => s.snapshots) || []
  const currentYear = useStore((s) => s.currentYear)
  const realTerms = useStore((s) => s.ui.realTerms)

  const base = useMemo(
    () => draftFromState({ profile, accounts, contributions, expenses }),
    [profile, accounts, contributions, expenses],
  )
  const [draft, setDraft] = useState(base)
  const [eventsOpen, setEventsOpen] = useState(false)
  const [eventDraft, setEventDraft] = useState({ name: '', age: 40, amount: 0, icon: '⭐' })

  // Re-baseline whenever the saved plan changes underneath (apply, scenario switch).
  useEffect(() => { setDraft(base) }, [base])

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const dirty = useMemo(
    () => Object.keys(base).some((k) => Math.abs(base[k] - draft[k]) > 1e-9),
    [base, draft],
  )

  // Monthly surplus — what's left after this year's income and expenses.
  const surplus = useMemo(() => {
    const age = profile.currentAge
    const activeNow = (x) => (x.startAge ?? 0) <= age && age <= (x.endAge ?? 200)
    const inc = incomes.filter(activeNow).reduce((s, i) => s + i.amount, 0) / 12
    const exp = expenses.filter(activeNow).reduce((s, e) => s + e.amount, 0) / 12
    return Math.max(0, inc - exp)
  }, [incomes, expenses, profile.currentAge])

  // The slider must be able to represent the plan the user already has, even when
  // that SIP runs above surplus — clamping to surplus would silently rewrite it.
  const sipMax = Math.max(1000, Math.round(surplus), draft.monthlySip)

  // Everything below follows the DRAFTED plan, previewed live.
  const chartState = useMemo(() => applyDraft(state, draft), [state, draft])
  const projection = useMemo(() => computeProjection(chartState), [chartState])
  const readiness = useMemo(() => computeReadiness(chartState, projection), [chartState, projection])

  const baseProjection = useMemo(() => computeProjection(applyDraft(state, base)), [state, base])

  const retireRow = projection.find((r) => r.age === draft.retireAge)
  const retireCorpus = retireRow?.investable ?? 0
  const baseRetireCorpus = baseProjection.find((r) => r.age === base.retireAge)?.investable ?? 0
  const delta = retireCorpus - baseRetireCorpus
  const monthlyPension = (retireCorpus * 0.04) / 12
  const lastsToAge = useMemo(() => corpusLastsToAge(chartState, projection), [chartState, projection])
  const verdict = verdictFor(lastsToAge, profile.lifeExpectancy)

  const deltaText = !dirty || Math.abs(delta) < 50000
    ? 'Matches your base plan.'
    : delta > 0
      ? `▲ ${fmtMoney(delta, { compact: true })} more corpus than your base plan.`
      : `▼ ${fmtMoney(Math.abs(delta), { compact: true })} less than your base plan.`

  // Corpus curve for the dark chart, to wherever the money runs out.
  const journeyData = useMemo(
    () => projection.filter((r) => r.age <= Math.min(profile.lifeExpectancy, lastsToAge + 1))
      .map((r) => ({ year: r.year, age: r.age, value: r.investable })),
    [projection, profile.lifeExpectancy, lastsToAge],
  )
  const eventDots = useMemo(
    () => (events || []).map((e) => ({ year: currentYear + (e.age - profile.currentAge), name: e.name })),
    [events, currentYear, profile.currentAge],
  )
  const retireYear = currentYear + (draft.retireAge - profile.currentAge)

  const sorted = [...(events || [])].sort((a, b) => a.age - b.age)

  // Actual recorded net worth vs this plan's projection for that year.
  const progressRows = useMemo(() => snapshots.map((snap) => {
    const year = Number(snap.ym.slice(0, 4))
    const projRow = projection.find((r) => r.year === year)
    return { ...snap, delta: projRow ? snap.netWorth - projRow.netWorth : null }
  }), [snapshots, projection])

  // Every what-if plan projected side by side.
  const scenarioResults = useMemo(() => scenarios.map((sc, i) => {
    const data = sc.id === activeScenarioId ? chartState : { ...sc.data, currentYear, realTerms }
    if (!data?.accounts) return null
    const proj = sc.id === activeScenarioId ? projection : computeProjection(data)
    const ready = sc.id === activeScenarioId ? readiness : computeReadiness(data, proj)
    return { id: sc.id, name: sc.name, color: SCENARIO_COLORS[i % SCENARIO_COLORS.length], proj, ready, retirementAge: data.profile.retirementAge }
  }).filter(Boolean), [scenarios, activeScenarioId, chartState, projection, readiness, currentYear, realTerms])

  const compareData = useMemo(() => {
    if (scenarioResults.length < 2) return []
    const byYear = new Map()
    scenarioResults.forEach((sc) => sc.proj.forEach((row) => {
      if (!byYear.has(row.year)) byYear.set(row.year, { year: row.year })
      byYear.get(row.year)[sc.id] = row.netWorth
    }))
    return [...byYear.values()].sort((a, b) => a.year - b.year)
  }, [scenarioResults])

  // Commit the previewed plan: write back the same shapes applyDraft derived.
  const apply = useCallback(() => {
    const next = applyDraft(state, draft)
    setProfile({ retirementAge: draft.retireAge })
    next.accounts.forEach((a) => {
      const prev = accounts.find((x) => x.id === a.id)
      if (prev && prev.growth !== a.growth) updateItem('accounts', a.id, { growth: a.growth })
    })
    next.expenses.forEach((e) => {
      const prev = expenses.find((x) => x.id === e.id)
      if (prev && prev.amount !== e.amount) updateItem('expenses', e.id, { amount: e.amount })
    })
    const existing = new Set(contributions.map((c) => c.id))
    next.contributions.forEach((c) => {
      if (existing.has(c.id)) {
        const prev = contributions.find((x) => x.id === c.id)
        if (prev && prev.amount !== c.amount) updateItem('contributions', c.id, { amount: c.amount })
      } else {
        addItem('contributions', { accountId: c.accountId, amount: c.amount, section: null })
      }
    })
  }, [state, draft, accounts, expenses, contributions, setProfile, updateItem, addItem])

  const addEvent = () => {
    if (!eventDraft.name.trim()) return
    addItem('events', { ...eventDraft, age: Number(eventDraft.age), amount: Number(eventDraft.amount), color: '#377cc8' })
    setEventDraft({ name: '', age: 40, amount: 0, icon: '⭐' })
  }

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-4">
      {/* Header */}
      <div>
        <div className="section-label">Future Blueprint</div>
        <h1 className="text-[22px] font-extrabold tracking-tight mt-0.5">Plan</h1>
        <p className="text-[13px] text-ink-500 mt-1">Drag the sliders — your whole future re-projects live.</p>
      </div>

      {/* ===== RESULT HERO ===== */}
      <HeroCard>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-300">Corpus at age {draft.retireAge}</div>
            <div className="money text-[34px] font-extrabold leading-[1.15] mt-0.5">{fmtMoney(retireCorpus, { compact: true })}</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold shrink-0 whitespace-nowrap"
            style={{ background: verdict.bg, color: verdict.color }}>
            {verdict.label}
          </span>
        </div>
        <div className="flex gap-2.5 mt-4">
          <div className="flex-1 rounded-[13px] bg-white/[0.06] px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-300">Money lasts to</div>
            <div className="money text-lg font-extrabold mt-0.5" style={{ color: verdict.color }}>
              age {lastsToAge >= profile.lifeExpectancy ? `${profile.lifeExpectancy}+` : lastsToAge}
            </div>
          </div>
          <div className="flex-1 rounded-[13px] bg-white/[0.06] px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-300">Est. pension (4%)</div>
            <div className="money text-lg font-extrabold mt-0.5">{fmtMoney(monthlyPension, { compact: true })}/mo</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-ink-300">{deltaText}</div>
      </HeroCard>

      {/* ===== LIVE CORPUS CHART ===== */}
      <JourneyPanel
        data={journeyData}
        valueLabel="Corpus"
        markerYear={retireYear}
        markerAge={draft.retireAge}
        events={eventDots}
        height={210}
        gradientId="planJourney"
        footer={
          <div className="flex items-center gap-4 px-1 pt-1.5 pb-0.5 text-[11px] font-semibold text-[#8b8b93]">
            <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-3.5 rounded-sm" style={{ background: '#377cc8' }} />Corpus</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed" style={{ borderColor: '#469b88' }} />Retire</span>
          </div>
        }
      />

      {/* ===== SLIDERS ===== */}
      <Card className="!px-[18px] !pt-[18px] !pb-2">
        <Slider
          label="Retirement age" value={draft.retireAge} suffix=" yrs"
          min={profile.currentAge + 1} max={profile.lifeExpectancy} step={1}
          onChange={(v) => set({ retireAge: v })}
        />
        <Slider
          label="Monthly SIP" value={draft.monthlySip} prefix="₹" suffix="/mo"
          min={0} max={sipMax} step={1}
          onChange={(v) => set({ monthlySip: v })}
          hint={draft.monthlySip > surplus
            ? `Above your monthly surplus of ${fmtMoney(surplus, { compact: true })} — you'd be drawing down cash to fund it.`
            : `Your monthly surplus is ${fmtMoney(surplus, { compact: true })}`}
        />
        <Slider
          label="Expected return" value={Number((draft.equityReturn * 100).toFixed(1))} suffix="%"
          min={6} max={15} step={0.1}
          onChange={(v) => set({ equityReturn: v / 100 })}
          hint="Applied to your equity holdings — EPF/PPF/NPS keep their own rates."
        />
        <Slider
          label="Spend in retirement" value={draft.retMonthlyExpense} prefix="₹" suffix="/mo"
          min={0} max={Math.max(250000, draft.retMonthlyExpense)} step={1}
          onChange={(v) => set({ retMonthlyExpense: v })}
        />
      </Card>

      <div className="flex items-center justify-center gap-2.5">
        <button type="button" onClick={() => setDraft(base)} disabled={!dirty}
          className="btn-secondary disabled:opacity-40">
          ↺ Reset to base plan
        </button>
        <button type="button" onClick={apply} disabled={!dirty} className="btn-primary disabled:opacity-40">
          Save as my plan
        </button>
      </div>

      {/* ===== STRATEGIC MILESTONES ===== */}
      <section>
        <SectionLabel
          action={
            <button type="button" onClick={() => setEventsOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-brand-600">
              <IconPlus size={13} /> Add
            </button>
          }
        >
          Strategic Milestones
        </SectionLabel>
        {sorted.length > 0 ? (
          <div className="space-y-3">
            {sorted.map((e) => {
              const year = CURRENT_YEAR + (e.age - profile.currentAge)
              return (
                <Card key={e.id} interactive onClick={() => setEventsOpen(true)}
                  className="flex items-center gap-3 !py-3.5 cursor-pointer group">
                  <div className="grid place-items-center h-11 w-11 rounded-[13px] bg-brand-50 dark:bg-brand-500/15 shrink-0">
                    <GoalGraphic kind={kindFromText(e.name)} size={30} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[15px] truncate leading-tight">{e.name}</div>
                    <div className="text-xs text-ink-400 mt-0.5">{year} · Age {e.age}</div>
                  </div>
                  <div className={`money text-[15px] font-extrabold shrink-0 ${
                    e.amount < 0 ? 'text-rose-600 dark:text-rose-400'
                      : e.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400'}`}>
                    {e.amount === 0 ? '—' : fmtMoney(e.amount, { compact: true })}
                  </div>
                  <button type="button" onClick={(ev) => { ev.stopPropagation(); removeItem('events', e.id) }}
                    className="text-ink-300 hover:text-rose-500 opacity-70 group-hover:opacity-100 shrink-0"
                    aria-label={`Remove ${e.name}`}>
                    <IconTrash size={16} />
                  </button>
                </Card>
              )
            })}
          </div>
        ) : (
          <button type="button" onClick={() => setEventsOpen(true)}
            className="w-full rounded-2xl border-2 border-dashed border-ink-200 dark:border-ink-700 py-8 text-center hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-sm font-semibold text-ink-600 dark:text-ink-300">Add your first life event</div>
            <div className="text-xs text-ink-400 mt-1">Car, home, wedding, education…</div>
          </button>
        )}
      </section>

      {/* Scenario comparison — only when there's more than one what-if plan */}
      {scenarioResults.length > 1 && (
        <section>
          <SectionLabel>Scenario Comparison</SectionLabel>
          <Card className="!p-3">
            <p className="text-[11px] text-ink-400 px-1 mb-2">Net worth across your what-if plans — switch plans from the top bar.</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compareData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tickFormatter={(v) => fmtMoney(v, { compact: true }).replace('₹', '')} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip formatter={(v, n) => [fmtMoney(v), n]} labelFormatter={(l) => `Year ${l}`}
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 24px rgba(15,23,42,0.12)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  {scenarioResults.map((sc) => (
                    <Line key={sc.id} type="linear" dataKey={sc.id} name={sc.name} stroke={sc.color}
                      strokeWidth={sc.id === activeScenarioId ? 3 : 2} dot={false} isAnimationActive={false}
                      strokeDasharray={sc.id === activeScenarioId ? undefined : '6 4'} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* Progress vs plan — your recorded net worth against this projection */}
      {progressRows.length > 0 && (
        <section>
          <SectionLabel>Progress vs Plan</SectionLabel>
          <Card className="!p-4">
            <p className="text-[13px] text-ink-400 mb-3.5 leading-relaxed">Your actual net worth, recorded each month, against this plan.</p>
            <div className="space-y-2">
              {progressRows.slice(-6).map((row) => (
                <div key={row.ym} className="flex items-center gap-2.5 rounded-[14px] bg-ink-50 dark:bg-ink-800/60 px-3.5 py-3.5">
                  <span className="money text-[15px] font-extrabold text-ink-500 dark:text-ink-300">{row.ym}</span>
                  <span className="money flex-1 text-right text-base font-extrabold">{fmtMoney(row.netWorth, { compact: true })}</span>
                  {row.delta != null && (
                    <span className={`chip shrink-0 text-[11px] font-extrabold ${row.delta >= 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'}`}>
                      {row.delta >= 0 ? '+' : ''}{fmtMoney(row.delta, { compact: true })} vs plan
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Events modal */}
      <Modal open={eventsOpen} onClose={() => setEventsOpen(false)} title="Life Events">
        <p className="text-sm text-ink-400 mb-4">Add milestones like home, car, education — they appear on your plan chart.</p>
        <div className="space-y-3">
          <Field label="Event name">
            <input value={eventDraft.name} onChange={(e) => setEventDraft({ ...eventDraft, name: e.target.value })} placeholder="e.g. Buy a car" className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input type="number" value={eventDraft.age} onChange={(e) => setEventDraft({ ...eventDraft, age: e.target.value })} className="input" />
            </Field>
            <Field label="Icon">
              <input value={eventDraft.icon} onChange={(e) => setEventDraft({ ...eventDraft, icon: e.target.value })} className="input" maxLength={2} />
            </Field>
          </div>
          <Field label="Cash impact (+ / −)">
            <input type="number" value={eventDraft.amount} onChange={(e) => setEventDraft({ ...eventDraft, amount: e.target.value })} placeholder="-1200000" className="input" />
          </Field>
          <button onClick={addEvent} className="btn-primary w-full">
            <IconPlus size={16} /> Add event
          </button>
        </div>
        {sorted.length > 0 && (
          <div className="mt-4 pt-4 border-t border-ink-100 dark:border-ink-800 space-y-2 max-h-48 overflow-y-auto">
            {sorted.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span>{e.icon} {e.name} <span className="text-ink-400">· age {e.age}</span></span>
                <button onClick={() => removeItem('events', e.id)} className="text-rose-500 text-xs font-semibold">Remove</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

// A labelled range with a directly-editable value, per the design.
function Slider({ label, value, min, max, step, onChange, prefix = '', suffix = '', hint }) {
  const clamp = (v) => Math.min(max, Math.max(min, v))
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="text-xs font-bold text-ink-500 dark:text-ink-300">{label}</span>
        <span className="inline-flex items-baseline money text-base font-extrabold text-brand-600">
          {prefix}
          <input
            type="number" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
            onWheel={(e) => e.currentTarget.blur()}
            aria-label={label}
            className="money w-[86px] rounded-md bg-transparent px-0.5 py-px text-right font-extrabold text-brand-600 outline-none focus:bg-brand-50 focus:ring-2 focus:ring-brand-600/25 dark:focus:bg-brand-500/10"
          />
          {suffix}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="cursor-pointer"
      />
      {hint && <p className="mt-2 px-0.5 text-[11px] text-ink-400">{hint}</p>}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
