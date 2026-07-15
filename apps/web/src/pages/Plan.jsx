import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore, computeProjection } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney, CURRENT_YEAR } from '@projectlab/engine'
import { Card, SectionLabel, Modal } from '../components/ui.jsx'
import { IconPlus, IconTrash } from '../components/Icons.jsx'
import GoalGraphic, { kindFromText } from '../components/GoalGraphic.jsx'
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

  // Chart + vault figures follow the DRAFTED retirement age.
  const chartState = useMemo(
    () => ({ ...state, profile: { ...profile, retirementAge: draftRetire } }),
    [state, profile, draftRetire],
  )
  const projection = useMemo(() => computeProjection(chartState), [chartState])

  const retireRow = projection.find((r) => r.age === draftRetire)
  const targetCorpus = retireRow?.investable ?? 0
  const monthlyPension = (targetCorpus * 0.04) / 12

  const sorted = [...(events || [])].sort((a, b) => a.age - b.age)
  const chartGoals = (milestones || []).filter((m) => !m.achieved && m.targetAge)

  const applyRetirement = () => {
    if (draftRetire <= profile.currentAge || draftRetire > profile.lifeExpectancy) return
    setProfile({ retirementAge: draftRetire })
  }

  const add = () => {
    if (!draft.name.trim()) return
    addItem('events', { ...draft, age: Number(draft.age), amount: Number(draft.amount), color: '#377cc8' })
    setDraft({ name: '', age: 40, amount: 0, icon: '⭐' })
  }

  const onMarkerClick = (marker) => {
    if (marker.kind === 'goal') navigate('/milestones')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Future Blueprint</h1>
        <p className="text-sm text-ink-400 font-medium mt-0.5">Strategic wealth mapping</p>
      </div>

      {/* Retirement vault */}
      <section>
        <SectionLabel>Retirement Vault</SectionLabel>
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-semibold text-ink-500 dark:text-ink-300">Planned Retirement Age</div>
            <div className="flex items-baseline gap-1.5 shrink-0">
              <span className="text-3xl font-extrabold money text-brand-600 dark:text-brand-400">{draftRetire}</span>
              <span className="text-xs font-bold uppercase tracking-wide text-ink-400">yrs</span>
            </div>
          </div>
          <input
            type="range"
            min={profile.currentAge + 1}
            max={profile.lifeExpectancy}
            value={draftRetire}
            onChange={(e) => setDraftRetire(Number(e.target.value))}
            className="w-full mt-4 accent-brand-600 cursor-pointer"
            aria-label="Planned retirement age"
          />
          <div className="flex justify-between text-[10px] font-semibold text-ink-400 mt-1">
            <span>{profile.currentAge + 1}</span>
            <span>{profile.lifeExpectancy}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl border border-ink-100 dark:border-ink-800 p-3.5">
              <div className="text-xs font-medium text-ink-400">Target Corpus</div>
              <div className="mt-1 text-lg font-extrabold money">{fmtMoney(targetCorpus, { compact: true })}</div>
              <div className="text-[10px] text-ink-400 mt-0.5">investable at age {draftRetire}</div>
            </div>
            <div className="rounded-xl border border-ink-100 dark:border-ink-800 p-3.5">
              <div className="text-xs font-medium text-ink-400">Monthly Pension</div>
              <div className="mt-1 text-lg font-extrabold money">{fmtMoney(monthlyPension, { compact: true })}</div>
              <div className="text-[10px] text-ink-400 mt-0.5">est. monthly pension (4% rule)</div>
            </div>
          </div>

          <button
            type="button"
            onClick={applyRetirement}
            disabled={draftRetire === profile.retirementAge}
            className="btn-primary w-full mt-4 disabled:opacity-40"
          >
            Update Retirement Age
          </button>
        </Card>
      </section>

      {/* Projection chart */}
      <section>
        <SectionLabel
          action={
            <Link to="/monte-carlo" className="text-xs font-bold text-brand-600 uppercase tracking-wide">
              Tail Risk
            </Link>
          }
        >
          Wealth Projection
        </SectionLabel>
        <Card className="!p-4 sm:!p-5">
          <FinancialProjectionChart
            key={`${draftRetire}-${projection.length}-${projection[0]?.netWorth}`}
            projection={projection}
            retirementAge={draftRetire}
            events={events}
            goals={chartGoals}
            onMarkerClick={onMarkerClick}
          />
        </Card>
      </section>

      {/* Strategic milestones (life events) */}
      <section>
        <SectionLabel
          action={
            <button
              type="button"
              onClick={() => setEventsOpen(true)}
              className="text-xs font-bold text-brand-600 uppercase tracking-wide"
            >
              + Add
            </button>
          }
        >
          Strategic Milestones
        </SectionLabel>
        {sorted.length > 0 ? (
          <div className="space-y-3">
            {sorted.map((e) => {
              const year = CURRENT_YEAR + (e.age - profile.currentAge)
              return (
                <Card
                  key={e.id}
                  interactive
                  onClick={() => setEventsOpen(true)}
                  className="flex items-center gap-3 !py-3.5 cursor-pointer group"
                >
                  <div className="grid place-items-center h-11 w-11 rounded-xl bg-brand-50 dark:bg-brand-500/15 shrink-0">
                    <GoalGraphic kind={kindFromText(e.name)} size={30} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate">{e.name}</div>
                    <div className="text-xs text-ink-400">{year} · Age {e.age}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {e.amount !== 0 && (
                      <div className={`text-sm font-extrabold money ${e.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-900 dark:text-white'}`}>
                        {fmtMoney(e.amount, { compact: true })}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); removeItem('events', e.id) }}
                    className="text-ink-400 hover:text-rose-500 opacity-70 group-hover:opacity-100 shrink-0"
                    aria-label={`Remove ${e.name}`}
                  >
                    <IconTrash size={15} />
                  </button>
                </Card>
              )
            })}
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
      </section>

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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
