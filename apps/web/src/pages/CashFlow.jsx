import { useMemo } from 'react'
import { Sankey, ResponsiveContainer, Tooltip, Layer, Rectangle } from 'recharts'
import { useStore } from '../data/store.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionTitle } from '../components/ui.jsx'

// Custom node renderer with labels + value.
function SankeyNode({ x, y, width, height, index, payload, containerWidth }) {
  const isRight = x + width + 6 > containerWidth - 120
  const color = payload.color || '#6366f1'
  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} radius={3} fillOpacity={0.95} />
      <text
        x={isRight ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={isRight ? 'end' : 'start'}
        dominantBaseline="middle"
        className="fill-ink-600 dark:fill-ink-300"
        fontSize={12}
        fontWeight={600}
      >
        {payload.name}
      </text>
      <text
        x={isRight ? x - 8 : x + width + 8}
        y={y + height / 2 + 14}
        textAnchor={isRight ? 'end' : 'start'}
        dominantBaseline="middle"
        className="fill-ink-400"
        fontSize={10}
      >
        {fmtMoney(payload.value, { compact: true, sankey: true })}
      </text>
    </Layer>
  )
}

function SankeyLink(props) {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props
  return (
    <path
      key={`link-${index}`}
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={payload.target?.color || '#94a3b8'}
      strokeWidth={Math.max(1, linkWidth)}
      strokeOpacity={0.28}
    />
  )
}

export default function CashFlow() {
  const incomes = useStore((s) => s.incomes)
  const expenses = useStore((s) => s.expenses)
  const contributions = useStore((s) => s.contributions)
  const accounts = useStore((s) => s.accounts)
  const profile = useStore((s) => s.profile)

  // Build a balanced Sankey graph — inflows must equal outflows through Budget.
  const { data, totalIncome, totalExpense, totalSavings, deficit, surplus } = useMemo(() => {
    const activeIncomes = incomes.filter((i) => i.startAge <= profile.currentAge && i.endAge >= profile.currentAge)
    const activeExpenses = expenses.filter((e) => e.startAge <= profile.currentAge && e.endAge >= profile.currentAge)
    const savings = contributions.map((c) => ({
      name: accounts.find((a) => a.id === c.accountId)?.name || c.accountId,
      amount: c.amount,
      color: accounts.find((a) => a.id === c.accountId)?.color || '#22c55e',
    }))

    const totalIncome = activeIncomes.reduce((a, b) => a + b.amount, 0)
    const totalExpense = activeExpenses.reduce((a, b) => a + b.amount, 0)
    const totalSavings = savings.reduce((a, b) => a + b.amount, 0)
    const totalOut = totalExpense + totalSavings
    const deficit = Math.max(0, totalOut - totalIncome)
    const surplus = Math.max(0, totalIncome - totalOut)
    const budgetTotal = totalIncome + deficit

    const nodes = []
    const links = []
    const idx = {}
    const push = (name, color, value) => {
      idx[name] = nodes.length
      nodes.push({ name, color, value })
      return idx[name]
    }

    activeIncomes.forEach((i) => push(i.name, i.color, i.amount))
    if (deficit > 0) push('From savings (deficit)', '#f59e0b', deficit)
    const budgetIdx = push('Budget', '#4f46e5', budgetTotal)
    activeExpenses.forEach((e) => push(e.name, e.color, e.amount))
    savings.forEach((s) => push('→ ' + s.name, s.color, s.amount))
    if (surplus > 0) push('Surplus cash', '#22c55e', surplus)

    activeIncomes.forEach((i) => links.push({ source: idx[i.name], target: budgetIdx, value: i.amount }))
    if (deficit > 0) links.push({ source: idx['From savings (deficit)'], target: budgetIdx, value: deficit })
    activeExpenses.forEach((e) => links.push({ source: budgetIdx, target: idx[e.name], value: e.amount }))
    savings.forEach((s) => links.push({ source: budgetIdx, target: idx['→ ' + s.name], value: s.amount }))
    if (surplus > 0) links.push({ source: budgetIdx, target: idx['Surplus cash'], value: surplus })

    return { data: { nodes, links }, totalIncome, totalExpense, totalSavings, budgetTotal, deficit, surplus }
  }, [incomes, expenses, contributions, accounts, profile])

  const savingsRate = totalIncome ? Math.round((totalSavings / totalIncome) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Mini label="Total Income" value={fmtMoney(totalIncome)} color="#6366f1" />
        <Mini label="Total Expenses" value={fmtMoney(totalExpense)} color="#ef4444" />
        <Mini label="Savings / Investing" value={fmtMoney(totalSavings)} color="#22c55e" />
        <Mini label="Savings Rate" value={`${savingsRate}%`} color="#f59e0b" />
      </div>

      <Card>
        <SectionTitle
          title="Cash Flow — Sankey"
          subtitle={
            deficit > 0
              ? `Age ${profile.currentAge} · Income ${fmtMoney(totalIncome, { compact: true })} · ${fmtMoney(deficit, { compact: true })} shortfall covered from savings`
              : surplus > 0
                ? `Age ${profile.currentAge} · Income ${fmtMoney(totalIncome, { compact: true })} · ${fmtMoney(surplus, { compact: true })} surplus after expenses & investing`
                : `Where your money goes each year (age ${profile.currentAge})`
          }
        />
        <div className="overflow-x-auto">
          <div className="h-[440px] w-full min-w-[560px]">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
              node={<SankeyNode />}
              link={<SankeyLink />}
              nodePadding={26}
              nodeWidth={12}
              margin={{ top: 10, right: 130, bottom: 10, left: 10 }}
            >
              <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 24px rgba(15,23,42,0.12)' }} />
            </Sankey>
          </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BreakdownCard title="Income Sources" items={incomes} total={totalIncome} />
        <BreakdownCard title="Expense Categories" items={expenses} total={totalExpense} />
      </div>
    </div>
  )
}

function Mini({ label, value, color }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-400 uppercase tracking-wide">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}
      </div>
      <div className="mt-1.5 text-2xl font-extrabold tracking-tight">{value}</div>
    </div>
  )
}

function BreakdownCard({ title, items, total }) {
  return (
    <Card>
      <SectionTitle title={title} />
      <div className="space-y-3">
        {items.map((it) => {
          const pct = total ? Math.round((it.amount / total) * 100) : 0
          return (
            <div key={it.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-semibold flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />{it.name}
                </span>
                <span className="text-ink-500">{fmtMoney(it.amount)} · {pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: it.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
