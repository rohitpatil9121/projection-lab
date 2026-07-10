import { Link } from 'react-router-dom'
import { useStore } from '../data/store.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionTitle, StatCard, ProgressBar } from '../components/ui.jsx'

// ProjectionLab-style "Today" page — current finances at a glance, India edition.

const CATEGORIES = [
  { key: 'cash', label: 'Cash & FD', match: (a) => a.kind === 'asset' && a.type === 'cash', color: '#22c55e' },
  { key: 'invest', label: 'Investments', match: (a) => a.kind === 'asset' && a.type === 'investment', color: '#6366f1' },
  { key: 'retire', label: 'Retirement (EPF/PPF/NPS)', match: (a) => a.kind === 'asset' && a.type === 'retirement', color: '#8b5cf6' },
  { key: 'property', label: 'Property & Other', match: (a) => a.kind === 'asset' && (a.type === 'real-estate' || a.type === 'other'), color: '#f59e0b' },
  { key: 'debt', label: 'Loans & Debt', match: (a) => a.kind === 'liability', color: '#ef4444' },
]

function CategoryCard({ cat, accounts }) {
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
          <span className="text-sm font-bold truncate">{cat.label}</span>
        </div>
        <span className={`text-sm font-extrabold shrink-0 ${cat.key === 'debt' ? 'text-rose-600' : ''}`}>
          {fmtMoney(total, { compact: true })}
        </span>
      </div>
      {accounts.length ? (
        <div className="space-y-1.5">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs">
              <span className="text-ink-500 dark:text-ink-300 truncate">{a.name}</span>
              <span className="font-semibold shrink-0 ml-2">{fmtMoney(a.balance, { compact: true })}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-ink-400">Nothing here yet</div>
      )}
      <Link to="/accounts" className="block text-[11px] font-semibold text-brand-600 hover:text-brand-700 mt-3">
        Manage →
      </Link>
    </Card>
  )
}

