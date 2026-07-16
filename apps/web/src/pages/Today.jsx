import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney, evaluateGoal } from '@projectlab/engine'
import { Card, SectionLabel, HeroCard, Ring } from '../components/ui.jsx'
import JourneyPanel from '../components/JourneyPanel.jsx'
import { IconChevron, IconTrend, IconPlan, IconAccounts, IconMilestone } from '../components/Icons.jsx'
import { goalColor } from '../utils/goalStatus.js'

// Colour language (brand palette).
const GREEN = '#469b88' // money in / assets / positive
const RED = '#e0533d'   // money out / liabilities / negative
const BRAND = '#377cc8' // primary / neutral

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

export default function Today() {
  const { projection, state } = useProjection()
  const profile = useStore((s) => s.profile)
  const accounts = useStore((s) => s.accounts)
  const contributions = useStore((s) => s.contributions)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const milestones = useStore((s) => s.milestones)
  const events = useStore((s) => s.events)
  const snapshots = useStore((s) => s.snapshots)
  const currentYear = useStore((s) => s.currentYear)

  // --- Net worth (all from the balances the user entered) ---
  const assetAccts = accounts.filter((a) => a.kind === 'asset')
  const totalAssets = assetAccts.reduce((s, a) => s + a.balance, 0)
  const totalLiab = accounts.filter((a) => a.kind === 'liability').reduce((s, a) => s + a.balance, 0)
  const netWorth = totalAssets - totalLiab

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

  // --- Goals summary (engine-evaluated, so status matches the Goals page) ---
  const goalRows = useMemo(
    () => milestones.map((m) => {
      const ev = evaluateGoal(m, { accounts, projection, profile, contributions, currentYear })
      return { m, ev, color: goalColor(ev) }
    }),
    [milestones, accounts, projection, profile, contributions, currentYear],
  )
  const goalsTotal = goalRows.length
  const goalsDone = goalRows.filter((r) => r.m.achieved || r.ev.progress >= 100).length
  const avgGoalPct = goalsTotal ? Math.round(goalRows.reduce((s, r) => s + r.ev.progress, 0) / goalsTotal) : 0

  // --- Wealth journey: net worth to retirement, with life events marked ---
  const journeyData = useMemo(
    () => projection
      .filter((r) => r.age <= profile.retirementAge)
      .map((r) => ({ year: r.year, age: r.age, value: r.netWorth })),
    [projection, profile.retirementAge],
  )
  const eventDots = useMemo(
    () => events.map((e) => ({ year: currentYear + (e.age - profile.currentAge), name: e.name })),
    [events, currentYear, profile.currentAge],
  )

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-4">
      {/* ---- Greeting ---- */}
      <div className="flex items-center justify-between">
        <div>
          <div className="section-label">Namaste,</div>
          <h1 className="text-[22px] font-extrabold tracking-tight whitespace-nowrap">{profile.name || 'Guest'}</h1>
        </div>
        <Link
          to="/milestones"
          className="grid place-items-center h-[42px] w-[42px] rounded-full border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-ink-500 hover:text-brand-600 transition-colors"
          aria-label="Goals"
        >
          <IconMilestone size={19} />
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
        <div className="money text-[38px] font-extrabold leading-[1.1] mt-1">{fmtMoney(netWorth, { compact: true })}</div>
        <div className="mt-[18px]">
          <SplitBar segments={[{ value: totalAssets, color: GREEN }, { value: totalLiab, color: RED }]} />
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} /> Assets
              </div>
              <div className="money text-[17px] font-extrabold mt-0.5">{fmtMoney(totalAssets, { compact: true })}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                Liabilities <span className="h-2 w-2 rounded-full" style={{ background: RED }} />
              </div>
              <div className="money text-[17px] font-extrabold mt-0.5">{fmtMoney(totalLiab, { compact: true })}</div>
            </div>
          </div>
        </div>
      </HeroCard>

      {/* ===== WEALTH JOURNEY ===== */}
      <JourneyPanel
        data={journeyData}
        valueLabel="Net worth"
        events={eventDots}
        gradientId="todayJourney"
        footer={
          <p className="mt-2 mb-0.5 px-1 text-[11px] italic text-[#8b8b93]">
            Projected net worth to age {profile.retirementAge}, from your income, investments &amp; growth rates.
          </p>
        }
      />

      {/* ===== INCOME vs OUTFLOW (this month) ===== */}
      <div>
        <SectionLabel action={<Link to="/cash-flow" className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600">Cash Flow</Link>}>
          Income vs Outflow · This Month
        </SectionLabel>
        <Card className="!p-4">
          <div className="flex items-center gap-3.5">
            <Ring pct={savingsRate} color={savingsRate >= 20 ? GREEN : BRAND} size={66} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Savings Rate</div>
              <div className="text-[13px] leading-[1.4] text-ink-500 dark:text-ink-300 mt-0.5">
                You keep <span className="font-extrabold" style={{ color: GREEN }}>{fmtMoney(leftover, { compact: true })}</span> of every month's income.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 py-2.5">
              <div className="money text-sm font-extrabold" style={{ color: GREEN }}>{fmtMoney(monthlyIncome, { compact: true })}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400 mt-0.5">Income</div>
            </div>
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 py-2.5">
              <div className="money text-sm font-extrabold" style={{ color: RED }}>{fmtMoney(monthlyExpense, { compact: true })}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400 mt-0.5">Spent</div>
            </div>
            <div className="rounded-2xl bg-brand-50 dark:bg-brand-500/10 py-2.5">
              <div className="money text-sm font-extrabold" style={{ color: leftover >= 0 ? BRAND : RED }}>{fmtMoney(leftover, { compact: true })}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400 mt-0.5">Left over</div>
            </div>
          </div>
          {monthlyInvesting > 0 && (
            <p className="text-[11px] text-ink-400 mt-3">
              Of that, <span className="font-bold text-brand-600 dark:text-brand-400">{fmtMoney(monthlyInvesting, { compact: true })}/mo</span> goes into SIPs &amp; investments.
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
            <Card interactive className="!p-[15px] flex items-center gap-3">
              <span className="grid place-items-center h-11 w-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 shrink-0"><IconPlan size={21} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[15px]">Plan</div>
                <div className="text-xs text-ink-400 mt-0.5">Retire at age {profile.retirementAge} · drag to test any future</div>
              </div>
              <IconChevron size={16} className="text-ink-300 shrink-0" />
            </Card>
          </Link>

          {/* Accounts */}
          <Link to="/accounts" className="block">
            <Card interactive className="!p-[15px] flex items-center gap-3">
              <span className="grid place-items-center h-11 w-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 shrink-0"><IconAccounts size={21} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[15px]">Accounts</div>
                <div className="text-xs text-ink-400 mt-0.5">{assetAccts.length} accounts · {fmtMoney(totalAssets, { compact: true })} in assets</div>
              </div>
              <IconChevron size={16} className="text-ink-300 shrink-0" />
            </Card>
          </Link>

          {/* Goals — the richer summary */}
          <Link to="/milestones" className="block">
            <Card interactive className="!p-[15px]">
              <div className="flex items-center gap-3">
                <Ring pct={avgGoalPct} color={GREEN} size={50} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[15px]">Goals</div>
                  <div className="text-xs text-ink-400 mt-0.5">{goalsDone} of {goalsTotal} complete · {avgGoalPct}% overall</div>
                </div>
                <IconChevron size={16} className="text-ink-300 shrink-0" />
              </div>
              {goalRows.length > 0 && (
                <div className="mt-3.5 flex flex-col gap-2.5">
                  {goalRows.slice(0, 3).map(({ m, ev, color }) => (
                    <div key={m.id}>
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-bold truncate">{m.name}</span>
                        <span className="money text-[11px] text-ink-400 shrink-0">
                          {fmtMoney(ev.current, { compact: true })} / {ev.isPayoff ? 'Pay off' : fmtMoney(m.target, { compact: true })}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                        <div className="h-full rounded-full transition-[width] duration-500 ease-out-expo"
                          style={{ width: `${ev.progress}%`, background: color }} />
                      </div>
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
