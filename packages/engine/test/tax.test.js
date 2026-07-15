import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeTax, compareRegimes, deductionsFromPlan, computeTaxSummary } from '../src/tax.js'
import { computeTaxSavings } from '../src/index.js'
import { defaultPlanPayload, defaultProfile } from '../../schema/src/index.js'

// --- New regime (FY 2025-26) ---

test('new regime: taxable 12L is tax-free via 87A', () => {
  // Gross 12.75L salaried → 75k std deduction → taxable 12,00,000
  const r = computeTax({ grossIncome: 1275000, regime: 'new' })
  assert.equal(r.taxableIncome, 1200000)
  assert.equal(r.slabTax, 60000)
  assert.equal(r.tax, 0)
})

test('new regime: 87A marginal relief just above 12L', () => {
  // Taxable 12,10,000: slab tax 61,500 but relief caps it at the 10,000 excess (+4% cess)
  const r = computeTax({ grossIncome: 1285000, regime: 'new' })
  assert.equal(r.taxableIncome, 1210000)
  assert.equal(r.slabTax, 61500)
  assert.equal(r.tax, 10400)
})

test('new regime: full slab walk at 25L gross', () => {
  // Taxable 24,25,000 → 20k + 40k + 60k + 80k + 100k + 7.5k = 3,07,500 + 4% cess
  const r = computeTax({ grossIncome: 2500000, regime: 'new' })
  assert.equal(r.taxableIncome, 2425000)
  assert.equal(r.slabTax, 307500)
  assert.equal(r.cess, 12300)
  assert.equal(r.tax, 319800)
  assert.equal(r.marginalRate, 0.3)
})

test('new regime: low income pays nothing', () => {
  assert.equal(computeTax({ grossIncome: 300000, regime: 'new' }).tax, 0)
})

test('new regime ignores chapter VI-A deductions', () => {
  const withD = computeTax({ grossIncome: 2500000, regime: 'new', deductions: { '80C': 150000 } })
  const without = computeTax({ grossIncome: 2500000, regime: 'new' })
  assert.equal(withD.tax, without.tax)
})

// --- Old regime ---

test('old regime: taxable 5L is tax-free via 87A', () => {
  const r = computeTax({ grossIncome: 550000, regime: 'old' })
  assert.equal(r.taxableIncome, 500000)
  assert.equal(r.tax, 0)
})

test('old regime: 10L gross with 1.5L 80C', () => {
  // Taxable 8,00,000 → 12,500 + 60,000 = 72,500 + 4% cess = 75,400
  const r = computeTax({ grossIncome: 1000000, regime: 'old', deductions: { '80C': 150000 } })
  assert.equal(r.taxableIncome, 800000)
  assert.equal(r.slabTax, 72500)
  assert.equal(r.tax, 75400)
})

test('old regime: 80C capped at 1.5L', () => {
  const r = computeTax({ grossIncome: 1000000, regime: 'old', deductions: { '80C': 400000 } })
  assert.equal(r.deductionsApplied['80C'], 150000)
  assert.equal(r.taxableIncome, 800000)
})

test('old regime: senior citizen 3L exemption', () => {
  // Age 62, gross 8L → taxable 7.5L → 10,000 + 50,000 = 60,000 + cess = 62,400
  const r = computeTax({ grossIncome: 800000, regime: 'old', age: 62 })
  assert.equal(r.taxableIncome, 750000)
  assert.equal(r.tax, 62400)
})

// --- Comparison ---

test('compareRegimes: new regime wins for typical salaried case', () => {
  const c = compareRegimes({
    grossIncome: 1000000,
    deductions: { '80C': 150000, '80CCD1B': 50000, '80D': 25000 },
  })
  assert.equal(c.new.tax, 0)
  assert.equal(c.old.tax, 59800)
  assert.equal(c.recommended, 'new')
  assert.equal(c.savings, 59800)
  // Modeled deductions alone can never make old regime match zero new-regime tax
  assert.equal(c.breakEvenDeductions, null)
})

// --- Plan-derived deductions ---

test('deductionsFromPlan against default sample plan', () => {
  const s = deductionsFromPlan({
    contributions: defaultPlanPayload.contributions,
    expenses: defaultPlanPayload.expenses,
    age: 32,
  })
  assert.equal(s['80C'].raw, 330000)
  assert.equal(s['80C'].used, 150000)
  assert.equal(s['80CCD1B'].used, 50000)
  assert.equal(s['80D'].raw, 30000)
  assert.equal(s['80D'].used, 25000)
  assert.equal(s.total, 225000)
})

test('deductionsFromPlan: 80D cap rises to 50k at age 60', () => {
  const s = deductionsFromPlan({ expenses: [{ section: '80D', amount: 60000 }], age: 62 })
  assert.equal(s['80D'].cap, 50000)
  assert.equal(s['80D'].used, 50000)
})

// --- Summary + nudges ---

test('computeTaxSummary: not ready without grossSalary', () => {
  const s = computeTaxSummary({ profile: { ...defaultProfile, grossSalary: null }, ...defaultPlanPayload })
  assert.equal(s.ready, false)
  assert.ok(s.sections)
})

test('computeTaxSummary: old-regime nudge quantifies 80C headroom', () => {
  const s = computeTaxSummary({
    profile: { ...defaultProfile, grossSalary: 2000000, taxRegime: 'old' },
    accounts: [],
    contributions: [{ id: 'c1', accountId: 'x', amount: 100000, section: '80C' }],
    expenses: [],
  })
  assert.equal(s.ready, true)
  assert.equal(s.regime, 'old')
  const n80c = s.nudges.find((n) => n.section === '80C')
  assert.equal(n80c.headroom, 50000)
  // 30% marginal × 1.04 cess on 50k headroom
  assert.equal(n80c.taxSaved, 15600)
  assert.ok(s.switchSavings > 0) // recommendation is 'new'; switching would save
})

test('computeTaxSummary: no deduction nudges under new regime', () => {
  const s = computeTaxSummary({
    profile: { ...defaultProfile, grossSalary: 2000000, taxRegime: 'new' },
    accounts: [],
    contributions: [],
    expenses: [],
  })
  assert.equal(s.nudges.length, 0)
  assert.equal(s.switchSavings, 0)
})

// --- Backward compat ---

test('computeTaxSavings keeps legacy shape', () => {
  const r = computeTaxSavings({
    contributions: defaultPlanPayload.contributions,
    expenses: defaultPlanPayload.expenses,
    profile: defaultProfile,
  })
  assert.equal(r.used80C, 150000)
  assert.equal(r.used80CCD, 50000)
  assert.equal(r.used80D, 25000)
  assert.equal(r.totalDeduction, 225000)
  assert.equal(r.taxSaved, Math.round(225000 * 0.3 * 1.04))
  assert.equal(r.regime, 'old')
})