function Priority({ icon, title, desc, done, progress }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`grid place-items-center h-9 w-9 rounded-xl text-base shrink-0 ${done ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-ink-100 dark:bg-ink-800'}`}>
        {done ? '✓' : icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${done ? 'text-emerald-600' : ''}`}>{title}</span>
          {done && <span className="chip bg-emerald-100 text-emerald-700 text-[10px]">Done</span>}
        </div>
        <p className="text-xs text-ink-400 mt-0.5 leading-snug">{desc}</p>
        {!done && progress != null && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1"><ProgressBar value={progress} max={100} color="#6366f1" /></div>
            <span className="text-[11px] font-semibold text-ink-400 w-8 text-right">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Today() {
  const profile = useStore((s) => s.profile)
  const accounts = useStore((s) => s.accounts)
  const incomes = useStore((s) => s.incomes)
  const expenses = useStore((s) => s.expenses)
  const contributions = useStore((s) => s.contributions)

  const age = profile.currentAge
  const active = (x) => (x.startAge ?? 0) <= age && age <= (x.endAge ?? 200)

  const assets = accounts.filter((a) => a.kind === 'asset')
  const liabilities = accounts.filter((a) => a.kind === 'liability')
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
  const totalLiab = liabilities.reduce((s, a) => s + a.balance, 0)
  const netWorth = totalAssets - totalLiab

  const yearlyIncome = incomes.filter(active).reduce((s, i) => s + i.amount, 0)
  const yearlyExpense = expenses.filter(active).reduce((s, e) => s + e.amount, 0)
  const yearlyInvesting = contributions.reduce((s, c) => s + c.amount, 0)
  const monthlyIncome = yearlyIncome / 12
  const monthlyExpense = yearlyExpense / 12
  const monthlyInvesting = yearlyInvesting / 12
  const monthlySurplus = monthlyIncome - monthlyExpense - monthlyInvesting
  const savingsRate = yearlyIncome > 0 ? ((yearlyIncome - yearlyExpense) / yearlyIncome) * 100 : 0

  // ---- India financial priorities ladder ----
  const cashTotal = assets.filter((a) => a.type === 'cash').reduce((s, a) => s + a.balance, 0)
  const emergencyTarget = monthlyExpense * 6
  const emergencyPct = emergencyTarget > 0 ? Math.min(100, (cashTotal / emergencyTarget) * 100) : 0

  const retirementAccounts = new Set(assets.filter((a) => a.type === 'retirement').map((a) => a.id))
  const retirementInvesting = contributions.some((c) => retirementAccounts.has(c.accountId) && c.amount > 0)
    || assets.some((a) => a.type === 'retirement' && a.balance > 0)

  const hasHealthCover = expenses.some((e) => e.section === '80D')
  const highInterestLoans = liabilities.filter((a) => (a.growth ?? 0) >= 0.12)
  const sipRunning = contributions.some((c) => c.amount > 0)

  const priorities = [
    {
      icon: '🛟', title: 'Emergency fund — 6 months of expenses',
      desc: `${fmtMoney(cashTotal, { compact: true })} of ${fmtMoney(emergencyTarget, { compact: true })} in cash/FD`,
      done: emergencyTarget > 0 && cashTotal >= emergencyTarget, progress: emergencyPct,
    },
    {
      icon: '🏥', title: 'Health insurance (Section 80D)',
      desc: hasHealthCover ? 'Health premium found in your expenses' : 'Add a health insurance premium in Cash Flow — protects savings and saves tax under 80D',
      done: hasHealthCover,
    },
    {
      icon: '🔥', title: 'Clear high-interest debt (>12%)',
      desc: highInterestLoans.length
        ? `${highInterestLoans.map((l) => l.name).join(', ')} — pay these off before investing more`
        : 'No high-interest loans — great!',
      done: highInterestLoans.length === 0,
    },
    {
      icon: '🏦', title: 'Retirement savings (EPF / PPF / NPS)',
      desc: retirementInvesting ? 'Retirement corpus building — 80C/80CCD(1B) benefits apply' : 'Start EPF/PPF/NPS — tax-free compounding under 80C & 80CCD(1B)',
      done: retirementInvesting,
    },
    {
      icon: '📈', title: 'Invest 20%+ of income',
      desc: `Savings rate: ${Math.round(savingsRate)}% of income (income minus expenses)`,
      done: savingsRate >= 20, progress: Math.min(100, (savingsRate / 20) * 100),
    },
    {
      icon: '💸', title: 'SIP running',
      desc: sipRunning ? `Investing ${fmtMoney(monthlyInvesting, { compact: true })}/month via SIP` : 'Set up a monthly SIP in Accounts — automate wealth building',
      done: sipRunning,
    },
  ]
  const doneCount = priorities.filter((p) => p.done).length

  return (
    <div className="space-y-6">
      {/* ---- Hero stats ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Net Worth Today" value={fmtMoney(netWorth, { compact: true })} sub="assets − loans" accent="brand" />
        <StatCard label="Total Assets" value={fmtMoney(totalAssets, { compact: true })} sub={`${assets.length} accounts`} accent="green" />
        <StatCard label="Total Loans" value={fmtMoney(totalLiab, { compact: true })} sub={liabilities.length ? `${liabilities.length} loans` : 'debt free 🎉'} accent="rose" />
        <StatCard label="Savings Rate" value={`${Math.round(savingsRate)}%`} sub="of income" accent="amber" />
      </div>

      {/* ---- Monthly cash flow strip ---- */}
      <Card>
        <SectionTitle title="This Month" subtitle="Where your money goes each month" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Income', v: monthlyIncome, tone: 'text-emerald-600' },
            { label: 'Expenses', v: monthlyExpense, tone: 'text-rose-600' },
            { label: 'Investing (SIP)', v: monthlyInvesting, tone: 'text-brand-600' },
            { label: 'Left Over', v: monthlySurplus, tone: monthlySurplus >= 0 ? 'text-emerald-600' : 'text-rose-600' },
          ].map((x) => (
            <div key={x.label} className="rounded-xl bg-ink-50 dark:bg-ink-800/60 px-4 py-3 text-center">
              <div className={`text-lg font-extrabold ${x.tone}`}>{fmtMoney(x.v, { compact: true })}</div>
              <div className="text-xs text-ink-400 font-medium mt-0.5">{x.label}/mo</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ---- Account categories ---- */}
        <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.key} cat={cat} accounts={accounts.filter(cat.match)} />
          ))}
        </div>

        {/* ---- Financial priorities ---- */}
        <Card className="lg:col-span-2">
          <SectionTitle title="Financial Priorities" subtitle={`${doneCount} of ${priorities.length} complete — the order that works in India`} />
          <div className="space-y-4">
            {priorities.map((p) => <Priority key={p.title} {...p} />)}
          </div>
        </Card>
      </div>
    </div>
  )
}
