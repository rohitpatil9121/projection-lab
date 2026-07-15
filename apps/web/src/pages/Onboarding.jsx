import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../data/store.js'
import { PERSONAS } from '../data/personas.js'
import CasImport from '../components/CasImport.jsx'
import { IconTrend } from '../components/Icons.jsx'

const L = 100000 // ₹1 lakh

// Progress dots — active step is a wide brand bar. Tap targets are ≥44px via padding.
function Dots({ count, index, className = '' }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all duration-300 ${i === index ? 'h-1.5 w-6 bg-brand-600' : 'h-1.5 w-1.5 bg-ink-200 dark:bg-ink-700'}`}
        />
      ))}
    </div>
  )
}

function Num({ label, hint, value, onChange, suffix }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</span>
      <div className="relative mt-1">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input pr-16"
          placeholder="0"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400">{suffix}</span>}
      </div>
      {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
    </label>
  )
}

// Selectable card (ProjectionLab-style) with check badge.
function ChoiceCard({ selected, onClick, icon, title, desc, meta }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left rounded-2xl border p-4 transition w-full ${
        selected
          ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10 ring-1 ring-brand-500'
          : 'border-ink-200 dark:border-ink-700 hover:border-brand-300'
      }`}
    >
      {selected && (
        <span className="absolute top-2.5 right-2.5 grid place-items-center h-5 w-5 rounded-full bg-brand-600 text-white text-[11px] font-bold">✓</span>
      )}
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center h-9 w-9 rounded-xl bg-ink-100 dark:bg-ink-800 text-lg shrink-0">{icon}</span>
        <span className="font-bold text-sm">{title}</span>
      </div>
      <p className="text-xs text-ink-400 mt-2 leading-snug">{desc}</p>
      {meta && <p className="text-[11px] font-semibold text-brand-600 mt-2">🕒 {meta}</p>}
    </button>
  )
}

