import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore, computeProjection } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionTitle, Modal } from '../components/ui.jsx'
import { IconPlus, IconTrash } from '../components/Icons.jsx'
import FinancialProjectionChart from '../components/FinancialProjectionChart.jsx'

export default function Plan() {
  const navigate = useNavigate()
  const { state } = useProjection()
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const events = useStore((s) => s.events)
  const milestones = useStore((s) => s.milestones)
  const addItem = useStore((s) => s.addItem)
  const removeItem = useStore((s) => s.removeItem)

  const [draftRetire, setDraftRetire] = useState(profile.retirementAge)
  const [eventsOpen, setEventsOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', age: 40, amount: 0, icon: '⭐' })

  useEffect(() => {
    setDraftRetire(profile.retirementAge)
  }, [profile.retirementAge])

  const chartState = useMemo(
    () => ({ ...state, profile: { ...profile, retirementAge: draftRetire } }),
    [state, profile, draftRetire],
  )
  const projection = useMemo(() => computeProjection(chartState), [chartState])

  const today = projection[0]
  const sorted = [...(events || [])].sort((a, b) => a.age - b.age)
  const chartGoals = (milestones || []).filter((m) => !m.achieved && m.targetAge)

  const applyRetirement = () => {
    if (draftRetire <= profile.currentAge || draftRetire > profile.lifeExpectancy) return
    setProfile({ retirementAge: draftRetire })
  }

  const add = () => {
    if (!draft.name.trim()) return
    addItem('events', { ...draft, age: Number(draft.age), amount: Number(draft.amount), color: '#6366f1' })
    setDraft({ name: '', age: 40, amount: 0, icon: '⭐' })
  }

  const onMarkerClick = (marker) => {
    if (marker.kind === 'goal') navigate('/milestones')
  }

  return (
    <div className="space-y-5">
      {/* Header — current value + tail risk */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Current</div>
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
            {fmtMoney(today?.netWorth || 0)}
          </div>
        </div>
        <Link
          to="/monte-carlo"
          className="rounded-full border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-4 py-2 text-sm font-semibold text-ink-600 dark:text-ink-300 hover:border-brand-300 transition"
        >
          Tail Risk
        </Link>
      </div>

      {/* Main projection chart */}
      <Card className="!p-4 sm:!p-5 border-0 shadow-soft bg-white dark:bg-ink-900">
        <FinancialProjectionChart
          key={`${draftRetire}-${projection.length}-${today?.netWorth}`}
          projection={projection}
          retirementAge={draftRetire}
          events={events}
          goals={chartGoals}
          onMarkerClick={onMarkerClick}
        />

        {/* Retirement age stepper */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-4 rounded-2xl bg-ink-100 dark:bg-ink-800 px-5 py-3">
            <button
              type="button"
              onClick={() => setDraftRetire((a) => Math.max(profile.currentAge + 1, a - 1))}
              className="h-8 w-8 rounded-lg bg-white dark:bg-ink-900 text-lg font-bold text-ink-500 hover:text-brand-600"
              aria-label="Decrease retirement age"
            >−</button>
            <div className="text-center min-w-[3rem]">
              <div className="text-2xl font-extrabold tabular-nums">{draftRetire}</div>
              <div className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">Retirement</div>
            </div>
            <button
              type="button"
              onClick={() => setDraftRetire((a) => Math.min(profile.lifeExpectancy, a + 1))}
              className="h-8 w-8 rounded-lg bg-white dark:bg-ink-900 text-lg font-bold text-ink-500 hover:text-brand-600"
              aria-label="Increase retirement age"
            >+</button>
          </div>
          <button
            type="button"
            onClick={applyRetirement}
            disabled={draftRetire === profile.retirementAge}
            className="w-full max-w-sm rounded-2xl bg-ink-900 dark:bg-white text-white dark:text-ink-900 py-3.5 text-sm font-bold disabled:opacity-40 transition"
          >
            Update Retirement Age
          </button>
        </div>
      </Card>

      {/* Important factors */}
      <div>
        <h2 className="text-sm font-bold text-ink-500 mb-3">Important Factors</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <FactorCard
            icon="📅"
            label="Events"
            onClick={() => setEventsOpen(true)}
          />
          <FactorCard icon="📊" label="Asset Allocation" to="/accounts" />
          <FactorCard icon="⇄" label="Income & Expense" to="/cash-flow" />
        </div>
      </div>

      {/* Life events — always visible with add option */}
      <Card>
        <SectionTitle
          title="Life Events"
          subtitle={sorted.length ? 'Shown on your plan chart' : 'Add home, car, education and more'}
          action={
            <button type="button" onClick={() => setEventsOpen(true)} className="btn-primary !py-1.5 !px-3 text-xs">
              <IconPlus size={14} /> Add
            </button>
          }
        />
        {sorted.length > 0 ? (
          <div className="space-y-2">
            {sorted.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl bg-ink-50 dark:bg-ink-800/60 px-3 py-2.5 group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl">{e.icon}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{e.name}</div>
                    <div className="text-xs text-ink-400">Age {e.age}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {e.amount !== 0 && (
                    <span className={`text-xs font-bold ${e.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {fmtMoney(e.amount, { compact: true })}
                    </span>
                  )}
                  <button onClick={() => removeItem('events', e.id)} className="text-ink-400 hover:text-rose-500 opacity-70 group-hover:opacity-100">
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEventsOpen(true)}
            className="w-full rounded-2xl border-2 border-dashed border-ink-200 dark:border-ink-700 py-8 text-center hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition"
          >
            <div className="text-2xl mb-1">📅</div>
            <div className="text-sm font-semibold text-ink-600 dark:text-ink-300">Add your first life event</div>
            <div className="text-xs text-ink-400 mt-1">Car, home, wedding, education…</div>
          </button>
        )}
      </Card>

      {/* Events modal */}
      <Modal open={eventsOpen} onClose={() => setEventsOpen(false)} title="Life Events">
        <p className="text-sm text-ink-400 mb-4">Add milestones like home, car, education — they appear on your plan chart.</p>
        <div className="space-y-3">
          <Field label="Event name">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Buy a car" className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input type="number" value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value })} className="input" />
            </Field>
            <Field label="Icon">
              <input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} className="input" maxLength={2} />
            </Field>
          </div>
          <Field label="Cash impact (+ / −)">
            <input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="-1200000" className="input" />
          </Field>
          <button onClick={add} className="btn-primary w-full">
            <IconPlus size={16} /> Add event
          </button>
        </div>
        {sorted.length > 0 && (
          <div className="mt-4 pt-4 border-t border-ink-100 dark:border-ink-800 space-y-2 max-h-48 overflow-y-auto">
            {sorted.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span>{e.icon} {e.name} <span className="text-ink-400">· age {e.age}</span></span>
                <button onClick={() => removeItem('events', e.id)} className="text-rose-500 text-xs font-semibold">Remove</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

function FactorCard({ icon, label, to, onClick }) {
  const inner = (
    <>
      <span className="text-2xl">{icon}</span>
      <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight mt-2">{label}</span>
    </>
  )
  const cls = 'flex flex-col items-center justify-center rounded-2xl bg-ink-100 dark:bg-ink-800/80 px-2 py-4 min-h-[88px] hover:bg-ink-200/80 dark:hover:bg-ink-800 transition'
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
