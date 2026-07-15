// The "journey" layer — calm gamification derived entirely from real plan data.
// Pure functions: no persistence, no fabricated numbers. Everything here is a
// reframing of the projection/readiness the engine already computes.

import { computeTaxSummary } from './tax.js'

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const active = (x, age) => (x.startAge ?? 0) <= age && age <= (x.endAge ?? 200)
const INVESTABLE_TYPES = new Set(['investment', 'retirement'])

// ---- shared plan snapshot (the handful of aggregates every metric needs) ----
function planStats(state) {
  const { profile, accounts = [], incomes = [], expenses = [], contributions = [] } = state
  const age = profile.currentAge
  const assets = accounts.filter((a) => a.kind === 'asset')
  const liabilities = accounts.filter((a) => a.kind === 'liability')
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
  const totalLiab = liabilities.reduce((s, a) => s + a.balance, 0)
  const cash = assets.filter((a) => a.type === 'cash').reduce((s, a) => s + a.balance, 0)

  const yearlyIncome = incomes.filter((i) => active(i, age)).reduce((s, i) => s + i.amount, 0)
  const yearlyExpense = expenses.filter((e) => active(e, age)).reduce((s, e) => s + e.amount, 0)
  const yearlyContrib = contributions.reduce((s, c) => s + c.amount, 0)
  const monthlyExpense = yearlyExpense / 12
  const savingsRate = yearlyIncome > 0 ? (yearlyIncome - yearlyExpense) / yearlyIncome : 0

  const emergencyTarget = monthlyExpense * 6
  const emergencyRatio = emergencyTarget > 0 ? clamp((cash / emergencyTarget) * 100) / 100 : (cash > 0 ? 1 : 0)
  const hasHealthCover = expenses.some((e) => e.section === '80D' || /health|insurance|term/i.test(e.name || ''))
  const highInterest = liabilities.filter((l) => (l.growth ?? 0) >= 0.12)

  return {
    age, assets, liabilities, totalAssets, totalLiab,
    netWorth: totalAssets - totalLiab, cash,
    yearlyIncome, yearlyExpense, yearlyContrib, monthlyExpense,
    savingsRate, emergencyTarget, emergencyRatio, hasHealthCover, highInterest,
    sipRunning: yearlyContrib > 0,
  }
}

// Effective number of asset classes held (1/HHI over financial assets), 1..N.
function diversificationScore(assets) {
  const financial = assets.filter((a) => a.type !== 'real-estate')
  const total = financial.reduce((s, a) => s + a.balance, 0)
  if (total <= 0) return 0
  const byType = {}
  financial.forEach((a) => { byType[a.type] = (byType[a.type] || 0) + a.balance })
  const hhi = Object.values(byType).reduce((s, v) => s + (v / total) ** 2, 0)
  const effectiveN = 1 / hhi // 1 (concentrated) .. 3+ (spread)
  return clamp(((effectiveN - 1) / (3 - 1)) * 100)
}

const DIMENSION_META = [
  { key: 'saving', label: 'Saving' },
  { key: 'protection', label: 'Protection' },
  { key: 'debt', label: 'Debt health' },
  { key: 'diversification', label: 'Diversification' },
  { key: 'retirement', label: 'Retirement readiness' },
]
const WEIGHTS = { saving: 0.25, retirement: 0.25, debt: 0.2, protection: 0.15, diversification: 0.15 }

function bandFor(score) {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Strong'
  if (score >= 60) return 'Fit'
  if (score >= 40) return 'Building'
  return 'Getting started'
}
function statusFor(score) {
  if (score >= 70) return 'good'
  if (score >= 55) return 'ok'
  return 'warn'
}

/**
 * Financial Fitness — one 0–100 score built from five real dimensions.
 * Reuses computeReadiness for the retirement dimension.
 */
