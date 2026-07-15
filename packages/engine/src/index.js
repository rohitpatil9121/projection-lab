export { fmtMoney, fmtPct, fmtNum } from './format.js'
export { evaluateGoal } from './goals.js'
export { computeTax, compareRegimes, deductionsFromPlan, computeTaxSummary, TAX_CONFIG, TAX_FY } from './tax.js'
export {
  computeFitness,
  computeStages,
  computeQuests,
  computeMoments,
  growthVsContributions,
  savingsRateSeries,
  allocationVsTarget,
  coastFiAge,
  corpusLastsToAge,
  consistencyCells,
} from './journey.js'
import { deductionsFromPlan as _deductionsFromPlan, computeTax as _computeTax } from './tax.js'

export const CURRENT_YEAR = 2026

const CASH_BUFFER = 300000

const clampFlow = (item, age) => (age >= item.startAge && age <= item.endAge ? 1 : 0)
const grownAmount = (item, yearsFromNow) => item.amount * Math.pow(1 + (item.growth || 0), yearsFromNow)

export function accountRoles(accounts) {
  const cashId = (accounts.find((a) => a.type === 'cash') || {}).id
  const invAssets = accounts.filter((a) => a.kind === 'asset' && (a.type === 'investment' || a.type === 'retirement'))
  const drawOrder = [...invAssets]
    .sort((a, b) => (b.type === 'investment' ? 1 : 0) - (a.type === 'investment' ? 1 : 0))
    .map((a) => a.id)
  return { cashId, drawOrder, investableIds: invAssets.map((a) => a.id) }
}

// Tax-aware mode (opt-in): swap the take-home 'salary' flow for gross salary
// minus computed income tax. Deductions are held at current-year nominal usage.
function taxContext(state) {
  if (!state.taxAware) return null
  const { profile, incomes, contributions = [], expenses = [] } = state
  const gross = profile?.grossSalary
  if (!(gross > 0)) return null
  const salary = incomes.find((i) => i.id === 'salary')
  if (!salary) return null
  const deductions = {
    '80C': contributions.filter((c) => c.section === '80C').reduce((s, c) => s + c.amount, 0),
    '80CCD1B': contributions.filter((c) => c.section === '80CCD1B').reduce((s, c) => s + c.amount, 0),
    '80D': expenses.filter((e) => e.section === '80D').reduce((s, e) => s + e.amount, 0),
  }
  return { salary, gross, deductions, regime: profile.taxRegime || 'new' }
}

// Income delta for year t: (gross − tax) replaces the take-home salary amount.
function salarySwapDelta(ctx, t, age) {
  if (!ctx || !clampFlow(ctx.salary, age)) return 0
  const grossT = ctx.gross * Math.pow(1 + (ctx.salary.growth || 0), t)
  const { tax } = _computeTax({ grossIncome: grossT, regime: ctx.regime, deductions: ctx.deductions, age })
  return grossT - tax - grownAmount(ctx.salary, t)
}

export function computeProjection(state) {
  const { profile, accounts, incomes, expenses, contributions } = state
  const { currentAge, retirementAge, lifeExpectancy } = profile
  const startYear = state.currentYear || CURRENT_YEAR

  const taxCtx = taxContext(state)
  const { cashId, drawOrder, investableIds } = accountRoles(accounts)

  const bal = {}
  accounts.forEach((a) => (bal[a.id] = a.balance))

  const rows = []
  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const t = age - currentAge
    const year = startYear + t
    const working = age < retirementAge

    const incomeTotal = incomes.reduce((s, i) => s + grownAmount(i, t) * clampFlow(i, age), 0) + salarySwapDelta(taxCtx, t, age)
    const expenseTotal = expenses.reduce((s, e) => s + grownAmount(e, t) * clampFlow(e, age), 0)
    const eventCash = (state.events || []).filter((e) => e.age === age).reduce((s, e) => s + e.amount, 0)

    accounts.forEach((a) => {
      if (a.kind === 'liability') {
        bal[a.id] = Math.max(0, bal[a.id] * (1 - (a.payoff ?? 0.06)))
      } else {
        bal[a.id] = bal[a.id] * (1 + a.growth)
      }
    })

    if (working) {
      contributions.forEach((c) => {
        if (bal[c.accountId] != null) bal[c.accountId] += c.amount
      })
    }

    const contribTotal = working ? contributions.reduce((s, c) => s + c.amount, 0) : 0
    const surplus = incomeTotal - expenseTotal - contribTotal + eventCash
    if (cashId != null) {
      bal[cashId] += surplus
      if (bal[cashId] < CASH_BUFFER) {
        for (const id of drawOrder) {
          if (bal[cashId] >= CASH_BUFFER) break
          const pull = Math.min(bal[id], CASH_BUFFER - bal[cashId])
          bal[id] -= pull
          bal[cashId] += pull
        }
      }
    }

    const d = state.realTerms ? 1 / Math.pow(1 + (profile.inflation || 0), t) : 1

    const row = { year, age }
    let assets = 0
    let liabilities = 0
    accounts.forEach((a) => {
      row[a.id] = Math.round(bal[a.id] * d)
      if (a.kind === 'liability') liabilities += bal[a.id]
      else assets += bal[a.id]
    })
    row.assets = Math.round(assets * d)
    row.liabilities = Math.round(liabilities * d)
    row.netWorth = Math.round((assets - liabilities) * d)
    row.income = Math.round(incomeTotal * d)
    row.expense = Math.round(expenseTotal * d)
    row.investable = Math.round(investableIds.reduce((s, id) => s + (bal[id] || 0), 0) * d)
    rows.push(row)
  }
  return rows
}

