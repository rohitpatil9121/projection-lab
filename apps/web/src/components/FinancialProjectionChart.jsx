import { useMemo, useState, useEffect } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip,
  ReferenceLine, CartesianGrid, Cell, Label,
} from 'recharts'
import { fmtMoney } from '@projectlab/engine'
import { registerBackHandler } from '../hooks/backButton.js'

function EndLabel({ viewBox, value }) {
  if (!viewBox || value == null || viewBox.x == null || viewBox.y == null) return null
  const { x, y, width = 300 } = viewBox
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const labelW = 104
  const cx = Math.min(Math.max(x, labelW / 2 + 4), (width || 300) - labelW / 2 - 4)
  const cy = Math.max(y - 20, 8)
  return (
    <g>
      <rect x={cx - labelW / 2} y={cy - 14} width={labelW} height={22} rx={11} fill="#4f46e5" />
      <text x={cx} y={cy + 1} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>
        {fmtMoney(value, { compact: true })}
      </text>
    </g>
  )
}

function RetireLabel({ viewBox, value }) {
  if (!viewBox || value == null || viewBox.x == null) return null
  const { x, y } = viewBox
  return (
    <text x={x} y={(y ?? 0) + 14} textAnchor="middle" fill="#22c55e" fontSize={11} fontWeight={700}>
      {fmtMoney(value, { compact: true })}
    </text>
  )
}

function sanitizeRows(projection) {
  return (projection || [])
    .filter((r) => r && Number.isFinite(r.age) && Number.isFinite(r.netWorth))
    .map((row) => ({
      ...row,
      netWorth: Math.max(0, row.netWorth),
      savings: Math.max(0, (row.income || 0) - (row.expense || 0)),
    }))
}

export default function FinancialProjectionChart({
  projection,
  retirementAge,
  events = [],
  goals = [],
  onMarkerClick,
}) {
  const [active, setActive] = useState(null)

  const data = useMemo(() => sanitizeRows(projection), [projection])
  const minAge = data[0]?.age ?? 0
  const maxAge = data[data.length - 1]?.age ?? 0
  const maxNw = data.length ? Math.max(...data.map((r) => r.netWorth), 1) : 1
  const maxSavings = data.length ? Math.max(...data.map((r) => r.savings), 1) : 1

  const markers = useMemo(() => {
    if (!data.length) return []
    const list = []
    events.forEach((e) => {
      if (!Number.isFinite(e.age) || e.age < minAge || e.age > maxAge) return
      list.push({
        id: e.id,
        kind: 'event',
        age: e.age,
        icon: e.icon || '⭐',
        name: e.name,
        amount: e.amount,
      })
    })
    goals.forEach((g) => {
      if (!g.targetAge || g.targetAge < minAge || g.targetAge > maxAge) return
      list.push({
        id: g.id,
        kind: 'goal',
        age: g.targetAge,
        icon: g.icon || '🎯',
        name: g.name,
        amount: g.target,
      })
    })
    return list.sort((a, b) => a.age - b.age)
  }, [events, goals, data.length, minAge, maxAge])

  useEffect(() => {
    if (!active) return undefined
    return registerBackHandler(() => {
      setActive(null)
      return true
    })
  }, [active])

  if (!data.length) {
    return (
      <div className="h-[340px] grid place-items-center text-sm text-ink-400">
        Add accounts and income to see your projection.
      </div>
    )
  }

  const retireRow = data.find((r) => r.age === retirementAge) || data.find((r) => r.age >= retirementAge)
  const endRow = data[data.length - 1]

  const agePct = (age) => {
    if (maxAge === minAge) return 0
    return ((age - minAge) / (maxAge - minAge)) * 100
  }

  const handleSelect = (marker) => {
    setActive(marker)
    onMarkerClick?.(marker)
  }

  return (
    <div className="relative">
      <div className="h-[300px] sm:h-[360px] -mx-1">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <ComposedChart data={data} margin={{ top: 36, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200/40 dark:text-ink-800/60" vertical={false} />
            <XAxis
              dataKey="age"
              type="number"
              domain={[minAge, maxAge]}
              ticks={[minAge, retirementAge, maxAge].filter((v, i, a) => a.indexOf(v) === i)}
              tick={{ fontSize: 11, fontWeight: 600 }}
              stroke="currentColor"
              className="text-ink-400"
              tickLine={false}
              axisLine={false}
            />
            <YAxis yAxisId="nw" hide domain={[0, maxNw * 1.08]} />
            <YAxis yAxisId="flow" hide domain={[0, maxSavings * 1.2]} />
            <Tooltip
              content={({ active: on, payload, label }) => {
                if (!on || !payload?.length) return null
                const row = payload.find((p) => p.dataKey === 'netWorth')?.payload
                if (!row) return null
                return (
                  <div className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-900 shadow-soft px-3 py-2 text-xs">
                    <div className="font-bold mb-1">Age {label}</div>
                    <div>Net worth: <span className="font-semibold">{fmtMoney(row.netWorth)}</span></div>
                    {row.savings > 0 && <div>Surplus: {fmtMoney(row.savings, { compact: true })}</div>}
                  </div>
                )
              }}
            />
            <Bar yAxisId="flow" dataKey="savings" barSize={4} radius={[2, 2, 0, 0]} opacity={0.9} isAnimationActive={false}>
              {data.map((row) => (
                <Cell key={row.age} fill={row.age < retirementAge ? '#14b8a6' : '#6366f1'} />
              ))}
            </Bar>
            <Line
              yAxisId="nw"
              type="linear"
              dataKey="netWorth"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: '#4f46e5' }}
              isAnimationActive={false}
            />
            {retireRow && (
              <ReferenceLine yAxisId="nw" x={retireRow.age} stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2}>
                <Label content={<RetireLabel value={retireRow.netWorth} />} position="top" />
              </ReferenceLine>
            )}
            {endRow && endRow.netWorth > 0 && (
              <ReferenceLine yAxisId="nw" x={endRow.age} stroke="transparent">
                <Label content={<EndLabel value={endRow.netWorth} />} position="top" />
              </ReferenceLine>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Event / goal markers — HTML strip avoids Recharts Scatter line glitches */}
      {markers.length > 0 && (
        <div className="relative h-10 mx-2 mt-1">
          {markers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelect(m)}
              className="absolute -translate-x-1/2 top-0 h-9 w-9 rounded-full grid place-items-center text-base shadow-md border-2 border-white dark:border-ink-900"
              style={{
                left: `${agePct(m.age)}%`,
                background: m.kind === 'goal' ? '#8b5cf6' : '#4f46e5',
              }}
              title={m.name}
            >
              {m.icon}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="mt-3 rounded-2xl border border-brand-200 dark:border-brand-800 bg-brand-50/80 dark:bg-brand-950/30 px-4 py-3 flex items-center justify-between gap-3 animate-fade-in">
          <div className="min-w-0">
            <div className="text-lg">{active.icon}</div>
            <div className="font-bold text-sm truncate">{active.name}</div>
            <div className="text-xs text-ink-500">
              Age {active.age}
              {active.amount != null && active.amount !== 0 && (
                <> · {active.kind === 'goal' ? 'Target' : 'Impact'} {fmtMoney(active.amount, { compact: true })}</>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setActive(null)} className="text-xs font-semibold text-ink-400 hover:text-ink-600 shrink-0">
            Close
          </button>
        </div>
      )}
    </div>
  )
}
