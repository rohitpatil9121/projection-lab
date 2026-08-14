/* GOALS AND BIG EXPENSES — the plan's goals, edited inside the Enough feature.
 *
 * A goal is a cost with a year. It can be one-off (a house down-payment at 40) or recurring
 * (a trip every year from 55 to 69), and it grows at its own inflation. Every goal that is
 * left ON is withdrawn from the corpus in the year it falls due — so the FIRE number this
 * screen solves already accounts for them.
 *
 * The list is this feature's own (see effectiveEnoughGoals): it seeds from the plan's
 * milestones, and the moment anything is added, edited or toggled it becomes self-contained.
 */

import { useState } from 'react'
import { fmtMoney } from '@projectlab/engine'
import { Card, Modal } from '../ui.jsx'

const money = (v) => fmtMoney(v, { compact: true })
const DOT = ['#0F8F82', '#5647B8', '#2A63C4', '#8A6410', '#B05A12']

const inflatedTo = (amount, inflation, atAge, currentAge) =>
  amount * Math.pow(1 + (inflation || 0), Math.max(0, atAge - currentAge))

const blankGoal = (currentAge) => ({
  name: '',
  amountL: '', // entered in lakh for a familiar scale, stored in rupees
  recurring: false,
  atAge: currentAge + 5,
  untilAge: currentAge + 10,
  inflationPct: 6,
})

export default function GoalsEditor({ goals, currentAge, onChange }) {
  const [editing, setEditing] = useState(null) // { index|null, draft }

  const setGoal = (id, next) => onChange(goals.map((g) => (g.id === id ? { ...g, ...next } : g)))
  const removeGoal = (id) => onChange(goals.filter((g) => g.id !== id))

  const openAdd = () => setEditing({ id: null, draft: blankGoal(currentAge) })
  const openEdit = (g) => setEditing({
    id: g.id,
    draft: {
      name: g.name,
      amountL: g.amount ? +(g.amount / 1e5).toFixed(2) : '',
      recurring: g.untilAge != null && g.untilAge > g.atAge,
      atAge: g.atAge,
      untilAge: g.untilAge ?? g.atAge + 5,
      inflationPct: +((g.inflation ?? 0) * 100).toFixed(1),
    },
  })

  const save = () => {
    const d = editing.draft
    const amount = Math.max(0, Number(d.amountL) || 0) * 1e5
    if (!d.name.trim() || amount <= 0) return
    const atAge = Math.round(Number(d.atAge) || currentAge + 1)
    const goal = {
      name: d.name.trim(),
      amount,
      atAge,
      untilAge: d.recurring ? Math.max(atAge, Math.round(Number(d.untilAge) || atAge)) : undefined,
      inflation: Math.max(0, Number(d.inflationPct) || 0) / 100,
      on: true,
    }
    if (editing.id == null) {
      onChange([...goals, { id: `g-${Date.now()}`, ...goal }])
    } else {
      onChange(goals.map((g) => (g.id === editing.id ? { ...g, ...goal } : g)))
    }
    setEditing(null)
  }

  return (
    <Card>
      <div className="section-label mb-2">Goals &amp; big expenses</div>

      {goals.length === 0 ? (
        <p className="text-sm text-ink-400 leading-relaxed py-2">
          No goals yet. A house down payment, a child’s education, a wedding, a long trip — anything with a
          cost and a year.
        </p>
      ) : (
        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {goals.map((g, i) => {
            const recurring = g.untilAge != null && g.untilAge > g.atAge
            const hasInfl = (g.inflation ?? 0) > 0
            const lo = inflatedTo(g.amount, g.inflation, g.atAge, currentAge)
            const hi = inflatedTo(g.amount, g.inflation, g.untilAge ?? g.atAge, currentAge)
            return (
              <div key={g.id} className="flex items-start gap-3 py-3" style={{ opacity: g.on === false ? 0.5 : 1 }}>
                <span className="mt-1.5 h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: DOT[i % DOT.length] }} />
                <button className="min-w-0 flex-1 text-left" onClick={() => openEdit(g)}>
                  <div className="text-sm font-bold truncate">{g.name}</div>
                  <div className="flex items-baseline justify-between gap-3 mt-0.5">
                    <span className="text-xs text-ink-400">Cost today</span>
                    <span className="money text-xs font-semibold">{money(g.amount)}{recurring ? ' a year' : ''}</span>
                  </div>
                  {hasInfl && (
                    <div className="flex items-baseline justify-between gap-3 mt-0.5">
                      <span className="text-xs text-ink-400">{recurring ? `Ages ${g.atAge}–${g.untilAge}` : `At ${g.atAge}`}</span>
                      <span className="money text-xs font-semibold text-ink-500">
                        {recurring ? `${money(lo)}–${money(hi)}` : money(lo)}
                      </span>
                    </div>
                  )}
                </button>
                <Toggle on={g.on !== false} onChange={() => setGoal(g.id, { on: g.on === false })} label={g.name} />
              </div>
            )
          })}
        </div>
      )}

      <button
        className="mt-3 w-full rounded-xl border border-dashed border-ink-200 dark:border-ink-700 py-2.5 text-sm font-bold text-ink-500 hover:border-brand-500 hover:text-brand-600 transition"
        onClick={openAdd}
      >+ Add a goal</button>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id == null ? 'New goal' : 'Edit goal'}>
          <div className="space-y-3">
            <label className="block">
              <span className="section-label">What for</span>
              <input autoFocus className="input mt-1" value={editing.draft.name}
                placeholder="e.g. Daughter's college"
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })} />
            </label>

            <label className="block">
              <span className="section-label">Cost today (₹ lakh){editing.draft.recurring ? ' · per year' : ''}</span>
              <input type="number" inputMode="decimal" className="input mt-1" value={editing.draft.amountL}
                placeholder="40"
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, amountL: e.target.value } })} />
            </label>

            <div className="inline-flex w-full rounded-xl bg-ink-100 dark:bg-ink-800 p-1 text-xs font-semibold">
              {[['one', 'One-time'], ['recur', 'Every year']].map(([v, label]) => {
                const active = (v === 'recur') === editing.draft.recurring
                return (
                  <button key={v}
                    onClick={() => setEditing({ ...editing, draft: { ...editing.draft, recurring: v === 'recur' } })}
                    className={`flex-1 px-3 py-1.5 rounded-lg transition ${active ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500'}`}>
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="section-label">{editing.draft.recurring ? 'From age' : 'At age'}</span>
                <input type="number" inputMode="numeric" className="fcell mt-1 w-full text-center" value={editing.draft.atAge}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, atAge: e.target.value } })} />
              </label>
              {editing.draft.recurring && (
                <label className="block">
                  <span className="section-label">To age</span>
                  <input type="number" inputMode="numeric" className="fcell mt-1 w-full text-center" value={editing.draft.untilAge}
                    onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, untilAge: e.target.value } })} />
                </label>
              )}
              <label className="block">
                <span className="section-label">Inflation %</span>
                <input type="number" step="0.5" inputMode="decimal" className="fcell mt-1 w-full text-center" value={editing.draft.inflationPct}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, inflationPct: e.target.value } })} />
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              {editing.id != null && (
                <button className="btn-ghost !text-rose-600" onClick={() => { removeGoal(editing.id); setEditing(null) }}>Delete</button>
              )}
              <button className="btn-secondary flex-1" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={save}>Save</button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  )
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={`Count ${label}`} onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700'}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}