export function computeFitness(state, projection, readiness) {
  const p = planStats(state)

  const saving = clamp((p.savingsRate / 0.30) * 100)
  const protection = clamp(p.emergencyRatio * 60 + (p.hasHealthCover ? 40 : 0))
  const dti = p.totalAssets > 0 ? p.totalLiab / p.totalAssets : (p.totalLiab > 0 ? 1 : 0)
  const debt = clamp(100 - dti * 120 - (p.highInterest.length ? 15 : 0))
  const diversification = diversificationScore(p.assets)
  const retirement = clamp(readiness?.score ?? 0)

  const raw = { saving, protection, debt, diversification, retirement }
  const hints = {
    saving: 'Aim to invest 20%+ of income.',
    protection: !p.hasHealthCover ? 'No health cover found — add an 80D premium.' : 'Build your 6-month emergency fund.',
    debt: p.highInterest.length ? 'Clear high-interest debt (>12%) first.' : 'Bring loans down relative to assets.',
    diversification: 'Spread across equity, retirement and cash.',
    retirement: 'Raise SIPs or extend the horizon to lift success.',
  }

  const dimensions = DIMENSION_META.map(({ key, label }) => {
    const score = Math.round(raw[key])
    const status = statusFor(score)
    return { key, label, score, status, hint: status === 'warn' ? hints[key] : null }
  })

  const score = Math.round(
    DIMENSION_META.reduce((s, { key }) => s + raw[key] * WEIGHTS[key], 0),
  )
  return { score, band: bandFor(score), dimensions }
}

// ---- Life stages: a path with a single "you are here" ----
const STAGE_DEFS = [
  { key: 'foundation', label: 'Foundation', sub: 'First ₹1L saved', met: (p) => p.netWorth >= 100000 },
  { key: 'safety', label: 'Safety', sub: '6-month emergency fund', met: (p) => p.emergencyTarget > 0 && p.cash >= p.emergencyTarget },
  { key: 'growth', label: 'Growth', sub: 'Investing 20%+', met: (p) => p.savingsRate >= 0.20 && p.sipRunning },
  { key: 'freedom', label: 'Freedom', sub: 'Work optional', met: (p, ctx) => ctx.coastReached },
  { key: 'legacy', label: 'Legacy', sub: 'Corpus outlives you', met: (p, ctx) => ctx.readiness?.success && ctx.readiness?.endNetWorth >= ctx.readiness?.retireNetWorth && ctx.readiness.retireNetWorth > 0 },
]

export function computeStages(state, projection, readiness) {
  const p = planStats(state)
  const coast = coastFiAge(state, projection)
  const ctx = { readiness, coastReached: coast != null && coast <= p.age }

  const met = STAGE_DEFS.map((s) => s.met(p, ctx))
  // "You are here" = first unmet stage; everything before it is done.
  let hereIdx = met.findIndex((m) => !m)
  if (hereIdx === -1) hereIdx = STAGE_DEFS.length - 1
  const stages = STAGE_DEFS.map((s, i) => ({
    key: s.key, label: s.label, sub: s.sub,
    status: i < hereIdx ? 'done' : i === hereIdx ? 'here' : 'upcoming',
  }))
  const next = stages[hereIdx + 1] ? STAGE_DEFS[hereIdx + 1] : null
  return { stages, currentIndex: hereIdx, current: STAGE_DEFS[hereIdx], next, coastAge: coast }
}

