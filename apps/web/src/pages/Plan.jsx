import { useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot,
} from 'recharts'
import { useStore } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionTitle } from '../components/ui.jsx'
import { IconPlus, IconTrash } from '../components/Icons.jsx'

export default function Plan() {
  const { projection } = useProjection()
  const events = useStore((s) => s.events)
  const profile = useStore((s) => s.profile)
  const addItem = useStore((s) => s.addItem)
  const removeItem = useStore((s) => s.removeItem)
  const [draft, setDraft] = useState({ name: '', age: 40, amount: 0, icon: '⭐' })

  const netWorthAt = (age) => projection.find((r) => r.age === age)?.netWorth ?? 0
  const sorted = [...events].sort((a, b) => a.age - b.age)

  const add = () => {
    if (!draft.name.trim()) return
    addItem('events', { ...draft, age: Number(draft.age), amount: Number(draft.amount), color: '#6366f1' })
    setDraft({ name: '', age: 40, amount: 0, icon: '⭐' })
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle title="Life Timeline" subtitle="Your financial journey, event by event" />
        <div className="h-[300px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projection} margin={{ top: 20, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" vertical={false} />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis tickFormatter={(v) => fmtMoney(v, { compact: true })} tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} width={54} />
              <Tooltip formatter={(v) => [fmtMoney(v), 'Net worth']} labelFormatter={(l) => `Age ${l}`} contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 24px rgba(15,23,42,0.12)' }} />
              <Line type="monotone" dataKey="netWorth" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
              {sorted.map((e) => (
                <ReferenceDot key={e.id} x={e.age} y={netWorthAt(e.age)} r={6} fill={e.color} stroke="#fff" strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline list */}
        <Card className="lg:col-span-2">
          <SectionTitle title="Milestone Events" subtitle={`${events.length} planned events`} />
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-ink-200 dark:bg-ink-700" />
            {sorted.map((e) => (
              <div key={e.id} className="relative mb-4 last:mb-0 group">
                <div className="absolute -left-[18px] top-1 h-4 w-4 rounded-full border-2 border-white dark:border-ink-900" style={{ background: e.color }} />
                <div className="flex items-center justify-between rounded-xl bg-ink-50 dark:bg-ink-800/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{e.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{e.name}</div>
                      <div className="text-xs text-ink-400">Age {e.age} · {profile.currentAge <= e.age ? 2026 + (e.age - profile.currentAge) : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {e.amount !== 0 && (
                      <span className={`text-sm font-bold ${e.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {e.amount > 0 ? '+' : ''}{fmtMoney(e.amount, { compact: true })}
                      </span>
                    )}
                    <button onClick={() => removeItem('events', e.id)} className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-rose-500 transition">
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Add event */}
        <Card>
          <SectionTitle title="Add Life Event" />
          <div className="space-y-3">
            <Field label="Event name">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Buy a boat" className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <input type="number" value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value })} className="input" />
              </Field>
              <Field label="Icon">
                <input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} className="input" />
              </Field>
            </div>
            <Field label="Cash impact (+ / −)">
              <input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="-50000" className="input" />
            </Field>
            <button onClick={add} className="btn-primary w-full"><IconPlus size={16} /> Add to timeline</button>
          </div>
        </Card>
      </div>
    </div>
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
