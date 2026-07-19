import { useMemo, useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import { useStore, computeProjection, computeReadiness } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney, accountRoles, corpusLastsToAge, safeWithdrawalRate } from '@projectlab/engine'
import { Card, SectionLabel, HeroCard } from '../components/ui.jsx'
import JourneyPanel from '../components/JourneyPanel.jsx'
import CountUpMoney from '../components/CountUpMoney.jsx'

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
  const milestones = useStore((s) => s.milestones)
  const accounts = useStore((s) => s.accounts)
  const contributions = useStore((s) => s.contributions)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const addItem = useStore((s) => s.addItem)
  const updateItem = useStore((s) => s.updateItem)
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

  // The slider must reach the plan the user already has, even when that SIP runs
  // above surplus — clamping to surplus would silently rewrite it. Hence headroom
  // above BOTH, and measured against the saved plan rather than the live draft: a
  // ceiling that tracked the draft would sit exactly on the current value, pinning
  // the knob to its own position so the SIP could only ever be lowered.
  const sipMax = useMemo(
    () => Math.max(1000, Math.ceil((Math.max(surplus, base.monthlySip) * 1.5) / 500) * 500),
    [surplus, base.monthlySip],
  )

  // Everything below follows the DRAFTED plan, previewed live.
  const chartState = useMemo(() => applyDraft(state, draft), [state, draft])
  const projection = useMemo(() => computeProjection(chartState), [chartState])
  const readiness = useMemo(() => computeReadiness(chartState, projection), [chartState, projection])

  const baseProjection = useMemo(() => computeProjection(applyDraft(state, base)), [state, base])

  const retireRow = projection.find((r) => r.age === draft.retireAge)
  const retireCorpus = retireRow?.investable ?? 0
  const baseRetireCorpus = baseProjection.find((r) => r.age === base.retireAge)?.investable ?? 0
  const delta = retireCorpus - baseRetireCorpus
  // Derived from the user's own inflation assumption rather than the US 4% rule.
  const swr = safeWithdrawalRate(profile.inflation)
  const monthlyPension = (retireCorpus * swr) / 12
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
    () => (milestones || [])
      .filter((g) => g.targetAge != null)
      .map((g) => ({ year: currentYear + (g.targetAge - profile.currentAge), name: g.name })),
    [milestones, currentYear, profile.currentAge],
  )
  const retireYear = currentYear + (draft.retireAge - profile.currentAge)

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
            <CountUpMoney value={retireCorpus} duration={0.5} className="money block text-[34px] font-extrabold leading-[1.15] mt-0.5" />
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
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-300">Est. pension ({(swr * 100).toFixed(1)}%)</div>
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
            {/* Monte Carlo has no tab in MobileNav (five slots, all taken), so on a
                phone this is the only way in — and the app ships as an Android APK. */}
            <Link to="/monte-carlo" className="ml-auto font-extrabold uppercase tracking-wider text-brand-400">
              Monte Carlo →
            </Link>
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