// ---- This-month quests: the highest-leverage next moves ----
export function computeQuests(state, fitness) {
  const p = planStats(state)
  const quests = []

  if (!p.hasHealthCover) {
    quests.push({ id: 'health', icon: '🏥', title: 'Add health insurance (80D)',
      desc: 'Protects your savings from a medical shock — and lifts your Protection score.',
      tag: '+Protection', tone: 'warn' })
  }
  if (p.emergencyTarget > 0 && p.cash < p.emergencyTarget) {
    const short = p.emergencyTarget - p.cash
    quests.push({ id: 'emergency', icon: '🛟', title: 'Top up your emergency fund',
      desc: `₹${Math.round(short / 1000)}k more in cash/FD reaches 6 months of expenses.`,
      tag: '+Protection', tone: 'warn' })
  }

  // Reuse the tax engine's own headroom nudge (old regime only).
  try {
    const tax = computeTaxSummary(state)
    const nudge = tax?.nudges?.[0]
    if (nudge && nudge.headroom > 0) {
      quests.push({ id: 'tax-' + nudge.section, icon: '🎯',
        title: `Top up ${nudge.section} by ₹${Math.round(nudge.headroom / 1000)}k`,
        desc: `${nudge.hint} · saves ~₹${nudge.taxSaved.toLocaleString('en-IN')} in tax by ${nudge.deadline}.`,
        tag: 'Tax saved', tone: 'brand' })
    }
  } catch { /* tax summary needs grossSalary; skip if unavailable */ }

  if (p.savingsRate < 0.20 && p.yearlyIncome > 0) {
    quests.push({ id: 'sip', icon: '📈', title: 'Raise your monthly SIP',
      desc: `You're investing ${Math.round(p.savingsRate * 100)}% of income — nudging toward 20% compounds fast.`,
      tag: '+Saving', tone: 'brand' })
  }
  if (p.highInterest.length) {
    quests.push({ id: 'debt', icon: '🔥', title: `Clear ${p.highInterest[0].name}`,
      desc: 'Above 12% interest — paying this down beats most investment returns.',
      tag: '+Debt health', tone: 'warn' })
  }

  return quests.slice(0, 3)
}

// ---- Moments: auto-detected keepsakes, newest first ----
export function computeMoments(state, snapshots = [], projection = []) {
  const p = planStats(state)
  const moments = []
  const sorted = [...snapshots].sort((a, b) => (a.ym < b.ym ? -1 : 1))
  const first = sorted[0]

  if (p.totalLiab === 0 && p.liabilities.length === 0 && p.totalAssets > 0) {
    moments.push({ id: 'debt-free', label: 'Debt-free', title: 'You owe nothing 🎉',
      detail: 'Every rupee you earn is now yours to keep or grow.' })
  }
  if (p.netWorth >= 10000000) {
    moments.push({ id: 'crore', label: 'Milestone', title: 'First ₹1 Crore 🎉',
      detail: `Net worth crossed ₹1 Cr — a genuine inflection point.` })
  }
  if (first && first.netWorth > 0 && p.netWorth >= first.netWorth * 2) {
    moments.push({ id: 'doubled', label: 'Milestone', title: 'Net worth doubled 🎉',
      detail: `From ${money(first.netWorth)} to ${money(p.netWorth)} since ${first.ym}.` })
  }
  if (p.emergencyTarget > 0 && p.cash >= p.emergencyTarget) {
    moments.push({ id: 'emergency', label: 'Safety', title: 'Emergency fund complete',
      detail: '6 months of expenses set aside — your safety net is in place.' })
  }
  return moments
}

function money(n) {
  const abs = Math.abs(n)
  if (abs >= 1e7) return '₹' + parseFloat((abs / 1e7).toFixed(2)) + ' Cr'
  if (abs >= 1e5) return '₹' + parseFloat((abs / 1e5).toFixed(1)) + ' L'
  return '₹' + Math.round(abs).toLocaleString('en-IN')
}

// ---- Chart series -----------------------------------------------------------

/**
 * Who's building the corpus — cumulative contributions vs market growth.
 * Uses the investable account balances from the projection rows.
 */
export function growthVsContributions(state, projection) {
  const { accounts = [], contributions = [], profile } = state
  const investIds = accounts.filter((a) => a.kind === 'asset' && INVESTABLE_TYPES.has(a.type)).map((a) => a.id)
  if (!investIds.length) return []
  const startBalance = accounts.filter((a) => investIds.includes(a.id)).reduce((s, a) => s + a.balance, 0)
  const yearlyContrib = contributions
    .filter((c) => investIds.includes(c.accountId))
    .reduce((s, c) => s + c.amount, 0)
  const retireAge = profile.retirementAge

  return projection.map((row) => {
    const value = investIds.reduce((s, id) => s + (row[id] || 0), 0)
    const yearsWorked = Math.max(0, Math.min(row.age, retireAge) - profile.currentAge)
    const contributed = Math.round(startBalance + yearlyContrib * yearsWorked)
    const growth = Math.max(0, value - contributed)
    return { year: row.year, age: row.age, contributed: Math.min(contributed, value), growth }
  })
}

