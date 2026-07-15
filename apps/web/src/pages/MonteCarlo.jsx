import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { useStore } from '../data/store.js'
import { runMonteCarlo } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionTitle, StatCard } from '../components/ui.jsx'

const RUN_OPTIONS = [250, 500, 1000]

function FanTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 shadow-soft px-3 py-2 text-xs">
      <div className="font-bold mb-1">{label} · Age {row.age}</div>
      <div className="flex justify-between gap-6"><span className="text-emerald-500">Best 10%</span><span>{fmtMoney(row.p90, { compact: true })}</span></div>
      <div className="flex justify-between gap-6 font-semibold"><span className="text-brand-500">Median</span><span>{fmtMoney(row.p50, { compact: true })}</span></div>
      <div className="flex justify-between gap-6"><span className="text-rose-500">Worst 10%</span><span>{fmtMoney(row.p10, { compact: true })}</span></div>
    </div>
  )
}

export default function MonteCarlo() {
  const state = useProjection().state
  const profile = useStore((s) => s.profile)
  const realTerms = useStore((s) => s.ui.realTerms)
  const [runs, setRuns] = useState(500)
  const [seed, setSeed] = useState(1)

  const mc = useMemo(() => runMonteCarlo(state, { runs, seed }), [state, runs, seed])
  const retireYear = (state.currentYear || 2026) + (profile.retirementAge - profile.currentAge)

  const success = Math.round(mc.successRate * 100)
  const verdict = success >= 85 ? 'Very likely' : success >= 70 ? 'On track' : success >= 50 ? 'At risk' : 'Unlikely'
  const verdictColor = success >= 85 ? '#469b88' : success >= 70 ? '#469b88' : success >= 50 ? '#eed868' : '#e0533d'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-brand-500/10 to-brand-500/0 flex flex-col">
          <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Success Probability</div>
          <div className="mt-1.5 text-3xl font-extrabold tracking-tight" style={{ color: verdictColor }}>{success}%</div>
          <span className="chip mt-2 w-fit" style={{ background: verdictColor + '22', color: verdictColor }}>{verdict}</span>
        </div>
        <StatCard label="Median Outcome" value={fmtMoney(mc.medianEnd, { compact: true })} sub={`net worth at ${profile.lifeExpectancy}`} accent="brand" />
        <StatCard label="Best Case (P90)" value={fmtMoney(mc.p90End, { compact: true })} sub="top 10% of runs" accent="green" />
        <StatCard label="Worst Case (P10)" value={fmtMoney(mc.p10End, { compact: true })} sub="bottom 10% of runs" accent={mc.p10End > 0 ? 'amber' : 'rose'} />
      </div>

      <Card>
        <SectionTitle
          title="Monte Carlo — Range of Outcomes"
          subtitle={`${mc.runs} randomized simulations · ${realTerms ? "today's money" : 'future value'} · net worth`}
          action={
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl bg-ink-100 dark:bg-ink-800 p-1 text-xs font-semibold">
                {RUN_OPTIONS.map((r) => (
                  <button key={r} onClick={() => setRuns(r)}
                    className={`px-2.5 py-1.5 rounded-lg transition ${runs === r ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500'}`}>
                    {r}
                  </button>
                ))}
              </div>
              <button onClick={() => setSeed((s) => s + 1)} className="btn-ghost !py-1.5 text-xs">↻ Re-run</button>
            </div>
          }
        />
        <div className="flex flex-wrap gap-3 mb-3 text-xs font-medium text-ink-500">
          <Legend color="#377cc8" label="10th–90th percentile" />
          <Legend color="#377cc8" label="25th–75th percentile" />
          <Legend color="#377cc8" label="Median" line />
        </div>
        <div className="h-[380px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mc.bands} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tickFormatter={(v) => fmtMoney(v, { compact: true })} tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} width={54} />
              <Tooltip content={<FanTooltip />} />
              {/* Stacked bands: invisible base, then the fan widths */}
              <Area dataKey="base" stackId="f" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area dataKey="b1" stackId="f" stroke="none" fill="#377cc8" fillOpacity={0.35} isAnimationActive={false} />
              <Area dataKey="b2" stackId="f" stroke="none" fill="#377cc8" fillOpacity={0.35} isAnimationActive={false} />
              <Area dataKey="b3" stackId="f" stroke="none" fill="#377cc8" fillOpacity={0.35} isAnimationActive={false} />
              <Line dataKey="p50" stroke="#377cc8" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <ReferenceLine x={retireYear} stroke="#469b88" strokeDasharray="4 4" label={{ value: 'Retire', position: 'top', fontSize: 11, fill: '#469b88', fontWeight: 700 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <SectionTitle title="How to read this" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <Explain icon="🎲" title="Why it varies" body="Equity mutual funds don't return a flat 12% — some years +30%, some −20%. Each run draws random yearly returns around the average." />
          <Explain icon="🎯" title="Success probability" body={`Share of ${mc.runs} runs where your investable corpus lasts through age ${profile.lifeExpectancy} without hitting zero.`} />
          <Explain icon="🛡️" title="CFP takeaway" body={success >= 85 ? 'Strong plan. Keep asset allocation and step-up SIPs with income.' : 'Boost SIPs, delay retirement, or trim post-retirement expenses to lift the odds.'} />
        </div>
      </Card>
    </div>
  )
}

function Legend({ color, label, line }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={line ? 'h-0.5 w-4 rounded-full' : 'h-3 w-3 rounded-sm'} style={{ background: color }} />
      {label}
    </span>
  )
}

function Explain({ icon, title, body }) {
  return (
    <div className="rounded-xl bg-ink-50 dark:bg-ink-800/60 p-4">
      <div className="text-xl">{icon}</div>
      <div className="font-bold text-sm mt-1">{title}</div>
      <p className="text-xs text-ink-400 mt-1 leading-relaxed">{body}</p>
    </div>
  )
}
