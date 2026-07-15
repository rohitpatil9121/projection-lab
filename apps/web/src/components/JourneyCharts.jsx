import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine,
} from 'recharts'
import {
  fmtMoney, growthVsContributions, savingsRateSeries,
  allocationVsTarget, corpusLastsToAge,
} from '@projectlab/engine'
import { Card, SectionTitle } from './ui.jsx'

const axis = { tick: { fontSize: 11 }, stroke: 'currentColor', tickLine: false, axisLine: false }
const gridCls = 'text-ink-200 dark:text-ink-800'

function MoneyTooltip({ active, payload, label, title }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 shadow-soft px-3 py-2 text-xs">
      <div className="font-bold mb-1">{title ? `${title} ${label}` : `Year ${label}`}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold">{p.unit === '%' ? `${p.value}%` : fmtMoney(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// 1 — Who's building your corpus: contributions vs market growth (stacked).
export function GrowthVsContributionsChart({ state, projection }) {
  const data = growthVsContributions(state, projection)
  if (data.length < 2) return null
  const last = data[data.length - 1]
  const total = last.growth + last.contributed
  const growthPct = total > 0 ? Math.round((last.growth / total) * 100) : 0

  return (
    <Card>
      <SectionTitle title="Who's building your corpus?" subtitle="Your deposits vs market growth over time" />
      <div className="mb-3 flex flex-wrap gap-4 text-xs font-semibold">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#377cc8' }} /> Market growth · {growthPct}%</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#94a3b8' }} /> Your contributions · {100 - growthPct}%</span>
      </div>
      <div className="h-[260px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="gGrow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#377cc8" stopOpacity={0.8} /><stop offset="100%" stopColor="#377cc8" stopOpacity={0.2} /></linearGradient>
              <linearGradient id="gContrib" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#94a3b8" stopOpacity={0.5} /><stop offset="100%" stopColor="#94a3b8" stopOpacity={0.15} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className={gridCls} vertical={false} />
            <XAxis dataKey="year" {...axis} className="text-ink-400" minTickGap={40} />
            <YAxis tickFormatter={(v) => fmtMoney(v, { compact: true })} width={54} {...axis} className="text-ink-400" />
            <Tooltip content={<MoneyTooltip />} />
            <Area type="monotone" dataKey="contributed" name="Your contributions" stackId="1" stroke="#94a3b8" fill="url(#gContrib)" strokeWidth={1.5} isAnimationActive={false} />
            <Area type="monotone" dataKey="growth" name="Market growth" stackId="1" stroke="#377cc8" fill="url(#gGrow)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-400">The day growth overtakes your deposits, compounding is working harder than you are.</p>
    </Card>
  )
}

// 2 — Savings-rate trend against a calm healthy band.
export function SavingsRateChart({ state, projection }) {
  const data = savingsRateSeries(state, projection)
  if (data.length < 2) return null
  const now = data[0]

  return (
    <Card>
      <SectionTitle title="Savings-rate trend" subtitle="Projected each year · vs a healthy 20–30% band" />
      <div className="h-[260px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className={gridCls} vertical={false} />
            <XAxis dataKey="year" {...axis} className="text-ink-400" minTickGap={40} />
            <YAxis tickFormatter={(v) => `${v}%`} width={40} domain={[0, 'dataMax + 10']} {...axis} className="text-ink-400" />
            <ReferenceArea y1={20} y2={30} fill="#469b88" fillOpacity={0.1} />
            <ReferenceLine y={20} stroke="#469b88" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: 'healthy band', position: 'insideTopLeft', fontSize: 10, fill: '#15803d', fontWeight: 700 }} />
            <Tooltip content={<MoneyTooltip title="Age" />} />
            <Line type="monotone" dataKey="rate" name="Savings rate" unit="%" stroke="#377cc8" strokeWidth={2.6} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-400">You're saving <span className="font-bold text-brand-600">{now.rate}%</span> of income today.</p>
    </Card>
  )
}

// 3 — Allocation vs target (custom bars with a target tick).
export function AllocationVsTargetChart({ state }) {
  const rows = allocationVsTarget(state)
  const hasData = rows.some((r) => r.current > 0)
  if (!hasData) return null

  return (
    <Card>
      <SectionTitle title="Allocation vs target" subtitle="Drift you could rebalance" />
      <div className="space-y-4 mt-1">
        {rows.map((r) => {
          const off = Math.abs(r.drift) >= 5
          return (
            <div key={r.key}>
              <div className="flex items-center gap-2 text-xs font-semibold mb-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                {r.label}
                <span className={`chip ml-auto ${off ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'}`}>
                  {off ? `${r.drift > 0 ? '+' : ''}${r.drift}% ${r.drift > 0 ? 'over' : 'under'}` : 'on target'}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-ink-100 dark:bg-ink-800">
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${r.current}%`, background: r.color }} />
                <span className="absolute -inset-y-1 w-0.5 bg-ink-500 dark:bg-ink-200" style={{ left: `calc(${r.target}% - 1px)` }} title={`Target ${r.target}%`} />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-ink-400 font-medium">
                <span>{r.current}% now</span><span>target {r.target}%</span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-ink-400 flex items-center gap-1.5">
        <span className="inline-block w-0.5 h-3 bg-ink-500 dark:bg-ink-300" /> tick = your age-based target · bar = current mix.
      </p>
    </Card>
  )
}

// 4 — Corpus longevity: the retirement pot drawing down, staying above zero.
export function CorpusLongevityChart({ state, projection }) {
  const retireAge = state.profile.retirementAge
  const data = projection.filter((r) => r.age >= retireAge - 3).map((r) => ({ year: r.year, age: r.age, corpus: Math.max(0, r.investable) }))
  if (data.length < 2) return null
  const lastsTo = corpusLastsToAge(state, projection)
  const retireRow = data.find((r) => r.age === retireAge)

  return (
    <Card>
      <SectionTitle title="Will the corpus last?" subtitle={`Retirement pot from age ${retireAge} onward`} />
      <div className="h-[260px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="gCorpus" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#469b88" stopOpacity={0.4} /><stop offset="100%" stopColor="#469b88" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className={gridCls} vertical={false} />
            <XAxis dataKey="year" {...axis} className="text-ink-400" minTickGap={40} />
            <YAxis tickFormatter={(v) => fmtMoney(v, { compact: true })} width={54} {...axis} className="text-ink-400" />
            <Tooltip content={<MoneyTooltip title="Age" />} />
            {retireRow && <ReferenceLine x={retireRow.year} stroke="#377cc8" strokeDasharray="4 4" label={{ value: 'Retire', position: 'top', fontSize: 11, fill: '#377cc8', fontWeight: 700 }} />}
            <Area type="monotone" dataKey="corpus" name="Investable corpus" stroke="#469b88" fill="url(#gCorpus)" strokeWidth={2.4} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-400">
        Money lasts to age <span className="font-bold text-emerald-600">{lastsTo >= state.profile.lifeExpectancy ? `${lastsTo}+` : lastsTo}</span>
        {lastsTo >= state.profile.lifeExpectancy ? ' — a comfortable buffer.' : ' — consider trimming drawdown or extending SIPs.'}
      </p>
    </Card>
  )
}