/** Savings rate per working year: (income − expense) / income, as a %. */
export function savingsRateSeries(state, projection) {
  const retireAge = state.profile.retirementAge
  return projection
    .filter((r) => r.age <= retireAge && r.income > 0)
    .map((r) => ({ year: r.year, age: r.age, rate: Math.round(((r.income - r.expense) / r.income) * 100) }))
}

/** Current allocation vs an age-based target, over financial assets only. */
export function allocationVsTarget(state) {
  const assets = (state.accounts || []).filter((a) => a.kind === 'asset' && a.type !== 'real-estate')
  const total = assets.reduce((s, a) => s + a.balance, 0)
  const age = state.profile.currentAge
  const equityTarget = clamp(100 - age, 40, 75)
  const targets = { investment: equityTarget, retirement: 100 - equityTarget - 10, cash: 10 }
  const labels = { investment: 'Equity', retirement: 'Retirement / debt', cash: 'Cash & FD' }
  const colors = { investment: '#6366f1', retirement: '#0ea5e9', cash: '#22c55e' }

  return ['investment', 'retirement', 'cash'].map((type) => {
    const bal = assets.filter((a) => a.type === type).reduce((s, a) => s + a.balance, 0)
    const current = total > 0 ? Math.round((bal / total) * 100) : 0
    return { key: type, label: labels[type], color: colors[type], current, target: Math.round(targets[type]), drift: current - Math.round(targets[type]) }
  })
}

/**
 * Coast-FI age — the earliest age at which stopping contributions still lets the
 * investable corpus grow to its planned retirement value (closed-form, no re-sim).
 * Returns null if the plan never reaches a coast point before retirement.
 */
export function coastFiAge(state, projection) {
  const { accounts = [], profile } = state
  const investAccts = accounts.filter((a) => a.kind === 'asset' && INVESTABLE_TYPES.has(a.type))
  if (!investAccts.length) return null
  const retireRow = projection.find((r) => r.age === profile.retirementAge)
  if (!retireRow) return null
  const goal = investAccts.reduce((s, a) => s + (retireRow[a.id] || 0), 0)
  if (goal <= 0) return null
  // Blend growth by balance weight for the discount rate.
  const wTotal = investAccts.reduce((s, a) => s + a.balance, 0) || 1
  const r = investAccts.reduce((s, a) => s + a.growth * a.balance, 0) / wTotal

  for (const row of projection) {
    if (row.age >= profile.retirementAge) break
    const value = investAccts.reduce((s, a) => s + (row[a.id] || 0), 0)
    const yearsLeft = profile.retirementAge - row.age
    const coastNeeded = goal / Math.pow(1 + r, yearsLeft)
    if (value >= coastNeeded) return row.age
  }
  return null
}

/** Age the corpus lasts to (retirement onward). lifeExpectancy if it never runs dry. */
export function corpusLastsToAge(state, projection) {
  const retireAge = state.profile.retirementAge
  const post = projection.filter((r) => r.age >= retireAge)
  const dry = post.find((r) => r.investable <= 0)
  return dry ? dry.age : state.profile.lifeExpectancy
}

/**
 * Consistency cells for the calm heatmap — the last `count` months.
 * level 0 = no snapshot (neutral gap), 1 = down, 2 = flat, 3 = up.
 * Also returns the current run of consecutive months with a snapshot.
 */
export function consistencyCells(snapshots = [], count = 24) {
  const byYm = new Map(snapshots.map((s) => [s.ym, s.netWorth]))
  const now = new Date()
  const cells = []
  let prevNw = null
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (byYm.has(ym)) {
      const nw = byYm.get(ym)
      const level = prevNw == null ? 3 : nw > prevNw ? 3 : nw < prevNw ? 1 : 2
      cells.push({ ym, level })
      prevNw = nw
    } else {
      cells.push({ ym, level: 0 })
    }
  }
  // steady run = consecutive present months ending at the most recent
  let steady = 0
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].level > 0) steady++
    else break
  }
  return { cells, steady }
}