const HAVE_OPTIONS = [
  { key: 'savings', icon: '💰', title: 'Savings', desc: 'Cash, savings account, fixed deposits.' },
  { key: 'investments', icon: '📈', title: 'Investments', desc: 'Mutual funds, stocks, EPF, PPF, NPS.' },
  { key: 'realAssets', icon: '🏠', title: 'Real Assets', desc: 'House, plot, car — things you own.' },
  { key: 'debt', icon: '💳', title: 'Debt', desc: 'Home / car / personal / education loans.' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const isNewScenario = !!state?.newScenario
  const completeOnboarding = useStore((s) => s.completeOnboarding)

  // The dark brand-tile Landing is the only splash. The wizard starts straight
  // at `about` (walkthrough) or `persona` (sandbox / sample data).
  const [step, setStep] = useState('about')
  const [mode, setMode] = useState('walkthrough')
  const [personaId, setPersonaId] = useState(null)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [currentAge, setCurrentAge] = useState('30')
  const [retirementAge, setRetirementAge] = useState('60')

  const [have, setHave] = useState({ savings: true, investments: false, realAssets: false, debt: false })

  const [salary, setSalary] = useState('')
  const [expense, setExpense] = useState('')
  const [sip, setSip] = useState('')

  const [savings, setSavings] = useState('')
  const [equity, setEquity] = useState('')
  const [casFunds, setCasFunds] = useState(null) // [{name, value}] from CAS PDF
  const [retirementBal, setRetirementBal] = useState('')
  const [property, setProperty] = useState('')
  const [loan, setLoan] = useState('')
  const [emi, setEmi] = useState('')
  const [emiYears, setEmiYears] = useState('10')

  const n = (v) => Math.max(0, Number(v) || 0)

  const WALK_STEPS = ['about', 'have', 'income', 'balances']
  const stepList = mode === 'sandbox' ? ['persona'] : WALK_STEPS
  const stepIndex = Math.max(0, stepList.indexOf(step))

  // Jump into sample-data (sandbox) mode from the first step.
  const useSampleData = () => { setError(''); setMode('sandbox'); setStep('persona') }
  const exitSandbox = () => { setError(''); setMode('walkthrough'); setStep('about') }

  function goNext() {
    setError('')
    if (step === 'about') {
      const age = n(currentAge), ret = n(retirementAge)
      if (!name.trim()) return setError('Please enter your name')
      if (age < 18 || age > 80) return setError('Age should be between 18 and 80')
      if (ret <= age) return setError('Retirement age must be more than current age')
      setStep('have')
      return
    }
    if (step === 'have') { setStep('income'); return }
    if (step === 'income') {
      if (n(salary) <= 0) return setError('Please enter your monthly take-home income')
      if (n(expense) <= 0) return setError('Please enter your monthly expenses')
      setStep('balances')
      return
    }
  }

  function goBack() {
    setError('')
    if (step === 'persona') { exitSandbox(); return }
    const i = WALK_STEPS.indexOf(step)
    if (i > 0) setStep(WALK_STEPS[i - 1])
    else navigate(-1) // first step → back to the splash / previous screen
  }

  function confirmPersona() {
    const p = PERSONAS.find((x) => x.id === personaId)
    if (!p) return setError('Choose a persona to continue')
    const { profile, accounts, incomes, expenses, contributions, milestones, events } = p
    completeOnboarding(profile, { accounts, incomes, expenses, contributions, milestones, events })
    navigate('/', { replace: true })
  }

  function finish() {
    setError('')
    const age = n(currentAge), ret = n(retirementAge)
    const yearlySalary = n(salary) * 12
    const yearlyExpense = n(expense) * 12
    const yearlySip = n(sip) * 12
    const loanBal = have.debt ? n(loan) : 0
    const yearlyEmi = have.debt ? n(emi) * 12 : 0

    const FUND_COLORS = ['#377cc8', '#9da7d0', '#469b88', '#9da7d0', '#e78c9d', '#eed868', '#469b88', '#06b6d4']
    const accounts = []
    if (have.savings && n(savings) > 0) accounts.push({ id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: n(savings), growth: 0.04, color: '#469b88' })
    if (have.investments && casFunds?.length) {
      // One account per fund imported from the CAS statement (SIP routes to the largest).
      casFunds.forEach((f, i) => {
        accounts.push({ id: i === 0 ? 'equity' : 'mf' + i, name: f.name, type: 'investment', kind: 'asset', balance: f.value, growth: 0.12, color: FUND_COLORS[i % FUND_COLORS.length] })
      })
    } else if ((have.investments && n(equity) > 0) || yearlySip > 0) {
      accounts.push({ id: 'equity', name: 'Mutual Funds / Stocks', type: 'investment', kind: 'asset', balance: have.investments ? n(equity) : 0, growth: 0.12, color: '#377cc8' })
    }
    if (have.investments && n(retirementBal) > 0) accounts.push({ id: 'retirement', name: 'EPF / PPF / NPS', type: 'retirement', kind: 'asset', balance: n(retirementBal), growth: 0.08, color: '#9da7d0' })
    if (have.realAssets && n(property) > 0) accounts.push({ id: 'property', name: 'House / Property', type: 'real-estate', kind: 'asset', balance: n(property), growth: 0.06, color: '#eed868' })
    if (loanBal > 0) accounts.push({ id: 'loan', name: 'Loans', type: 'loan', kind: 'liability', balance: loanBal, growth: 0.09, payoff: yearlyEmi > 0 ? Math.min(1, yearlyEmi / loanBal) : 0.1, color: '#e0533d' })

    const incomes = [
      { id: 'salary', name: 'Salary (take-home)', amount: yearlySalary, growth: 0.07, startAge: age, endAge: ret, color: '#377cc8' },
    ]

    const expenses = [
      { id: 'living', name: 'Household & Living', amount: yearlyExpense, growth: 0.06, startAge: age, endAge: 85, color: '#e0533d' },
    ]
    if (yearlyEmi > 0) expenses.push({ id: 'emi', name: 'Loan EMI', amount: yearlyEmi, growth: 0, startAge: age, endAge: age + n(emiYears), color: '#eed868' })

    const contributions = []
    if (yearlySip > 0) contributions.push({ id: 'c-sip', accountId: 'equity', amount: yearlySip, section: null })

    const milestones = [
      { id: 'm-emergency', name: 'Emergency Fund (6 months)', target: n(expense) * 6, accountId: accounts.find((a) => a.id === 'savings') ? 'savings' : undefined, metric: accounts.find((a) => a.id === 'savings') ? undefined : 'netWorth', icon: '🛟', achieved: n(savings) >= n(expense) * 6 },
      { id: 'm-crore', name: 'First ₹1 Crore Net Worth', target: 100 * L, metric: 'netWorth', icon: '💎', achieved: false },
    ]
    if (loanBal > 0) milestones.push({ id: 'm-loanfree', name: 'Loan Free', target: 0, accountId: 'loan', icon: '🏠', achieved: false })

    const events = [
      { id: 'e-retire', name: 'Retire', age: ret, amount: 0, icon: '🌴', color: '#469b88' },
    ]

    completeOnboarding(
      { name: name.trim(), currentAge: age, retirementAge: ret },
      { accounts, incomes, expenses, contributions, milestones, events },
    )
    navigate('/', { replace: true })
  }

  const headings = {
    persona: { badge: 'SANDBOX', title: 'Choose an example persona.', sub: 'Each one includes a full plan so you can see how Financial Blueprint works when everything is populated.' },
    about: { badge: 'ABOUT YOU', title: "Let's get started:", sub: "Update your basic information below. On the following screens, you'll begin building your plan for the future." },
    have: { badge: 'CURRENT FINANCES', title: 'Which of these do you have today?', sub: 'This will help refine the initial conditions for your plan — everything can be adjusted later.' },
    income: { badge: 'CASH FLOW', title: 'Income & spending', sub: 'Rough monthly numbers are fine — you can edit everything later.' },
    balances: { badge: 'BALANCES', title: 'What you own & owe', sub: 'Approximate current balances. Leave blank if not applicable.' },
  }
  const h = headings[step]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-ink-50 dark:bg-ink-950">
      <div className={`card w-full shadow-soft ${step === 'persona' ? 'max-w-2xl' : 'max-w-lg'}`}>
        {/* Header — logo dot, wizard title, progress dots */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center h-8 w-8 rounded-full bg-brand-600 text-white">
              <IconTrend size={15} />
            </span>
            <h2 className="text-sm font-extrabold tracking-tight">{isNewScenario ? 'New plan setup' : 'Setup'}</h2>
          </div>
          <Dots count={stepList.length} index={stepIndex} />
        </div>
        <div className="mb-4">
          <span className="chip bg-brand-100 text-brand-700 dark:bg-brand-500/15 text-[10px] tracking-wider">{h.badge}</span>
        </div>

        <h1 className="text-lg font-extrabold tracking-tight">{h.title}</h1>
        <p className="text-sm text-ink-400 mt-1 mb-5 leading-snug">{h.sub}</p>

        {/* ---- Step bodies ---- */}
        {step === 'persona' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[46vh] overflow-y-auto pr-1">
            {PERSONAS.map((p) => (
              <ChoiceCard
                key={p.id}
                selected={personaId === p.id}
                onClick={() => setPersonaId(p.id)}
                icon={p.icon} title={p.title} desc={p.desc}
              />
            ))}
          </div>
        )}

        {step === 'about' && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohit" className="input mt-1" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Num label="Current age" value={currentAge} onChange={setCurrentAge} suffix="yrs" />
              <Num label="Retirement age" value={retirementAge} onChange={setRetirementAge} suffix="yrs" />
            </div>
            <div className="rounded-xl bg-ink-50 dark:bg-ink-800/60 px-4 py-3 flex items-center justify-between text-sm">
              <span className="font-semibold flex items-center gap-2">🇮🇳 India</span>
              <span className="text-ink-400 text-xs">₹ Indian Rupee · lakh/crore</span>
            </div>
          </div>
        )}

        {step === 'have' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HAVE_OPTIONS.map((o) => (
              <ChoiceCard
                key={o.key}
                selected={have[o.key]}
                onClick={() => setHave((h) => ({ ...h, [o.key]: !h[o.key] }))}
                icon={o.icon} title={o.title} desc={o.desc}
              />
            ))}
          </div>
        )}

        {step === 'income' && (
          <div className="space-y-4">
            <Num label="Monthly take-home income" hint="Salary after tax, in ₹ per month" value={salary} onChange={setSalary} suffix="₹/mo" />
            <Num label="Monthly expenses" hint="Rent, groceries, bills — everything except EMI & SIP" value={expense} onChange={setExpense} suffix="₹/mo" />
            <Num label="Monthly SIP / investing" hint="Optional" value={sip} onChange={setSip} suffix="₹/mo" />
          </div>
        )}

        {step === 'balances' && (
          <div className="space-y-4">
            {have.savings && <Num label="Savings + FD balance" value={savings} onChange={setSavings} suffix="₹" />}
            {have.investments && (
              <CasImport onImport={(funds) => setCasFunds([...funds].sort((a, b) => b.value - a.value))} />
            )}
            {have.investments && casFunds?.length ? (
              <div className="rounded-xl bg-ink-50 dark:bg-ink-800/60 px-4 py-3 text-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold">Imported funds</span>
                  <button type="button" onClick={() => setCasFunds(null)} className="text-xs font-semibold text-ink-400 hover:text-rose-500">Clear — enter manually</button>
                </div>
                {casFunds.slice(0, 6).map((f) => (
                  <div key={f.name} className="flex justify-between text-xs py-0.5">
                    <span className="text-ink-500 truncate mr-2">{f.name}</span>
                    <span className="font-semibold shrink-0">₹{Math.round(f.value).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {casFunds.length > 6 && <div className="text-[11px] text-ink-400 mt-1">+{casFunds.length - 6} more</div>}
              </div>
            ) : have.investments ? (
              <Num label="Mutual funds / stocks" hint="Or upload your CAS above to auto-fill" value={equity} onChange={setEquity} suffix="₹" />
            ) : null}
            {have.investments && <Num label="EPF + PPF + NPS balance" value={retirementBal} onChange={setRetirementBal} suffix="₹" />}
            {have.realAssets && <Num label="House / property value" hint="Approximate market value" value={property} onChange={setProperty} suffix="₹" />}
            {have.debt && <Num label="Loans outstanding" hint="Home / car / personal loan total" value={loan} onChange={setLoan} suffix="₹" />}
            {have.debt && n(loan) > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <Num label="Monthly EMI" value={emi} onChange={setEmi} suffix="₹/mo" />
                <Num label="EMI years left" value={emiYears} onChange={setEmiYears} suffix="yrs" />
              </div>
            )}
            {!have.savings && !have.investments && !have.realAssets && !have.debt && (
              <p className="text-sm text-ink-400">Nothing selected — that's okay, you're starting fresh! Hit Finish.</p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-rose-600 font-medium mt-4">{error}</p>}

        {/* ---- Footer buttons ---- */}
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={goBack} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">Back</button>
          {step === 'persona' ? (
            <button type="button" onClick={confirmPersona} className="btn-primary px-6" disabled={!personaId}>Confirm</button>
          ) : step === 'balances' ? (
            <button type="button" onClick={finish} className="btn-primary px-6">Create my plan</button>
          ) : (
            <button type="button" onClick={goNext} className="btn-primary px-6">{step === 'have' ? 'Confirm' : 'Continue'}</button>
          )}
        </div>

        {/* First step only: quick way to explore with a ready-made sample plan */}
        {step === 'about' && mode === 'walkthrough' && (
          <button type="button" onClick={useSampleData} className="mt-4 w-full text-center text-xs font-semibold text-brand-600 hover:text-brand-700 py-2">
            Or explore with a sample plan →
          </button>
        )}
      </div>
    </div>
  )
}
