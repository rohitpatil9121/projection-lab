import { useMemo } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts'
import { useStore, computeProjection, computeReadiness } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney } from '@projectlab/engine'
import { StatCard, Card, SectionTitle, Pill } from '../components/ui.jsx'
import { IconTarget, IconCheck } from '../components/Icons.jsx'
import {
  GrowthVsContributionsChart, SavingsRateChart, AllocationVsTargetChart, CorpusLongevityChart,
} from '../components/JourneyCharts.jsx'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 shadow-soft px-3 py-2 text-xs">
      <div className="font-bold mb-1">{label} · Age {row.age}</div>
      <div className="flex justify-between gap-6 font-semibold">
        <span className="text-ink-400">Net worth</span>
        <span>{fmtMoney(row.netWorth)}</span>
      </div>
      {payload.filter((p) => p.dataKey !== 'liabilities').map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{fmtMoney(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const SCENARIO_COLORS = ['#377cc8', '#469b88', '#eed868', '#e78c9d', '#9da7d0', '#9da7d0']

export default function Dashboard() {
  const { projection, readiness, state } = useProjection()
  const accounts = useStore((s) => s.accounts)
  const profile = useStore((s) => s.profile)
  const realTerms = useStore((s) => s.ui.realTerms)
  const setRealTerms = useStore((s) => s.setRealTerms)
  const scenarios = useStore((s) => s.scenarios)
  const activeScenarioId = useStore((s) => s.activeScenarioId)
  const snapshots = useStore((s) => s.snapshots)
  const currentYear = useStore((s) => s.currentYear)

  // Every scenario projected with its own data (active one uses live state).
  const scenarioResults = useMemo(() => {
    return scenarios.map((sc, i) => {
      const data = sc.id === activeScenarioId ? state : { ...sc.data, currentYear, realTerms }
      if (!data?.accounts) return null
      const proj = sc.id === activeScenarioId ? projection : computeProjection(data)
      const ready = sc.id === activeScenarioId ? readiness : computeReadiness(data, proj)
      return { id: sc.id, name: sc.name, color: SCENARIO_COLORS[i % SCENARIO_COLORS.length], proj, ready, retirementAge: data.profile.retirementAge }
    }).filter(Boolean)
  }, [scenarios, activeScenarioId, state, projection, readiness, currentYear, realTerms])

  const compareData = useMemo(() => {
    if (scenarioResults.length < 2) return []
    const byYear = new Map()
    scenarioResults.forEach((sc) => {
      sc.proj.forEach((row) => {
        if (!byYear.has(row.year)) byYear.set(row.year, { year: row.year })
        byYear.get(row.year)[sc.id] = row.netWorth
      })
    })
    return [...byYear.values()].sort((a, b) => a.year - b.year)
  }, [scenarioResults])

  // Actual recorded net worth vs the plan's projection for that year.
  const progressRows = useMemo(() => snapshots.map((snap) => {
    const year = Number(snap.ym.slice(0, 4))
    const projRow = projection.find((r) => r.year === year)
    return { ...snap, projected: projRow?.netWorth ?? null, delta: projRow ? snap.netWorth - projRow.netWorth : null }
  }), [snapshots, projection])

  const assetAccounts = accounts.filter((a) => a.kind === 'asset')
  const today = projection[0]
  const retireRow = projection.find((r) => r.age === profile.retirementAge)

  const netWorthGrowth = useMemo(() => {
    if (!retireRow || !today) return 0
    return Math.round(((retireRow.netWorth - today.netWorth) / today.netWorth) * 100)
  }, [today, retireRow])

  const peak = Math.max(...projection.map((r) => r.netWorth))

  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Net Worth Today" value={fmtMoney(today.netWorth, { compact: true })} sub="across all accounts" trend={8} accent="brand" />
        <StatCard label={`At Retirement (${profile.retirementAge})`} value={fmtMoney(retireRow?.netWorth || 0, { compact: true })} sub={`+${netWorthGrowth}% projected`} accent="green" />
        <StatCard label="Peak Net Worth" value={fmtMoney(peak, { compact: true })} sub="lifetime maximum" accent="amber" />
        <StatCard label="Plan Success" value={`${readiness.score}%`} sub={readiness.success ? 'on track' : 'needs attention'} accent={readiness.success ? 'green' : 'rose'} />
      </div>

      {/* Main projection chart */}
      <Card>
        <SectionTitle
          title="Net Worth Projection"
          subtitle={`Age ${profile.currentAge} to ${profile.lifeExpectancy} · ${realTerms ? "today's money" : 'future value'}`}
          action={
            <div className="inline-flex rounded-xl bg-ink-100 dark:bg-ink-800 p-1 text-xs font-semibold">
              <button
                onClick={() => setRealTerms(true)}
                className={`px-3 py-1.5 rounded-lg transition ${realTerms ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500'}`}
              >Today's money</button>
              <button
                onClick={() => setRealTerms(false)}
                className={`px-3 py-1.5 rounded-lg transition ${!realTerms ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500'}`}
              >Future value</button>
            </div>
          }
        />
        <div className="mb-3 hidden sm:flex flex-wrap gap-2">
          {assetAccounts.map((a) => <Pill key={a.id} color={a.color}>{a.name}</Pill>)}
        </div>
        <div className="h-[380px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                {assetAccounts.map((a) => (
                  <linearGradient key={a.id} id={`g-${a.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={a.color} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={a.color} stopOpacity={0.25} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tickFormatter={(v) => fmtMoney(v, { compact: true })} tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} width={54} />
              <Tooltip content={<ChartTooltip />} />
              {assetAccounts.map((a) => (
                <Area key={a.id} type="linear" dataKey={a.id} name={a.name} stackId="1" stroke={a.color} fill={`url(#g-${a.id})`} strokeWidth={1.5} isAnimationActive={false} />
              ))}
              <ReferenceLine x={retireRow?.year} stroke="#469b88" strokeDasharray="4 4" label={{ value: 'Retire', position: 'top', fontSize: 11, fill: '#469b88', fontWeight: 700 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs expense */}
        <Card className="lg:col-span-2">
          <SectionTitle title="Income vs. Expenses" subtitle="Projected annual cash flow" />
          <div className="h-[240px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#377cc8" stopOpacity={0.5} /><stop offset="100%" stopColor="#377cc8" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e0533d" stopOpacity={0.5} /><stop offset="100%" stopColor="#e0533d" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis tickFormatter={(v) => fmtMoney(v, { compact: true })} tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} width={54} />
                <Tooltip formatter={(v, n) => [fmtMoney(v), n]} labelFormatter={(l) => `Year ${l}`} contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 24px rgba(15,23,42,0.12)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="linear" dataKey="income" name="Income" stroke="#377cc8" fill="url(#gInc)" strokeWidth={2} isAnimationActive={false} />
                <Area type="linear" dataKey="expense" name="Expenses" stroke="#e0533d" fill="url(#gExp)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Readiness card */}
        <Card className="flex flex-col">
          <SectionTitle title="Retirement Readiness" />
          <div className="grid place-items-center py-2">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="12" className="text-ink-100 dark:text-ink-800" stroke="currentColor" />
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="12" strokeLinecap="round"
                  stroke={readiness.success ? '#469b88' : '#eed868'}
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - readiness.score / 100)} />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-3xl font-extrabold">{readiness.score}%</div>
                  <div className="text-[11px] text-ink-400 font-semibold uppercase">success</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-2 text-sm">
            <Row icon={<IconCheck size={16} />} label="Money lasts to age" value={profile.lifeExpectancy} ok />
            <Row icon={<IconTarget size={16} />} label="Lowest investable" value={fmtMoney(readiness.lowestInvestable, { compact: true })} ok={readiness.lowestInvestable > 0} />
            <Row icon={<IconTarget size={16} />} label="End net worth" value={fmtMoney(readiness.endNetWorth, { compact: true })} ok={readiness.endNetWorth > 0} />
          </div>
        </Card>
      </div>

      {/* ---- Deeper charts ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GrowthVsContributionsChart state={state} projection={projection} />
        <SavingsRateChart state={state} projection={projection} />
        <AllocationVsTargetChart state={state} />
        <CorpusLongevityChart state={state} projection={projection} />
      </div>

      {/* ---- Scenario comparison (ProjectionLab-style) ---- */}
      {scenarioResults.length > 1 && (
        <Card>
          <SectionTitle title="Scenario Comparison" subtitle="Net worth across your what-if plans — switch scenarios from the top bar" />
          <div className="h-[280px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compareData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis tickFormatter={(v) => fmtMoney(v, { compact: true })} tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} width={54} />
                <Tooltip formatter={(v, n) => [fmtMoney(v), n]} labelFormatter={(l) => `Year ${l}`} contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 24px rgba(15,23,42,0.12)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {scenarioResults.map((sc) => (
                  <Line key={sc.id} type="linear" dataKey={sc.id} name={sc.name} stroke={sc.color}
                    strokeWidth={sc.id === activeScenarioId ? 3 : 2} dot={false} isAnimationActive={false}
                    strokeDasharray={sc.id === activeScenarioId ? undefined : '6 4'} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-400 uppercase tracking-wide">
                  <th className="py-1.5 pr-4 font-semibold">Scenario</th>
                  <th className="py-1.5 pr-4 font-semibold">At retirement</th>
                  <th className="py-1.5 pr-4 font-semibold">Peak</th>
                  <th className="py-1.5 pr-4 font-semibold">End of plan</th>
                  <th className="py-1.5 font-semibold">Success</th>
                </tr>
              </thead>
              <tbody>
                {scenarioResults.map((sc) => {
                  const retire = sc.proj.find((r) => r.age === sc.retirementAge)
                  const peakNw = Math.max(...sc.proj.map((r) => r.netWorth))
                  return (
                    <tr key={sc.id} className="border-t border-ink-100 dark:border-ink-800">
                      <td className="py-2 pr-4 font-semibold">
                        <span className="inline-block h-2.5 w-2.5 rounded-full mr-2" style={{ background: sc.color }} />
                        {sc.name}{sc.id === activeScenarioId && <span className="chip bg-brand-100 text-brand-700 text-[10px] ml-2">active</span>}
                      </td>
                      <td className="py-2 pr-4">{fmtMoney(retire?.netWorth || 0, { compact: true })}</td>
                      <td className="py-2 pr-4">{fmtMoney(peakNw, { compact: true })}</td>
                      <td className="py-2 pr-4">{fmtMoney(sc.ready.endNetWorth, { compact: true })}</td>
                      <td className="py-2 font-bold">{sc.ready.score}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---- Progress vs plan ---- */}
      {progressRows.length > 0 && (
        <Card>
          <SectionTitle title="Progress vs Plan" subtitle="Your actual net worth, recorded monthly, against this plan's projection" />
          <div className="grid gap-2">
            {progressRows.slice(-12).map((row) => (
              <div key={row.ym} className="flex items-center justify-between rounded-xl bg-ink-50 dark:bg-ink-800/60 px-4 py-2.5 text-sm">
                <span className="font-semibold text-ink-500">{row.ym}</span>
                <div className="flex items-center gap-4">
                  <span className="font-bold">{fmtMoney(row.netWorth, { compact: true })}</span>
                  {row.delta != null && (
                    <span className={`chip text-xs ${row.delta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {row.delta >= 0 ? '+' : ''}{fmtMoney(row.delta, { compact: true })} vs plan
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function Row({ icon, label, value, ok }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-ink-50 dark:bg-ink-800/60 px-3 py-2">
      <div className="flex items-center gap-2 text-ink-500">
        <span className={ok ? 'text-emerald-500' : 'text-amber-500'}>{icon}</span>
        {label}
      </div>
      <span className="font-bold">{value}</span>
    </div>
  )
}
