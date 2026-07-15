import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionLabel, HeroCard } from '../components/ui.jsx'
import { IconChevron, IconTrend, IconPlan, IconAccounts, IconMilestone } from '../components/Icons.jsx'

// Colour language (brand palette).
const GREEN = '#469b88' // money in / assets / positive
const RED = '#e0533d'   // money out / liabilities / negative
const BRAND = '#377cc8' // primary / neutral

function bigMoney(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`
}

// Two-tone proportional bar.
function SplitBar({ segments, height = 'h-3', track = 'bg-white/10' }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
  return (
    <div className={`flex ${height} w-full overflow-hidden rounded-full ${track}`}>
      {segments.map((s, idx) => (
        <div key={idx} className="h-full transition-[width] duration-500 ease-out first:rounded-l-full last:rounded-r-full"
          style={{ width: `${(Math.max(0, s.value) / total) * 100}%`, background: s.color }} />
      ))}
    </div>
  )
}

// Ring with a % in the middle (conic gradient).
function MiniRing({ pct, color = BRAND, label, size = 56 }) {
  const p = Math.max(0, Math.min(100, pct))
  return (
    <div className="grid place-items-center rounded-full shrink-0"
      style={{ width: size, height: size, background: `conic-gradient(${color} ${p * 3.6}deg, rgba(148,163,184,0.18) 0deg)` }}>
      <div className="grid place-items-center rounded-full bg-white dark:bg-ink-900" style={{ width: size - 12, height: size - 12 }}>
        <span className="text-xs font-extrabold tabular-nums">{label}</span>
      </div>
    </div>
  )
}

export default function Today() {
  const profile = useStore((s) => s.profile)
  const accounts = useStore((s) => s.accounts)
  const contributions = useStore((s) => s.contributions)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const milestones = useStore((s) => s.milestones)
  const events = useStore((s) => s.events)
  const snapshots = useStore((s) => s.snapshots)

  // --- Net worth (all from the balances the user entered) ---
  const assetAccts = accounts.filter((a) => a.kind === 'asset')
  const totalAssets = assetAccts.reduce((s, a) => s + a.balance, 0)
  const totalLiab = accounts.filter((a) => a.kind === 'liability').reduce((s, a) => s + a.balance, 0)
  const netWorth = totalAssets - totalLiab
  const cashTotal = assetAccts.filter((a) => a.type === 'cash').reduce((s, a) => s + a.balance, 0)
  const investTotal = assetAccts.filter((a) => a.type === 'investment' || a.type === 'retirement').reduce((s, a) => s + a.balance, 0)
  const propertyTotal = assetAccts.filter((a) => a.type === 'real-estate' || a.type === 'other').reduce((s, a) => s + a.balance, 0)

  // Month-over-month change from the user's recorded snapshots.
  const momPct = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => (a.ym < b.ym ? -1 : 1))
    if (sorted.length < 2) return null
    const prev = sorted[sorted.length - 2].netWorth
    if (!(Math.abs(prev) > 0)) return null
    return ((sorted[sorted.length - 1].netWorth - prev) / Math.abs(prev)) * 100
  }, [snapshots])

  // --- Monthly cash flow (from income/expense the user entered) ---
  const age = profile.currentAge
  const activeNow = (x) => (x.startAge ?? 0) <= age && age <= (x.endAge ?? 200)
  const monthlyIncome = incomes.filter(activeNow).reduce((s, i) => s + i.amount, 0) / 12
  const monthlyExpense = expenses.filter(activeNow).reduce((s, e) => s + e.amount, 0) / 12
  const monthlyInvesting = contributions.reduce((s, c) => s + c.amount, 0) / 12
  const leftover = monthlyIncome - monthlyExpense
  const savingsRate = monthlyIncome > 0 ? Math.round((leftover / monthlyIncome) * 100) : 0

  // --- Goals summary (current value vs target — both from user input, no projection) ---
  const currentFor = (m) => {
    if (m.accountId) return accounts.find((a) => a.id === m.accountId)?.balance ?? 0
    if (m.metric === 'investable') return investTotal
    return netWorth
  }
  const goalRows = milestones.map((m) => {
    const target = m.target || 0
    const cur = currentFor(m)
    const pct = m.achieved ? 100 : target > 0 ? Math.min(100, Math.round((cur / target) * 100)) : (m.achieved ? 100 : 0)
    return { m, cur, target, pct }
  })
  const goalsTotal = goalRows.length
  const goalsDone = goalRows.filter((r) => r.m.achieved || r.pct >= 100).length
  const avgGoalPct = goalsTotal ? Math.round(goalRows.reduce((s, r) => s + r.pct, 0) / goalsTotal) : 0

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-4">
      {/* ---- Greeting ---- */}
      <div className="flex items-center justify-between">
        <div>
          <div className="section-label">Namaste,</div>
          <h1 className="text-xl font-extrabold tracking-tight">{profile.name || 'Guest'}</h1>
        </div>
        <Link to="/milestones" className="grid place-items-center h-10 w-10 rounded-full border border-ink-200 dark:border-ink-700 text-ink-500 hover:text-brand-600 transition-colors" aria-label="Goals">
          <IconMilestone size={18} />
        </Link>
      </div>

      {/* ===== NET WORTH HERO (assets green / liabilities red) ===== */}
      <HeroCard>
        <div className="flex items-start justify-between gap-3">
          <div className="section-label !text-ink-300">Total Net Worth</div>
          {momPct != null && (
            <span className={`chip ${momPct >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              <IconTrend size={13} /> {momPct >= 0 ? '+' : ''}{momPct.toFixed(1)}% <span className="opacity-70 font-medium">MoM</span>
            </span>
          )}
        </div>
        <div className="money text-4xl font-extrabold leading-tight mt-1">{bigMoney(netWorth)}</div>
        <div className="mt-5">
          <SplitBar segments={[{ value: totalAssets, color: GREEN }, { value: totalLiab, color: RED }]} />
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} /> Assets
              </div>
              <div className="money text-lg font-extrabold mt-0.5">{fmtMoney(totalAssets, { compact: true })}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-300">
                Liabilities <span className="h-2 w-2 rounded-full" style={{ background: RED }} />
              </div>
              <div className="money text-lg font-extrabold mt-0.5">{fmtMoney(totalLiab, { compact: true })}</div>
            </div>
          </div>
        </div>
      </HeroCard>

      {/* ===== INCOME vs OUTFLOW (this month) ===== */}
      <div>
        <SectionLabel action={<Link to="/cash-flow" className="text-xs font-bold text-brand-600 uppercase tracking-wide">Cash Flow</Link>}>
          Income vs Outflow · This Month
        </SectionLabel>
        <Card className="!p-4">
          <div className="flex items-center gap-4">
            <MiniRing pct={savingsRate} color={savingsRate >= 20 ? GREEN : savingsRate >= 0 ? BRAND : RED} label={`${savingsRate}%`} size={64} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-400">Savings Rate</div>
              <div className="text-sm text-ink-500 dark:text-ink-300 mt-0.5">
                You keep <span className="font-extrabold" style={{ color: GREEN }}>{fmtMoney(leftover, { compact: true })}</span> of every month's income.
              </div>
            </div>
          </div>
          <div className="mt-4">
            <SplitBar segments={[{ value: monthlyExpense, color: RED }, { value: Math.max(0, leftover), color: GREEN }]} track="bg-ink-100 dark:bg-ink-800" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 py-2.5">
              <div className="money text-sm font-extrabold" style={{ color: GREEN }}>{fmtMoney(monthlyIncome, { compact: true })}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400 mt-0.5">Income in</div>
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 py-2.5">
              <div className="money text-sm font-extrabold" style={{ color: RED }}>{fmtMoney(monthlyExpense, { compact: true })}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400 mt-0.5">Spent</div>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 py-2.5">
              <div className="money text-sm font-extrabold" style={{ color: leftover >= 0 ? GREEN : RED }}>{fmtMoney(leftover, { compact: true })}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400 mt-0.5">Left over</div>
            </div>
          </div>
          {monthlyInvesting > 0 && (
            <p className="text-[11px] text-ink-400 mt-3">
              Of that, <span className="font-bold text-brand-600 dark:text-brand-400">{fmtMoney(monthlyInvesting, { compact: true })}/mo</span> goes into SIPs & investments.
            </p>
          )}
        </Card>
      </div>

      {/* ===== WHERE TO NEXT — the 3 destinations (Plan / Accounts / Goals) ===== */}
      <div>
        <SectionLabel>Where to next</SectionLabel>
        <div className="space-y-3">
          {/* Plan */}
          <Link to="/plan" className="block">
            <Card interactive className="!p-4 flex items-center gap-3">
              <span className="grid place-items-center h-11 w-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 shrink-0"><IconPlan size={20} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">Plan</div>
                <div className="text-xs text-ink-400 mt-0.5">Retire at age {profile.retirementAge} · {events.length} life {events.length === 1 ? 'event' : 'events'} planned</div>
              </div>
              <IconChevron size={16} className="text-ink-300 shrink-0" />
            </Card>
          </Link>

          {/* Accounts */}
          <Link to="/accounts" className="block">
            <Card interactive className="!p-4">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center h-11 w-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 shrink-0"><IconAccounts size={20} /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">Accounts</div>
                  <div className="text-xs text-ink-400 mt-0.5">{assetAccts.length} accounts · {fmtMoney(totalAssets, { compact: true })} in assets</div>
                </div>
                <IconChevron size={16} className="text-ink-300 shrink-0" />
              </div>
              {totalAssets > 0 && (
                <div className="mt-3">
                  <SplitBar height="h-2" track="bg-ink-100 dark:bg-ink-800"
                    segments={[{ value: cashTotal, color: GREEN }, { value: investTotal, color: BRAND }, { value: propertyTotal, color: '#eed868' }]} />
                </div>
              )}
            </Card>
          </Link>

          {/* Goals — the richer summary */}
          <Link to="/milestones" className="block">
            <Card interactive className="!p-4">
              <div className="flex items-center gap-3">
                <MiniRing pct={avgGoalPct} color={GREEN} label={`${avgGoalPct}%`} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">Goals</div>
                  <div className="text-xs text-ink-400 mt-0.5">{goalsDone} of {goalsTotal} complete · {avgGoalPct}% overall</div>
                </div>
                <IconChevron size={16} className="text-ink-300 shrink-0" />
              </div>
              {goalRows.length > 0 && (
                <div className="mt-3 space-y-2">
                  {goalRows.slice(0, 3).map((r) => (
                    <div key={r.m.id}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold truncate mr-2">{r.m.name}</span>
                        <span className="money text-ink-400 shrink-0">{fmtMoney(r.cur, { compact: true })} / {fmtMoney(r.target, { compact: true })}</span>
                      </div>
                      <SplitBar height="h-1.5" track="bg-ink-100 dark:bg-ink-800"
                        segments={[{ value: r.pct, color: r.pct >= 100 ? GREEN : BRAND }, { value: 100 - r.pct, color: 'transparent' }]} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
