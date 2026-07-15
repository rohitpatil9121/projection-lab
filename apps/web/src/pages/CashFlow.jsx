import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sankey, ResponsiveContainer, Tooltip, Layer, Rectangle } from 'recharts'
import { useStore, computeTaxSummary } from '../data/store.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionTitle } from '../components/ui.jsx'
import { IconPlus, IconTrash, IconChevron } from '../components/Icons.jsx'

const PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#a855f7', '#ec4899', '#f97316', '#84cc16', '#f43f5e']

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
        <Mini label="Income" value={fmtMoney(totalIncome)} color="#6366f1" />
        <Mini label="Expenses" value={fmtMoney(totalExpense)} color="#ef4444" />
        <Mini label="Investing" value={fmtMoney(totalSavings)} color="#22c55e" />
        <Mini label="Savings rate" value={`${savingsRate}%`} color="#f59e0b" />
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
        <BreakdownCard title="Income Sources" collection="incomes" items={incomes} total={totalIncome} kind="income" />
        <BreakdownCard title="Expense Categories" collection="expenses" items={expenses} total={totalExpense} kind="expense" />
      </div>

      <TaxSnapshotCard profile={profile} contributions={contributions} expenses={expenses} />
    </div>
  )
}

function TaxSnapshotCard({ profile, contributions, expenses }) {
  const summary = useMemo(
    () => computeTaxSummary({ profile, contributions, expenses }),
    [profile, contributions, expenses],
  )
  return (
    <Card>
      <SectionTitle
        title="Income Tax"
        subtitle={summary.ready ? `Estimated under the ${summary.regime} regime` : 'Set your gross salary to estimate tax'}
        action={
          <Link to="/tax" className="btn-ghost !py-1.5 text-sm flex items-center gap-0.5">
            Details <IconChevron size={14} />
          </Link>
        }
      />
      {summary.ready ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <div className="text-2xl font-extrabold tracking-tight tabular-nums">{fmtMoney(summary.current.tax)}</div>
            <div className="text-xs text-ink-400">this year · effective {(summary.current.effectiveRate * 100).toFixed(1)}%</div>
          </div>
          {summary.switchSavings > 0 && (
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Switching to the {summary.comparison.recommended} regime would save {fmtMoney(summary.switchSavings)}
            </div>
          )}
          {summary.nudges[0] && (
            <div className="text-sm text-ink-500">
              Invest {fmtMoney(summary.nudges[0].headroom)} more in {summary.nudges[0].hint} by {summary.nudges[0].deadline} → save {fmtMoney(summary.nudges[0].taxSaved)}
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-ink-400">
          Add your gross annual salary on the <Link to="/tax" className="text-brand-600 font-semibold">Tax page</Link> to compare the old vs new regime and track 80C/80D deductions.
        </div>
      )}
    </Card>
  )
}

function Mini({ label, value, color }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-400 uppercase tracking-wide">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} /><span>{label}</span>
      </div>
      <div className="mt-1.5 text-lg sm:text-2xl font-extrabold tracking-tight tabular-nums">{value}</div>
    </div>
  )
}

// Editable income / expense list: inline edit name + amount, delete, and an add form.
function BreakdownCard({ title, collection, items, total, kind }) {
  const profile = useStore((s) => s.profile)
  const updateItem = useStore((s) => s.updateItem)
  const removeItem = useStore((s) => s.removeItem)
  const addItem = useStore((s) => s.addItem)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', amount: '' })

  const save = () => {
    if (!draft.name.trim() || !(Number(draft.amount) > 0)) return
    addItem(collection, {
      name: draft.name.trim(),
      amount: Number(draft.amount),
      growth: kind === 'income' ? 0.07 : 0.06,
      startAge: profile.currentAge,
      endAge: kind === 'income' ? profile.retirementAge : 85,
      color: PALETTE[items.length % PALETTE.length],
    })
    setDraft({ name: '', amount: '' })
    setAdding(false)
  }

  return (
    <Card>
      <SectionTitle title={title} subtitle={`${items.length} ${kind === 'income' ? 'sources' : 'categories'}`}
        action={<button onClick={() => setAdding(!adding)} className="btn-primary !py-1.5"><IconPlus size={16} /> Add</button>} />

      {adding && (
        <div className="mb-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 dark:bg-brand-500/5 p-3 space-y-2">
          <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={kind === 'income' ? 'e.g. Freelance income' : 'e.g. Kids school fees'} className="input !py-1.5 text-sm" />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">₹</span>
              <input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                placeholder="Yearly amount" className="input !py-1.5 pl-7 text-sm" />
            </div>
            <button onClick={save} className="btn-primary !py-1.5 text-sm">Save</button>
            <button onClick={() => setAdding(false)} className="btn-ghost !py-1.5 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => {
          const pct = total ? Math.round((it.amount / total) * 100) : 0
          return (
            <div key={it.id} className="group">
              <div className="flex items-center justify-between text-sm mb-1 gap-2">
                <span className="font-semibold flex items-center gap-2 min-w-0 flex-1">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: it.color }} />
                  <input value={it.name} onChange={(e) => updateItem(collection, it.id, { name: e.target.value })}
                    className="bg-transparent outline-none min-w-0 flex-1 focus:text-brand-600" />
                </span>
                <span className="flex items-center gap-1 shrink-0 text-ink-500">
                  <span className="text-xs">₹</span>
                  <input type="number" value={it.amount} onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => updateItem(collection, it.id, { amount: Number(e.target.value) })}
                    className="w-[76px] text-right bg-transparent outline-none font-semibold tabular-nums focus:text-brand-600 [appearance:textfield]" />
                  <span className="text-xs text-ink-400 w-8 text-right">{pct}%</span>
                  <button onClick={() => removeItem(collection, it.id)} className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-rose-500 transition ml-1">
                    <IconTrash size={14} />
                  </button>
                </span>
              </div>
              <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: it.color }} />
              </div>
            </div>
          )
        })}
        {items.length === 0 && <div className="text-sm text-ink-400 py-2">Nothing yet — tap Add.</div>}
      </div>
    </Card>
  )
}
