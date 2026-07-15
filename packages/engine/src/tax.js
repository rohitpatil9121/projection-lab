// India income-tax engine. Pure functions, no app state.
// Tables keyed by FY so a new year is a data-only change.

export const TAX_FY = '2025-26'

export const TAX_CONFIG = {
  '2025-26': {
    old: {
      // [upperBound|null, rate] — null = no upper bound
      slabs: [[250000, 0], [500000, 0.05], [1000000, 0.2], [null, 0.3]],
      slabsSenior: [[300000, 0], [500000, 0.05], [1000000, 0.2], [null, 0.3]],
      slabsSuperSenior: [[500000, 0], [1000000, 0.2], [null, 0.3]],
      standardDeduction: 50000,
      rebate: { limit: 500000, max: 12500, marginalRelief: false },
      deductionCaps: { '80C': 150000, '80CCD1B': 50000, '80D': 25000, '80D_SENIOR': 50000 },
    },
    new: {
      slabs: [[400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [null, 0.3]],
      standardDeduction: 75000,
      rebate: { limit: 1200000, max: 60000, marginalRelief: true },
      deductionCaps: {},
    },
    cess: 0.04,
  },
}

const slabsFor = (cfg, regime, age) => {
  const r = cfg[regime]
  if (regime === 'old') {
    if (age >= 80) return r.slabsSuperSenior
    if (age >= 60) return r.slabsSenior
  }
  return r.slabs
}

function walkSlabs(slabs, taxable) {
  let tax = 0
  let prev = 0
  const breakdown = []
  for (const [bound, rate] of slabs) {
    const to = bound == null ? Infinity : bound
    if (taxable <= prev) break
    const amount = (Math.min(taxable, to) - prev) * rate
    breakdown.push({ from: prev, to: bound, rate, amount: Math.round(amount) })
    tax += amount
    prev = to
  }
  return { tax, breakdown }
}

function cappedDeductions(deductions, caps, age) {
  const cap80D = age >= 60 ? (caps['80D_SENIOR'] ?? caps['80D'] ?? 0) : (caps['80D'] ?? 0)
  const applied = {
    '80C': Math.min(deductions['80C'] || 0, caps['80C'] ?? 0),
    '80CCD1B': Math.min(deductions['80CCD1B'] || 0, caps['80CCD1B'] ?? 0),
    '80D': Math.min(deductions['80D'] || 0, cap80D),
  }
  const total = applied['80C'] + applied['80CCD1B'] + applied['80D']
  return { applied, total }
}

/**
 * Compute income tax for one person, one FY.
 * grossIncome: annual gross salary income. deductions: raw (uncapped) amounts
 * by section, e.g. { '80C': 180000, '80CCD1B': 50000, '80D': 30000 }.
 */
export function computeTax({ grossIncome, regime = 'new', deductions = {}, age = 35, fy = TAX_FY }) {
  const cfg = TAX_CONFIG[fy]
  if (!cfg) throw new Error(`No tax config for FY ${fy}`)
  const r = cfg[regime]
  if (!r) throw new Error(`Unknown regime ${regime}`)

  const { applied, total: deductionTotal } = cappedDeductions(regime === 'old' ? deductions : {}, r.deductionCaps, age)
  const taxableIncome = Math.max(0, grossIncome - r.standardDeduction - deductionTotal)

  const slabs = slabsFor(cfg, regime, age)
  const { tax: slabTax, breakdown } = walkSlabs(slabs, taxableIncome)

  let rebate = 0
  let afterRebate = slabTax
  if (taxableIncome <= r.rebate.limit) {
    rebate = Math.min(slabTax, r.rebate.max)
    afterRebate = slabTax - rebate
  } else if (r.rebate.marginalRelief) {
    // Just above the rebate limit, tax cannot exceed income over the limit.
    const excess = taxableIncome - r.rebate.limit
    if (slabTax > excess) {
      rebate = slabTax - excess
      afterRebate = excess
    }
  }

  const cess = afterRebate * cfg.cess
  const tax = Math.round(afterRebate + cess)
  const marginalRate = taxableIncome > 0 ? marginalRateOf(slabs, taxableIncome) : 0

  return {
    fy,
    regime,
    grossIncome,
    standardDeduction: r.standardDeduction,
    deductionsApplied: applied,
    deductionTotal,
    taxableIncome,
    slabBreakdown: breakdown,
    slabTax: Math.round(slabTax),
    rebate: Math.round(rebate),
    cess: Math.round(cess),
    tax,
    effectiveRate: grossIncome > 0 ? tax / grossIncome : 0,
    marginalRate,
  }
}

function marginalRateOf(slabs, taxable) {
  let prev = 0
  for (const [bound, rate] of slabs) {
    const to = bound == null ? Infinity : bound
    if (taxable <= to) return rate
    prev = to
  }
  return slabs[slabs.length - 1][1]
}

/** Compare both regimes for the same income/deductions. */
export function compareRegimes({ grossIncome, deductions = {}, age = 35, fy = TAX_FY }) {
  const oldR = computeTax({ grossIncome, regime: 'old', deductions, age, fy })
  const newR = computeTax({ grossIncome, regime: 'new', deductions, age, fy })
  const recommended = newR.tax <= oldR.tax ? 'new' : 'old'
  return {
    old: oldR,
    new: newR,
    savings: Math.abs(oldR.tax - newR.tax),
    recommended,
    breakEvenDeductions: breakEvenDeductions({ grossIncome, age, fy, target: newR.tax }),
  }
}

// Smallest total 80C+80CCD1B+80D deduction at which old-regime tax drops to the
// new-regime tax. null if even maxed-out deductions leave old regime costlier.
function breakEvenDeductions({ grossIncome, age, fy, target }) {
  const caps = TAX_CONFIG[fy].old.deductionCaps
  const maxTotal = caps['80C'] + caps['80CCD1B'] + (age >= 60 ? caps['80D_SENIOR'] : caps['80D'])
  const taxAt = (d) => {
    // Fill sections in order; walkSlabs only cares about the total.
    const d80C = Math.min(d, caps['80C'])
    const d80CCD = Math.min(d - d80C, caps['80CCD1B'])
    const d80D = Math.min(d - d80C - d80CCD, age >= 60 ? caps['80D_SENIOR'] : caps['80D'])
    return computeTax({ grossIncome, regime: 'old', deductions: { '80C': d80C, '80CCD1B': d80CCD, '80D': d80D }, age, fy }).tax
  }
  if (taxAt(maxTotal) > target) return null
  let lo = 0
  let hi = maxTotal
  while (hi - lo > 1000) {
    const mid = Math.round((lo + hi) / 2)
    if (taxAt(mid) <= target) hi = mid
    else lo = mid
  }
  return hi
}

/** Sum plan contributions/expenses into per-section deduction usage vs caps. */
export function deductionsFromPlan({ contributions = [], expenses = [], age = 35, fy = TAX_FY }) {
  const caps = TAX_CONFIG[fy].old.deductionCaps
  const raw80C = contributions.filter((c) => c.section === '80C').reduce((s, c) => s + c.amount, 0)
  const raw80CCD = contributions.filter((c) => c.section === '80CCD1B').reduce((s, c) => s + c.amount, 0)
  const raw80D = expenses.filter((e) => e.section === '80D').reduce((s, e) => s + e.amount, 0)
  const cap80D = age >= 60 ? caps['80D_SENIOR'] : caps['80D']
  return {
    '80C': { raw: raw80C, used: Math.min(raw80C, caps['80C']), cap: caps['80C'] },
    '80CCD1B': { raw: raw80CCD, used: Math.min(raw80CCD, caps['80CCD1B']), cap: caps['80CCD1B'] },
    '80D': { raw: raw80D, used: Math.min(raw80D, cap80D), cap: cap80D },
    total: Math.min(raw80C, caps['80C']) + Math.min(raw80CCD, caps['80CCD1B']) + Math.min(raw80D, cap80D),
  }
}

const SECTION_HINTS = {
  '80C': 'ELSS / PPF / EPF',
  '80CCD1B': 'NPS',
  '80D': 'health insurance',
}

/**
 * One-stop summary for UI pages. Needs profile.grossSalary to be set;
 * otherwise returns { ready: false } so pages can render a setup prompt.
 */
export function computeTaxSummary(state) {
  const { profile, contributions = [], expenses = [] } = state
  const age = profile.currentAge ?? 35
  const gross = profile.grossSalary
  const sections = deductionsFromPlan({ contributions, expenses, age })
  if (gross == null || !(gross > 0)) {
    return { ready: false, sections }
  }
  const deductions = { '80C': sections['80C'].raw, '80CCD1B': sections['80CCD1B'].raw, '80D': sections['80D'].raw }
  const comparison = compareRegimes({ grossIncome: gross, deductions, age })
  const regime = profile.taxRegime === 'old' || profile.taxRegime === 'new' ? profile.taxRegime : comparison.recommended
  const current = comparison[regime]

  const fyEndYear = Number('20' + TAX_FY.split('-')[1])
  const nudges = []
  if (regime === 'old') {
    for (const section of ['80C', '80CCD1B', '80D']) {
      const { used, cap } = sections[section]
      const headroom = cap - used
      if (headroom > 0) {
        nudges.push({
          section,
          headroom,
          hint: SECTION_HINTS[section],
          taxSaved: Math.round(headroom * current.marginalRate * 1.04),
          deadline: `Mar 31 ${fyEndYear}`,
        })
      }
    }
    nudges.sort((a, b) => b.taxSaved - a.taxSaved)
  }

  return {
    ready: true,
    fy: TAX_FY,
    regime,
    regimeSource: profile.taxRegime ? 'profile' : 'auto',
    current,
    comparison,
    sections,
    nudges,
    switchSavings: regime === comparison.recommended ? 0 : comparison.savings,
  }
}