export function computeReadiness(state, projection) {
  const retireRow = projection.find((r) => r.age === state.profile.retirementAge)
  const endRow = projection[projection.length - 1]
  const postRetire = projection.filter((r) => r.age >= state.profile.retirementAge)
  const lowest = postRetire.length ? Math.min(...postRetire.map((r) => r.investable)) : 0
  const success = lowest > 0 && endRow.netWorth > 0
  return {
    retireNetWorth: retireRow ? retireRow.netWorth : 0,
    endNetWorth: endRow.netWorth,
    lowestInvestable: lowest,
    success,
    score: success
      ? Math.min(99, 72 + Math.round((lowest / 2000000) * 15))
      : Math.max(15, 55 + Math.round(lowest / 500000)),
  }
}

/** @deprecated Use deductionsFromPlan / computeTaxSummary from tax.js instead. */
export function computeTaxSavings(state) {
  const { contributions, expenses, profile } = state
  const s = _deductionsFromPlan({ contributions, expenses, age: profile.currentAge ?? 35 })
  const taxSaved = Math.round(s.total * (profile.taxSlab || 0.3) * 1.04)
  return {
    used80C: s['80C'].used, cap80C: s['80C'].cap,
    used80CCD: s['80CCD1B'].used, cap80CCD: s['80CCD1B'].cap,
    used80D: s['80D'].used, cap80D: s['80D'].cap,
    totalDeduction: s.total,
    taxSaved,
    regime: profile.taxRegime,
  }
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const volOf = (a) =>
  a.vol != null
    ? a.vol
    : ({ investment: 0.18, 'real-estate': 0.08, cash: 0.01, retirement: a.id === 'nps' ? 0.09 : 0.02 }[a.type] ?? 0.05)

const percentile = (sorted, p) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)))]

export function runMonteCarlo(state, { runs = 500, seed = 1 } = {}) {
  const { profile, accounts, incomes, expenses, contributions } = state
  const { currentAge, retirementAge, lifeExpectancy, inflation = 0 } = profile
  const startYear = state.currentYear || CURRENT_YEAR
  const taxCtx = taxContext(state)
  const { cashId, drawOrder, investableIds } = accountRoles(accounts)
  const years = lifeExpectancy - currentAge + 1

  const rng = mulberry32(seed || 1)
  const gaussian = () => {
    let u = 0, v = 0
    while (u === 0) u = rng()
    while (v === 0) v = rng()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  const nwByYear = Array.from({ length: years }, () => [])
  const endInvest = []
  let successCount = 0

  for (let r = 0; r < runs; r++) {
    const bal = {}
    accounts.forEach((a) => (bal[a.id] = a.balance))
    let survived = true

    for (let y = 0; y < years; y++) {
      const age = currentAge + y
      const working = age < retirementAge
      const incomeTotal = incomes.reduce((s, i) => s + grownAmount(i, y) * clampFlow(i, age), 0) + salarySwapDelta(taxCtx, y, age)
      const expenseTotal = expenses.reduce((s, e) => s + grownAmount(e, y) * clampFlow(e, age), 0)
      const eventCash = (state.events || []).filter((e) => e.age === age).reduce((s, e) => s + e.amount, 0)

      accounts.forEach((a) => {
        if (a.kind === 'liability') {
          bal[a.id] = Math.max(0, bal[a.id] * (1 - (a.payoff ?? 0.06)))
        } else {
          const ret = a.growth + gaussian() * volOf(a)
          bal[a.id] = Math.max(0, bal[a.id] * (1 + ret))
        }
      })

      if (working) contributions.forEach((c) => { if (bal[c.accountId] != null) bal[c.accountId] += c.amount })
      const contribTotal = working ? contributions.reduce((s, c) => s + c.amount, 0) : 0
      const surplus = incomeTotal - expenseTotal - contribTotal + eventCash
      if (cashId != null) {
        bal[cashId] += surplus
        if (bal[cashId] < CASH_BUFFER) {
          for (const id of drawOrder) {
            if (bal[cashId] >= CASH_BUFFER) break
            const pull = Math.min(bal[id], CASH_BUFFER - bal[cashId])
            bal[id] -= pull
            bal[cashId] += pull
          }
        }
      }

      const d = state.realTerms ? 1 / Math.pow(1 + inflation, y) : 1
      let assets = 0, liabilities = 0
      accounts.forEach((a) => { if (a.kind === 'liability') liabilities += bal[a.id]; else assets += bal[a.id] })
      const investable = investableIds.reduce((s, id) => s + (bal[id] || 0), 0)
      if (age >= retirementAge && investable <= 0) survived = false
      nwByYear[y].push((assets - liabilities) * d)
      if (y === years - 1) endInvest.push(investable * d)
    }
    if (survived) successCount++
  }

  const bands = nwByYear.map((vals, y) => {
    const s = vals.sort((a, b) => a - b)
    const p10 = percentile(s, 0.1), p25 = percentile(s, 0.25), p50 = percentile(s, 0.5),
      p75 = percentile(s, 0.75), p90 = percentile(s, 0.9)
    return {
      year: startYear + y, age: currentAge + y,
      p10, p50, p90,
      base: p10, b1: p25 - p10, b2: p75 - p25, b3: p90 - p75,
    }
  })

  const endSorted = [...endInvest].sort((a, b) => a - b)
  const lastNw = [...nwByYear[years - 1]].sort((a, b) => a - b)
  return {
    bands,
    runs,
    successRate: successCount / runs,
    medianEnd: percentile(lastNw, 0.5),
    p10End: percentile(lastNw, 0.1),
    p90End: percentile(lastNw, 0.9),
    medianInvestEnd: percentile(endSorted, 0.5),
  }
}
