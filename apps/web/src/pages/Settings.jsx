import { useState } from 'react'
import { useStore } from '../data/store.js'
import { emptyProfile, defaultProfile } from '@projectlab/schema'
import { Card, SectionLabel, SectionTitle } from '../components/ui.jsx'
import { IconPlus, IconTrash, IconChevron, IconMoon, IconTrend, IconTax, IconShield, IconAccounts } from '../components/Icons.jsx'
import { Link, useNavigate } from 'react-router-dom'
import { toPct, fromPct, fmtRate } from '../utils/rates.js'
import ProModal from '../components/ProModal.jsx'

// iOS-style switch used by every preference row.
function Switch({ checked, onChange }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

// Shared settings row: icon tile + label (+ optional sub) + right-side control.
function Row({ icon, label, sub, right, onClick, as: As = 'div', ...rest }) {
  return (
    <As
      onClick={onClick}
      className={`flex items-center gap-3 py-3.5 w-full text-left ${onClick || rest.href || rest.to ? 'cursor-pointer' : ''}`}
      {...rest}
    >
      <div className="grid place-items-center h-10 w-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{label}</div>
        {sub && <div className="text-[11px] text-ink-400 font-medium mt-0.5">{sub}</div>}
      </div>
      <div className="shrink-0 flex items-center gap-2">{right}</div>
    </As>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const profile = useStore((s) => s.profile) || emptyProfile
  const setProfile = useStore((s) => s.setProfile)
  const incomes = useStore((s) => s.incomes) || []
  const expenses = useStore((s) => s.expenses) || []
  const updateItem = useStore((s) => s.updateItem)
  const addItem = useStore((s) => s.addItem)
  const removeItem = useStore((s) => s.removeItem)
  const reset = useStore((s) => s.reset)
  const resetAccountData = useStore((s) => s.resetAccountData)
  const auth = useStore((s) => s.auth)
  const logout = useStore((s) => s.logout)
  const ui = useStore((s) => s.ui)
  const toggleDark = useStore((s) => s.toggleDark)
  const setRealTerms = useStore((s) => s.setRealTerms)
  const setTaxAware = useStore((s) => s.setTaxAware)
  const [proOpen, setProOpen] = useState(false)

  const signOut = async () => { await logout(); navigate('/login') }
  const startFresh = async () => {
    if (!confirm('Clear this account data and start onboarding again?')) return
    await resetAccountData()
    navigate('/onboarding', { replace: true })
  }
  const resetAssumptions = () => {
    if (!confirm('Reset ages, inflation, currency and tax regime to defaults?')) return
    const { currentAge, retirementAge, lifeExpectancy, inflation, currency, taxRegime } = defaultProfile
    setProfile({ currentAge, retirementAge, lifeExpectancy, inflation, currency, taxRegime })
  }

  const initials = (profile.name || '')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* ---- Header ---- */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-ink-400 font-medium mt-1">Manage your profile, financial assumptions, and ritual preferences</p>
      </div>

      {/* ---- User profile ---- */}
      <div>
        <SectionLabel>User Profile</SectionLabel>
        <Card className="!py-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="grid place-items-center h-12 w-12 rounded-full bg-brand-600 text-white font-bold">{initials}</div>
              {auth && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-ink-900" />}
            </div>
            <div className="min-w-0 flex-1">
              <input
                value={profile.name}
                placeholder="Your name"
                onChange={(e) => setProfile({ name: e.target.value })}
                className="w-full text-base font-bold bg-transparent outline-none focus:text-brand-600"
              />
              <div className={`text-[11px] font-medium mt-0.5 ${auth ? 'text-emerald-600' : 'text-ink-400'}`}>
                {auth ? 'Cloud sync enabled' : 'Local device only'}
              </div>
            </div>
          </div>
        </Card>
        {auth ? (
          <Card className="!py-3.5 mt-3">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 shrink-0">
                <IconAccounts size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{auth.user?.email ? 'Email Address' : 'Account'}</div>
                <div className="text-sm font-bold truncate">{auth.user?.email || auth.user?.phone || 'Signed in'}</div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="!py-3.5 mt-3 flex items-center justify-between gap-4">
            <div className="text-sm text-ink-500">Using local storage only. Sign in to back up and sync.</div>
            <Link to="/login" className="btn-primary shrink-0">Sign in</Link>
          </Card>
        )}
      </div>

      {/* ---- Financial assumptions ---- */}
      <div>
        <SectionLabel action={
          <button onClick={resetAssumptions} className="text-xs font-bold text-brand-600 hover:text-brand-700">Reset to Default</button>
        }>Financial Rates (%)</SectionLabel>
        <Card>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Inflation Rate">
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={toPct(profile.inflation)}
                  onChange={(e) => setProfile({ inflation: fromPct(e.target.value) })}
                  className="input money pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">%</span>
              </div>
            </Field>
            <Field label="Currency">
              <select value={profile.currency} onChange={(e) => setProfile({ currency: e.target.value })} className="input">
                <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
              </select>
            </Field>
            <Field label="Current Age">
              <input type="number" value={profile.currentAge} onChange={(e) => setProfile({ currentAge: Number(e.target.value) })} className="input money" />
            </Field>
            <Field label="Retirement Age">
              <input type="number" value={profile.retirementAge} onChange={(e) => setProfile({ retirementAge: Number(e.target.value) })} className="input money" />
            </Field>
            <Field label="Life Expectancy">
              <input type="number" value={profile.lifeExpectancy} onChange={(e) => setProfile({ lifeExpectancy: Number(e.target.value) })} className="input money" />
            </Field>
            <Field label="Tax Regime">
              <select value={profile.taxRegime} onChange={(e) => setProfile({ taxRegime: e.target.value })} className="input">
                <option value="new">New regime</option>
                <option value="old">Old regime</option>
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Gross Annual Salary (₹)">
                <input
                  type="number"
                  value={profile.grossSalary ?? ''}
                  placeholder="For tax estimates"
                  onChange={(e) => setProfile({ grossSalary: e.target.value === '' ? null : Number(e.target.value) })}
                  className="input money"
                />
              </Field>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-ink-400 italic">* These assumptions are used across all projections and retirement planning modules.</p>
        </Card>
      </div>

      {/* ---- Income & expenses ---- */}
      <div>
        <SectionLabel>Income &amp; Expenses</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FlowEditor title="Income Streams" collection="incomes" items={incomes} update={updateItem} add={addItem} remove={removeItem} color="#6366f1" profile={profile} />
          <FlowEditor title="Expenses" collection="expenses" items={expenses} update={updateItem} add={addItem} remove={removeItem} color="#ef4444" profile={profile} />
        </div>
      </div>

      {/* ---- Preferences ---- */}
      <div>
        <SectionLabel>Preferences</SectionLabel>
        <Card className="!py-1">
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            <Row icon={<IconMoon size={18} />} label="Dark Mode"
              right={<Switch checked={!!ui.dark} onChange={toggleDark} />} />
            <Row icon={<IconTrend size={18} />} label="Real Terms" sub="Show projections in today's rupees"
              right={<Switch checked={!!ui.realTerms} onChange={() => setRealTerms(!ui.realTerms)} />} />
            <Row icon={<IconTax size={18} />} label="Tax-aware Projections" sub="Model income tax inside the projection"
              right={<Switch checked={!!ui.taxAware} onChange={() => setTaxAware(!ui.taxAware)} />} />
            <Row icon={<IconAccounts size={18} />} label="Subscription Plan" sub="Free plan — Pro coming soon"
              onClick={() => setProOpen(true)}
              right={<span className="flex items-center gap-1.5"><span className="xp-chip !px-2 !py-0.5 text-[10px]">Pro</span><IconChevron size={16} className="text-ink-300" /></span>} />
          </div>
        </Card>
      </div>

      {/* ---- Support & data ---- */}
      <div>
        <SectionLabel>Support</SectionLabel>
        <Card className="!py-1">
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            <Row as="a" href="/privacy-policy.html" target="_blank" rel="noreferrer"
              icon={<IconShield size={18} />} label="Privacy Policy"
              right={<IconChevron size={16} className="text-ink-300" />} />
            <Row icon={<IconTrash size={18} />} label="Reset all data" sub="Restore the sample plan and clear your local changes"
              onClick={() => { if (confirm('Reset to sample data?')) reset() }}
              right={<span className="text-xs font-bold text-rose-500">Reset</span>} />
            {auth && (
              <Row icon={<IconPlus size={18} />} label="Start fresh for this account" sub="Clears this account's cloud plan and reopens onboarding"
                onClick={startFresh}
                right={<span className="text-xs font-bold text-amber-600">Clear</span>} />
            )}
          </div>
        </Card>
      </div>

      {/* ---- Sign out ---- */}
      {auth && (
        <button
          onClick={signOut}
          className="w-full rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 py-3 text-sm font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
        >
          ⎋ Sign Out
        </button>
      )}

      <p className="text-center text-[11px] text-ink-400 font-medium pb-4">
        Financial Blueprint v{__APP_VERSION__} · build {__BUILD_STAMP__} · Institutional Minimalism Theme
      </p>

      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </div>
  )
}

function FlowEditor({ title, collection, items, update, add, remove, color, profile }) {
  return (
    <Card>
      <SectionTitle
        title={title}
        action={
          <button
            onClick={() => add(collection, {
              name: 'New item',
              amount: 0,
              growth: 0.02,
              startAge: profile?.currentAge || 32,
              endAge: collection === 'incomes' ? (profile?.retirementAge || 60) : 90,
              color,
            })}
            className="btn-ghost !py-1.5"
          ><IconPlus size={16} /> Add</button>
        }
      />
      <div className="space-y-2">
        {(items || []).filter((it) => it?.id).map((it) => (
          <div key={it.id} className="group rounded-xl bg-ink-50 dark:bg-ink-800/60 px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={it.name}
                onChange={(e) => update(collection, it.id, { name: e.target.value })}
                className="bg-transparent font-semibold text-sm outline-none min-w-0 flex-1"
              />
              <div className="flex items-center gap-1 text-sm shrink-0">
                <span className="text-ink-400">₹</span>
                <input
                  type="number"
                  value={it.amount}
                  onChange={(e) => update(collection, it.id, { amount: Number(e.target.value) })}
                  className="money w-24 text-right bg-transparent font-bold outline-none"
                />
              </div>
              <button
                onClick={() => remove(collection, it.id)}
                className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-ink-400 hover:text-rose-500 transition shrink-0"
              >
                <IconTrash size={15} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
              <label className="flex items-center gap-1">
                age
                <input
                  type="number"
                  value={it.startAge}
                  onChange={(e) => update(collection, it.id, { startAge: Number(e.target.value) })}
                  className="w-12 bg-white dark:bg-ink-900 rounded-md px-1.5 py-0.5 outline-none font-semibold text-ink-600 dark:text-ink-200"
                />
              </label>
              <label className="flex items-center gap-1">
                →
                <input
                  type="number"
                  value={it.endAge}
                  onChange={(e) => update(collection, it.id, { endAge: Number(e.target.value) })}
                  className="w-12 bg-white dark:bg-ink-900 rounded-md px-1.5 py-0.5 outline-none font-semibold text-ink-600 dark:text-ink-200"
                />
              </label>
              <label className="flex items-center gap-1">
                growth
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={toPct(it.growth)}
                  onChange={(e) => update(collection, it.id, { growth: fromPct(e.target.value) })}
                  className="w-14 bg-white dark:bg-ink-900 rounded-md px-1.5 py-0.5 outline-none font-semibold text-ink-600 dark:text-ink-200"
                />
                %
              </label>
            </div>
            <div className="text-[10px] text-ink-400">
              Ages {it.startAge}→{it.endAge} · grows {fmtRate(it.growth)}/yr
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
