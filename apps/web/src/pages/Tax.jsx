import { useMemo, useState } from 'react'
import { useStore, computeTaxSummary, compareRegimes, deductionsFromPlan, TAX_FY } from '../data/store.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionTitle, ProgressBar } from '../components/ui.jsx'

const SECTION_LABELS = {
  '80C': { name: 'Section 80C', hint: 'ELSS · PPF · EPF · life insurance' },
  '80CCD1B': { name: 'Section 80CCD(1B)', hint: 'NPS (extra, over 80C)' },
  '80D': { name: 'Section 80D', hint: 'Health insurance premium' },
}

export default function Tax() {
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const contributions = useStore((s) => s.contributions)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const taxAware = useStore((s) => !!s.ui.taxAware)
  const setTaxAware = useStore((s) => s.setTaxAware)
  const hasSalaryFlow = incomes.some((i) => i.id === 'salary')

  const summary = useMemo(
    () => computeTaxSummary({ profile, contributions, expenses }),
    [profile, contributions, expenses],
  )

  const actuals = summary.sections
  // What-if sliders (not persisted) — seeded from what the plan actually invests.
  const [whatIf, setWhatIf] = useState(null)
  const deductions = whatIf || {
    '80C': actuals['80C'].raw,
    '80CCD1B': actuals['80CCD1B'].raw,
    '80D': actuals['80D'].raw,
  }

  const comparison = useMemo(
    () => (summary.ready
      ? compareRegimes({ grossIncome: profile.grossSalary, deductions, age: profile.currentAge })
      : null),
    [summary.ready, profile.grossSalary, profile.currentAge, deductions],
  )

  const whatIfSections = useMemo(
    () => deductionsFromPlan({
      contributions: [
        { section: '80C', amount: deductions['80C'] },
        { section: '80CCD1B', amount: deductions['80CCD1B'] },
      ],
      expenses: [{ section: '80D', amount: deductions['80D'] }],
      age: profile.currentAge,
    }),
    [deductions, profile.currentAge],
  )

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle title="Income Tax" subtitle={`FY ${TAX_FY} · old vs new regime, based on your plan`} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Gross annual salary (₹)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">₹</span>
              <input
                type="number"
                value={profile.grossSalary ?? ''}
                placeholder="e.g. 2400000"
                onChange={(e) => setProfile({ grossSalary: e.target.value === '' ? null : Number(e.target.value) })}
                className="input pl-7"
              />
            </div>
          </Field>
          <Field label="Tax regime">
            <select value={profile.taxRegime} onChange={(e) => setProfile({ taxRegime: e.target.value })} className="input">
              <option value="new">New regime</option>
              <option value="old">Old regime</option>
            </select>
          </Field>
          <Field label="Age (from profile)">
            <input value={profile.currentAge} disabled className="input opacity-60" />
          </Field>
        </div>
        {!summary.ready && (
          <p className="mt-3 text-sm text-ink-400">
            Enter your gross annual salary (CTC minus non-taxable components) to compare regimes.
            Tip: a take-home of {fmtMoney(1800000, { compact: true })} is roughly {fmtMoney(2200000, { compact: true })}–{fmtMoney(2400000, { compact: true })} gross.
          </p>
        )}
      </Card>

      {summary.ready && comparison && (
        <>
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              profile.taxRegime === comparison.recommended
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
            }`}
          >
            {profile.taxRegime === comparison.recommended
              ? `You're on the right regime — the ${comparison.recommended} regime saves you ${fmtMoney(comparison.savings)} this year.`
              : `Switching to the ${comparison.recommended} regime would save you ${fmtMoney(comparison.savings)} this year.`}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RegimeCard title="Old regime" result={comparison.old} selected={profile.taxRegime === 'old'} recommended={comparison.recommended === 'old'} />
            <RegimeCard title="New regime" result={comparison.new} selected={profile.taxRegime === 'new'} recommended={comparison.recommended === 'new'} />
          </div>

          {hasSalaryFlow && (
            <Card className="flex items-center justify-between gap-4">
              <div>
                <div className="font-bold">Use gross salary + tax in projections</div>
                <div className="text-xs text-ink-400 mt-0.5">
                  Replaces your take-home salary with gross minus computed tax ({profile.taxRegime} regime) in every chart.
                  Off by default so existing plans stay unchanged.
                </div>
              </div>
              <button
                onClick={() => setTaxAware(!taxAware)}
                className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${taxAware ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700'}`}
                aria-pressed={taxAware}
                aria-label="Use gross salary + tax in projections"
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${taxAware ? 'left-6' : 'left-1'}`} />
              </button>
            </Card>
          )}

          <Card>
            <SectionTitle
              title="What-if: deductions"
              subtitle="Drag to see how investing more changes old-regime tax (new regime ignores these)"
              action={whatIf && (
                <button onClick={() => setWhatIf(null)} className="btn-ghost !py-1.5 text-sm">Reset to my plan</button>
              )}
            />
            <div className="space-y-4">
              {['80C', '80CCD1B', '80D'].map((section) => (
                <div key={section}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold">{SECTION_LABELS[section].name}
                      <span className="ml-2 text-xs text-ink-400 font-normal">{SECTION_LABELS[section].hint}</span>
                    </span>
                    <span className="font-bold tabular-nums">
                      {fmtMoney(whatIfSections[section].used)} <span className="text-xs text-ink-400 font-normal">/ {fmtMoney(whatIfSections[section].cap, { compact: true })}</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={whatIfSections[section].cap}
                    step={5000}
                    value={Math.min(deductions[section], whatIfSections[section].cap)}
                    onChange={(e) => setWhatIf({ ...deductions, [section]: Number(e.target.value) })}
                    className="w-full accent-brand-600"
                  />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <Card>
        <SectionTitle title="Deduction tracker" subtitle="What your plan actually uses, from tagged SIPs & expenses" />
        <div className="space-y-4">
          {['80C', '80CCD1B', '80D'].map((section) => {
            const s = actuals[section]
            return (
              <div key={section}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold">{SECTION_LABELS[section].name}
                    <span className="ml-2 text-xs text-ink-400 font-normal">{SECTION_LABELS[section].hint}</span>
                  </span>
                  <span className="font-bold tabular-nums">{fmtMoney(s.used)} <span className="text-xs text-ink-400 font-normal">/ {fmtMoney(s.cap, { compact: true })}</span></span>
                </div>
                <ProgressBar value={s.used} max={s.cap} color={s.used >= s.cap ? '#469b88' : '#377cc8'} />
              </div>
            )
          })}
        </div>
        {summary.ready && summary.nudges.length > 0 && (
          <div className="mt-4 space-y-2">
            {summary.nudges.map((n) => (
              <div key={n.section} className="rounded-xl bg-brand-50 dark:bg-brand-500/10 px-3 py-2 text-sm">
                <span className="font-semibold text-brand-700 dark:text-brand-300">
                  Invest {fmtMoney(n.headroom)} more in {n.hint} before {n.deadline}
                </span>{' '}
                <span className="text-ink-500">to save {fmtMoney(n.taxSaved)} in tax ({SECTION_LABELS[n.section].name}).</span>
              </div>
            ))}
          </div>
        )}
        {summary.ready && profile.taxRegime === 'new' && (
          <p className="mt-4 text-xs text-ink-400">
            Under the new regime these deductions don't reduce your tax — they still build wealth, but the tax break only applies if you file under the old regime.
          </p>
        )}
        <p className="mt-3 text-xs text-ink-400">
          Tag SIPs with 80C/80CCD(1B) in Accounts and health premiums with 80D in expenses to track them here. Estimates exclude HRA, home-loan interest and surcharge — verify with your CA before filing.
        </p>
      </Card>
    </div>
  )
}

function RegimeCard({ title, result, selected, recommended }) {
  return (
    <Card className={recommended ? 'ring-2 ring-emerald-400/60' : ''}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold">{title}</div>
        <div className="flex gap-1.5">
          {recommended && <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 rounded-full px-2 py-0.5">Cheapest</span>}
          {selected && <span className="text-[10px] font-bold uppercase tracking-wide bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 rounded-full px-2 py-0.5">Selected</span>}
        </div>
      </div>
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{fmtMoney(result.tax)}</div>
      <div className="text-xs text-ink-400 mt-0.5">
        effective {(result.effectiveRate * 100).toFixed(1)}% · marginal {(result.marginalRate * 100).toFixed(0)}%
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <Row label="Gross salary" value={fmtMoney(result.grossIncome)} />
        <Row label="Standard deduction" value={`− ${fmtMoney(result.standardDeduction)}`} />
        {result.deductionTotal > 0 && <Row label="Chapter VI-A deductions" value={`− ${fmtMoney(result.deductionTotal)}`} />}
        <Row label="Taxable income" value={fmtMoney(result.taxableIncome)} strong />
      </div>

      <div className="mt-3 border-t border-ink-100 dark:border-ink-800 pt-3">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-1.5">Slab breakdown</div>
        <div className="space-y-1 text-xs tabular-nums">
          {result.slabBreakdown.map((b, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-ink-500">
                {fmtMoney(b.from, { compact: true })} – {b.to == null ? '∞' : fmtMoney(b.to, { compact: true })} @ {Math.round(b.rate * 100)}%
              </span>
              <span className="font-semibold">{fmtMoney(b.amount)}</span>
            </div>
          ))}
          {result.rebate > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>§87A rebate{result.taxableIncome > 1200000 ? ' (marginal relief)' : ''}</span>
              <span className="font-semibold">− {fmtMoney(result.rebate)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-ink-500">Health & education cess (4%)</span>
            <span className="font-semibold">{fmtMoney(result.cess)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-bold' : ''}`}>
      <span className={strong ? '' : 'text-ink-500'}>{label}</span>
      <span className="tabular-nums">{value}</span>
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
