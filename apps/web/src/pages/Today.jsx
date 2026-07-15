import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney, computeFitness, evaluateGoal } from '@projectlab/engine'
import { Card, SectionLabel, HeroCard } from '../components/ui.jsx'
import { FitnessRing } from '../components/Journey.jsx'
import { IconBell, IconChevron, IconTrend, IconPlan, IconAccounts, IconMilestone, IconDashboard } from '../components/Icons.jsx'

// Colour language, single source of truth (brand palette).
const GREEN = '#469b88' // money in / assets / positive (brand teal)
const RED = '#e0533d'   // money out / liabilities / negative (brand coral)
const BRAND = '#377cc8' // net worth / neutral (brand blue)

// "₹58.42 Lakh" style hero figure — bigger words than the compact chart format.
function bigMoney(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`
}

// A two-tone proportional bar. segments: [{ value, color }].
function SplitBar({ segments, height = 'h-3', track = 'bg-white/10' }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
  return (
    <div className={`flex ${height} w-full overflow-hidden rounded-full ${track}`}>
      {segments.map((s, i) => (
        <div
          key={i}
          className="h-full transition-[width] duration-500 ease-out first:rounded-l-full last:rounded-r-full"
          style={{ width: `${(Math.max(0, s.value) / total) * 100}%`, background: s.color }}
        />
      ))}
    </div>
  )
}

// A small conic-gradient ring with a % (or number) in the middle.
function MiniRing({ pct, color = BRAND, label, size = 52 }) {
  const p = Math.max(0, Math.min(100, pct))
  return (
    <div
      className="grid place-items-center rounded-full shrink-0"
      style={{ width: size, height: size, background: `conic-gradient(${color} ${p * 3.6}deg, rgba(148,163,184,0.18) 0deg)` }}
    >
      <div className="grid place-items-center rounded-full bg-white dark:bg-ink-900" style={{ width: size - 12, height: size - 12 }}>
        <span className="text-xs font-extrabold tabular-nums">{label}</span>
      </div>
    </div>
  )
}

export default function Today() {
  const { projection, readiness, state } = useProjection()
  const profile = useStore((s) => s.profile)
  const accounts = useStore((s) => s.accounts)
  const contributions = useStore((s) => s.contributions)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const milestones = useStore((s) => s.milestones)
  const snapshots = useStore((s) => s.snapshots)

  const fitness = useMemo(() => computeFitness(state, projection, readiness), [state, projection, readiness])

  const assetAccts = accounts.filter((a) => a.kind === 'asset')
  const totalAssets = assetAccts.reduce((s, a) => s + a.balance, 0)
  const totalLiab = accounts.filter((a) => a.kind === 'liability').reduce((s, a) => s + a.balance, 0)
  const netWorth = totalAssets - totalLiab

  const cashTotal = assetAccts.filter((a) => a.type === 'cash').reduce((s, a) => s + a.balance, 0)
  const investTotal = assetAccts.filter((a) => a.type === 'investment' || a.type === 'retirement').reduce((s, a) => s + a.balance, 0)
  const propertyTotal = assetAccts.filter((a) => a.type === 'real-estate' || a.type === 'other').reduce((s, a) => s + a.balance, 0)

  // Month-over-month net-worth change from real snapshots.
  const momPct = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => (a.ym < b.ym ? -1 : 1))
    if (sorted.length < 2) return null
    const prev = sorted[sorted.length - 2].netWorth
    if (!(Math.abs(prev) > 0)) return null
    return ((sorted[sorted.length - 1].netWorth - prev) / Math.abs(prev)) * 100
  }, [snapshots])

  // Monthly cash flow.
  const age = profile.currentAge
  const activeNow = (x) => (x.startAge ?? 0) <= age && age <= (x.endAge ?? 200)
  const monthlyIncome = incomes.filter(activeNow).reduce((s, i) => s + i.amount, 0) / 12
  const monthlyExpense = expenses.filter(activeNow).reduce((s, e) => s + e.amount, 0) / 12
  const monthlyInvesting = contributions.reduce((s, c) => s + c.amount, 0) / 12
  const leftover = monthlyIncome - monthlyExpense
  const savingsRate = monthlyIncome > 0 ? Math.round((leftover / monthlyIncome) * 100) : 0

  // Net-worth trend to retirement.
  const journeyData = useMemo(
    () => projection.filter((r) => r.age <= profile.retirementAge).map((r) => ({ year: r.year, netWorth: r.netWorth })),
    [projection, profile.retirementAge],
  )

  // ---- Page summaries ----
  // Goals
  const goalRows = useMemo(() => {
    const ctx = { accounts, projection, profile, contributions, currentYear: state.currentYear }
    return milestones.map((m) => ({ m, ...evaluateGoal(m, ctx) }))
  }, [milestones, accounts, projection, profile, contributions, state.currentYear])
  const goalsTotal = goalRows.length
  const goalsOnTrack = goalRows.filter((r) => r.m.achieved || r.progress >= 100 || r.track === 'ahead' || r.track === 'on-track').length
  const avgGoalProgress = goalsTotal ? Math.round(goalRows.reduce((s, r) => s + Math.min(100, r.progress || 0), 0) / goalsTotal) : 0

  // Plan / Dashboard
  const retireNetWorth = readiness?.retireNetWorth ?? 0
  const readinessScore = readiness?.score ?? 0

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-4">
      {/* ---- Greeting ---- */}
      <div className="flex items-center justify-between">
        <div>
          <div className="section-label">Namaste,</div>
          <h1 className="text-xl font-extrabold tracking-tight">{profile.name || 'Guest'}</h1>
        </div>
        <Link to="/milestones" className="grid place-items-center h-10 w-10 rounded-full border border-ink-200 dark:border-ink-700 text-ink-500 hover:text-brand-600 transition-colors" aria-label="Goals & moments">
          <IconBell size={18} />
        </Link>
      </div>

      {/* ===== 1. NET WORTH HERO (assets green / liabilities red) ===== */}
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

      {/* ===== 2. WEALTH JOURNEY ===== */}
      <div>
        <SectionLabel action={<Link to="/monte-carlo" className="text-xs font-bold text-brand-600 uppercase tracking-wide">Forecast</Link>}>
          Wealth Journey
        </SectionLabel>
        <Card className="!p-3">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={journeyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.24} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={44}
                  tickFormatter={(v) => fmtMoney(v, { compact: true }).replace('₹', '')} />
                <Tooltip formatter={(v) => fmtMoney(v)} labelFormatter={(y) => `Year ${y}`}
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 24px rgba(15,23,42,0.12)' }} />
                <Area type="monotone" dataKey="netWorth" stroke={BRAND} strokeWidth={2.5} fill="url(#nwFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between px-1 pb-0.5">
            <p className="text-[11px] text-ink-400 italic">Projected net worth to age {profile.retirementAge}</p>
            <Link to="/plan" className="text-[11px] font-bold text-brand-600">Open Plan →</Link>
          </div>
        </Card>
      </div>

      {/* ===== 3. INCOME vs OUTFLOW (this month) ===== */}
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

          {/* proportional bar: expenses (red) + leftover (green) = income */}
          <div className="mt-4">
            <SplitBar
              segments={[{ value: monthlyExpense, color: RED }, { value: Math.max(0, leftover), color: GREEN }]}
              track="bg-ink-100 dark:bg-ink-800"
            />
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

      {/* ===== 4. FINANCIAL FITNESS ===== */}
      <div>
        <SectionLabel action={<Link to="/milestones" className="text-xs font-bold text-brand-600 uppercase tracking-wide">Full View</Link>}>
          Financial Fitness
        </SectionLabel>
        <Link to="/milestones" className="block">
          <Card interactive className="!p-4 flex items-center gap-4">
            <FitnessRing score={fitness.score} size={72} stroke={12} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">{fitness.band}</span>
                <span className={`chip text-[10px] uppercase tracking-wide ${fitness.score >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'}`}>
                  {fitness.score}/100
                </span>
              </div>
              <p className="text-xs text-ink-400 mt-1 leading-snug">
                {fitness.dimensions.find((d) => d.hint)?.hint || 'All five dimensions look healthy — keep it up!'}
              </p>
            </div>
            <IconChevron size={16} className="text-ink-300 shrink-0" />
          </Card>
        </Link>
      </div>

      {/* ===== 5. PAGE SUMMARY CARDS ===== */}
      <div>
        <SectionLabel>Your Plan at a Glance</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {/* Plan */}
          <PageCard to="/plan" Icon={IconPlan} title="Plan">
            <div className="money text-lg font-extrabold" style={{ color: GREEN }}>{fmtMoney(retireNetWorth, { compact: true })}</div>
            <div className="text-[11px] text-ink-400 leading-tight mt-0.5">projected by age {profile.retirementAge}</div>
          </PageCard>

          {/* Accounts */}
          <PageCard to="/accounts" Icon={IconAccounts} title="Accounts">
            <div className="money text-lg font-extrabold">{fmtMoney(totalAssets, { compact: true })}</div>
            <div className="mt-1.5">
              <SplitBar
                height="h-2"
                track="bg-ink-100 dark:bg-ink-800"
                segments={[
                  { value: cashTotal, color: GREEN },
                  { value: investTotal, color: BRAND },
                  { value: propertyTotal, color: '#eed868' },
                ]}
              />
            </div>
            <div className="text-[11px] text-ink-400 leading-tight mt-1">{assetAccts.length} assets across classes</div>
          </PageCard>

          {/* Goals */}
          <PageCard to="/milestones" Icon={IconMilestone} title="Goals">
            <div className="flex items-center gap-2.5">
              <MiniRing pct={avgGoalProgress} color={GREEN} label={`${avgGoalProgress}%`} size={44} />
              <div className="min-w-0">
                <div className="text-sm font-extrabold leading-none">{goalsOnTrack}/{goalsTotal}</div>
                <div className="text-[11px] text-ink-400 leading-tight mt-0.5">on track</div>
              </div>
            </div>
          </PageCard>

          {/* Dashboard */}
          <PageCard to="/dashboard" Icon={IconDashboard} title="Dashboard">
            <div className="flex items-center gap-2.5">
              <MiniRing pct={readinessScore} color={readinessScore >= 70 ? GREEN : readinessScore >= 40 ? BRAND : RED} label={`${readinessScore}`} size={44} />
              <div className="min-w-0">
                <div className="text-sm font-extrabold leading-none">{readiness?.success ? 'On track' : 'Needs work'}</div>
                <div className="text-[11px] text-ink-400 leading-tight mt-0.5">retirement readiness</div>
              </div>
            </div>
          </PageCard>
        </div>
      </div>
    </div>
  )
}

// Compact tap-through summary tile for one page.
function PageCard({ to, Icon, title, children }) {
  return (
    <Link to={to} className="block">
      <Card interactive className="!p-3.5 h-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center h-7 w-7 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <Icon size={15} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-ink-500 dark:text-ink-300">{title}</span>
          </div>
          <IconChevron size={14} className="text-ink-300" />
        </div>
        {children}
      </Card>
    </Link>
  )
}
