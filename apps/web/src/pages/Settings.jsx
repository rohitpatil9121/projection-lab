import { useStore } from '../data/store.js'
import { Card, SectionTitle } from '../components/ui.jsx'
import { IconPlus, IconTrash } from '../components/Icons.jsx'
import { Link, useNavigate } from 'react-router-dom'

export default function Settings() {
  const navigate = useNavigate()
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const incomes = useStore((s) => s.incomes) || []
  const expenses = useStore((s) => s.expenses) || []
  const updateItem = useStore((s) => s.updateItem)
  const addItem = useStore((s) => s.addItem)
  const removeItem = useStore((s) => s.removeItem)
  const reset = useStore((s) => s.reset)
  const auth = useStore((s) => s.auth)
  const logout = useStore((s) => s.logout)

  const signOut = async () => { await logout(); navigate('/login') }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle title="Account & Sync" subtitle="Sign in to sync your plan across devices" />
        {auth ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold truncate">{auth.user?.email || auth.user?.phone || 'Signed in'}</div>
              <div className="text-xs text-emerald-600 font-medium flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Cloud sync enabled</div>
            </div>
            <button onClick={signOut} className="btn-secondary text-rose-600 shrink-0">Sign out</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-ink-500">Using local storage only. Sign in to back up and sync.</div>
            <Link to="/login" className="btn-primary">Sign in</Link>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle title="Profile & Assumptions" subtitle="These drive every projection" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Name">
            <input value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} className="input" />
          </Field>
          <Field label="Current age">
            <input type="number" value={profile.currentAge} onChange={(e) => setProfile({ currentAge: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Retirement age">
            <input type="number" value={profile.retirementAge} onChange={(e) => setProfile({ retirementAge: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Life expectancy">
            <input type="number" value={profile.lifeExpectancy} onChange={(e) => setProfile({ lifeExpectancy: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Inflation rate">
            <input type="number" step="0.005" value={profile.inflation} onChange={(e) => setProfile({ inflation: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Currency">
            <select value={profile.currency} onChange={(e) => setProfile({ currency: e.target.value })} className="input">
              <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
            </select>
          </Field>
          <Field label="Tax regime">
            <select value={profile.taxRegime} onChange={(e) => setProfile({ taxRegime: e.target.value })} className="input">
              <option value="old">Old (80C / 80D deductions)</option>
              <option value="new">New (lower slabs, no deductions)</option>
            </select>
          </Field>
          <Field label="Marginal tax slab">
            <select value={profile.taxSlab} onChange={(e) => setProfile({ taxSlab: Number(e.target.value) })} className="input">
              <option value={0.05}>5%</option>
              <option value={0.2}>20%</option>
              <option value={0.3}>30%</option>
            </select>
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FlowEditor title="Income Streams" collection="incomes" items={incomes} update={updateItem} add={addItem} remove={removeItem} color="#6366f1" />
        <FlowEditor title="Expenses" collection="expenses" items={expenses} update={updateItem} add={addItem} remove={removeItem} color="#ef4444" />
      </div>

      <Card className="flex items-center justify-between">
        <div>
          <div className="font-bold">Reset all data</div>
          <div className="text-xs text-ink-400">Restore the sample plan and clear your local changes.</div>
        </div>
        <button onClick={() => { if (confirm('Reset to sample data?')) reset() }} className="btn bg-rose-50 text-rose-600 hover:bg-rose-100">
          <IconTrash size={16} /> Reset
        </button>
      </Card>
    </div>
  )
}

function FlowEditor({ title, collection, items, update, add, remove, color }) {
  return (
    <Card>
      <SectionTitle
        title={title}
        action={
          <button
            onClick={() => add(collection, { name: 'New item', amount: 0, growth: 0.02, startAge: 32, endAge: 90, color })}
            className="btn-ghost !py-1.5"
          ><IconPlus size={16} /> Add</button>
        }
      />
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="group grid grid-cols-[1fr,auto,auto] gap-2 items-center rounded-xl bg-ink-50 dark:bg-ink-800/60 px-3 py-2">
            <input value={it.name} onChange={(e) => update(collection, it.id, { name: e.target.value })} className="bg-transparent font-semibold text-sm outline-none min-w-0" />
            <div className="flex items-center gap-1 text-sm">
              <span className="text-ink-400">$</span>
              <input type="number" value={it.amount} onChange={(e) => update(collection, it.id, { amount: Number(e.target.value) })} className="w-24 text-right bg-transparent font-bold outline-none" />
            </div>
            <button onClick={() => remove(collection, it.id)} className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-rose-500 transition">
              <IconTrash size={15} />
            </button>
            <div className="col-span-3 flex gap-3 text-[11px] text-ink-400 pl-0.5">
              <label className="flex items-center gap-1">age <input type="number" value={it.startAge} onChange={(e) => update(collection, it.id, { startAge: Number(e.target.value) })} className="w-12 bg-transparent outline-none font-semibold" /></label>
              <label className="flex items-center gap-1">→ <input type="number" value={it.endAge} onChange={(e) => update(collection, it.id, { endAge: Number(e.target.value) })} className="w-12 bg-transparent outline-none font-semibold" /></label>
              <label className="flex items-center gap-1">growth <input type="number" step="0.01" value={it.growth} onChange={(e) => update(collection, it.id, { growth: Number(e.target.value) })} className="w-14 bg-transparent outline-none font-semibold" /></label>
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
      <span className="text-xs font-semibold text-ink-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
