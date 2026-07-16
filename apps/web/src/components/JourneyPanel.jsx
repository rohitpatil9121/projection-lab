import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, ReferenceLine, ReferenceDot, Tooltip,
} from 'recharts'
import { fmtMoney } from '@projectlab/engine'
import { SectionLabel } from './ui.jsx'

const BRAND = '#377cc8'
const TEAL = '#469b88'
const AXIS = '#8b8b93'
const GRID = 'rgba(255,255,255,0.08)'

// Evenly spaced year ticks across the series (the design shows four).
function yearTicks(data, count = 4) {
  if (data.length < 2) return data.map((d) => d.year)
  const first = data[0].year
  const last = data[data.length - 1].year
  return Array.from({ length: count }, (_, i) =>
    Math.round(first + ((last - first) * (i + 1)) / count),
  )
}

// Sample ~6 evenly spaced rows for the table view, always including the last.
function sampleRows(data, count = 6) {
  if (data.length <= count) return data
  const step = Math.ceil(data.length / count)
  const rows = data.filter((_, i) => i % step === 0)
  const last = data[data.length - 1]
  if (rows[rows.length - 1] !== last) rows.push(last)
  return rows
}

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#232326] px-3 py-2 text-xs shadow-lift">
      <div className="mb-0.5 font-bold text-white">Year {label}</div>
      <div className="money font-semibold" style={{ color: BRAND }}>
        {fmtMoney(payload[0].value)}
      </div>
    </div>
  )
}

/**
 * The dark wealth-journey surface shared by Today and Plan: a section label with a
 * chart/table toggle, an area chart with a retirement marker and life-event dots,
 * and an optional footer.
 *
 * @param data   [{ year, age, value }] already projected by the engine.
 * @param events [{ year, name }] drawn as dots on the line.
 */
export default function JourneyPanel({
  label = 'Wealth Journey',
  data,
  valueLabel = 'Net worth',
  markerYear = null,
  markerAge = null,
  events = [],
  footer = null,
  height = 214,
  gradientId = 'journeyFill',
}) {
  const [showTable, setShowTable] = useState(false)
  const tableRows = useMemo(() => sampleRows(data), [data])
  const ticks = useMemo(() => yearTicks(data), [data])

  // Place each event dot at the projected value for its year.
  const eventDots = useMemo(() => {
    const byYear = new Map(data.map((d) => [d.year, d.value]))
    return events
      .filter((e) => byYear.has(e.year))
      .map((e) => ({ ...e, value: byYear.get(e.year) }))
  }, [data, events])

  if (!data.length) return null

  return (
    <div>
      <SectionLabel
        action={
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            className="text-[11px] font-extrabold uppercase tracking-wider text-brand-400"
          >
            {showTable ? 'Chart' : 'Table'}
          </button>
        }
      >
        {label}
      </SectionLabel>

      <div className="panel-dark animate-fade-in-up">
        {showTable ? (
          <div className="scr max-h-[214px] overflow-y-auto">
            <table className="w-full border-collapse text-[12.5px] text-ink-100">
              <caption className="sr-only">Projected {valueLabel.toLowerCase()} by year</caption>
              <thead>
                <tr className="text-left text-[#8b8b93]">
                  <th scope="col" className="px-1 py-1.5 text-[10px] font-bold uppercase tracking-wider">Year</th>
                  <th scope="col" className="px-1 py-1.5 text-[10px] font-bold uppercase tracking-wider">Age</th>
                  <th scope="col" className="px-1 py-1.5 text-right text-[10px] font-bold uppercase tracking-wider">{valueLabel}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.year} className="border-t border-white/[0.07]">
                    <td className="money px-1 py-2">{r.year}</td>
                    <td className="px-1 py-2 text-[#8b8b93]">{r.age}</td>
                    <td className="money px-1 py-2 text-right font-bold">{fmtMoney(r.value, { compact: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 14, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="year" ticks={ticks} type="number" domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 9.5, fill: AXIS }} tickLine={false} axisLine={false}
                />
                <YAxis
                  width={44} tick={{ fontSize: 9.5, fill: AXIS }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => (v === 0 ? '0' : fmtMoney(v, { compact: true }).replace('₹', ''))}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ stroke: GRID }} />
                <Area
                  type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2.6}
                  strokeLinejoin="round" strokeLinecap="round"
                  fill={`url(#${gradientId})`} isAnimationActive={false}
                />
                {markerYear != null && (
                  <ReferenceLine
                    x={markerYear} stroke={TEAL} strokeWidth={1.5} strokeDasharray="4 4"
                    label={{
                      value: markerAge != null ? `Retire ${markerAge}` : 'Retire',
                      position: 'insideTopLeft', fill: TEAL, fontSize: 10, fontWeight: 700,
                    }}
                  />
                )}
                {eventDots.map((e) => (
                  <ReferenceDot
                    key={e.year + e.name} x={e.year} y={e.value} r={5.5}
                    fill={BRAND} stroke="#232326" strokeWidth={4} isFront
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {footer}
      </div>
    </div>
  )
}
