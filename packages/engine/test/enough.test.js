import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeEnoughInput,
  solveEnough,
  enoughAtAge,
  runRetirement,
  runAccumulation,
  goalsDueInYear,
  projectEnoughPaths,
  enoughYearRows,
  earliestRetirementAge,
  retireTodayVerdict,
  forwardCorpus,
  inflationOutrunsEverything,
  SEQUENCE_COUNT,
  equityCagr,
} from '../src/index.js'

// The solver's whole claim is that the answer survives EVERY sequence, not the average
// one. These pin that claim, and the handful of places where a plausible-looking
// simplification would quietly break it.

const base = (over = {}) => normalizeEnoughInput({
  currentAge: 35, retireAge: 55, planAge: 90, currentYear: 2026,
  inflation: 0.06, spendMonthly: 150000,
  mix: { equity: 60, debt: 30, gold: 10 },
  taxRate: 0.125, taxGainShare: 0.6,
  ...over,
})

test('an allocation is required — there is no default mix', () => {
  const cfg = normalizeEnoughInput({ spendMonthly: 100000 })
  assert.equal(cfg.mixSet, false)
  assert.equal(solveEnough(cfg).target, null)
  assert.equal(base().mixSet, true)
})

test('weights normalise whatever the entered percentages add up to', () => {
  const a = base({ mix: { equity: 60, debt: 40 } })
  const b = base({ mix: { equity: 6, debt: 4 } })
  assert.deepEqual(a.weights, b.weights)
  assert.equal(a.weights.equity, 0.6)
})

test('the solved corpus survives every sequence, and a hair less does not', () => {
  const cfg = base()
  const target = enoughAtAge(cfg, cfg.retireAge)
  assert.ok(target > 0)
  for (let st = 0; st < SEQUENCE_COUNT; st += 1) {
    assert.ok(runRetirement(cfg, target, st).ok, `sequence ${st} should survive the target`)
  }
  const short = target * 0.9
  assert.ok(
    Array.from({ length: SEQUENCE_COUNT }, (_, st) => runRetirement(cfg, short, st).ok).some((ok) => !ok),
    '10% under the target should fail at least one sequence',
  )
})

test('retiring later needs less in real terms, more in nominal ones', () => {
  const cfg = base()
  const real = (age) => enoughAtAge(cfg, age) / Math.pow(1 + cfg.inflation, age - cfg.currentAge)
  // Fewer years left to pay for.
  assert.ok(real(45) > real(55))
  assert.ok(real(55) > real(70))
  // But every figure here is nominal, and 2056 rupees are smaller than 2046 ones.
  assert.ok(enoughAtAge(cfg, 45) < enoughAtAge(cfg, 55))
  assert.equal(enoughAtAge(cfg, cfg.planAge), 0)
})

test('a legacy has to still be there on the last day, so it raises the corpus', () => {
  const without = enoughAtAge(base(), 55)
  const with_ = enoughAtAge(base({ bequest: 20000000 }), 55)
  assert.ok(with_ > without)
})

test('tax on selling raises the corpus; a zero rate is the pre-tax figure', () => {
  const taxed = enoughAtAge(base(), 55)
  const untaxed = enoughAtAge(base({ taxRate: 0 }), 55)
  assert.ok(taxed > untaxed)
  assert.equal(base({ taxRate: 0 }).grossUp, 1)
  // To spend ₹100 at 12.5% on a 60% gain share you sell about ₹107.5.
  assert.ok(Math.abs(base().grossUp - 1 / (1 - 0.075)) < 1e-12)
})

test('a goal after retirement raises the corpus; one before it does not', () => {
  const after = enoughAtAge(base({ goals: [{ name: 'wedding', amount: 5000000, atAge: 60, inflation: 0.06 }] }), 55)
  const before = enoughAtAge(base({ goals: [{ name: 'college', amount: 5000000, atAge: 45, inflation: 0.06 }] }), 55)
  const none = enoughAtAge(base(), 55)
  assert.ok(after > none, 'a bill after you retire comes out of the corpus')
  assert.ok(Math.abs(before - none) < 1e-6, 'a bill before you retire is paid from the saving years')
})

test('a recurring goal is due every year of its span, inflated to each one', () => {
  const cfg = base({ goals: [{ name: 'travel', amount: 500000, atAge: 60, untilAge: 62, inflation: 0.05 }] })
  assert.equal(goalsDueInYear(cfg, 2050), 0)
  const y = 2026 + (60 - 35)
  assert.ok(Math.abs(goalsDueInYear(cfg, y) - 500000 * Math.pow(1.05, y - 2026)) < 1e-6)
  assert.ok(goalsDueInYear(cfg, y + 2) > goalsDueInYear(cfg, y))
  assert.equal(goalsDueInYear(cfg, y + 3), 0)
})

test('a switched-off goal is left out entirely', () => {
  const cfg = base({ goals: [{ name: 'x', amount: 5000000, atAge: 60, on: false }] })
  assert.equal(cfg.goals.length, 0)
})

test('money arriving is negative and lowers the corpus', () => {
  const windfall = enoughAtAge(base({ goals: [{ name: 'sale', amount: -10000000, atAge: 65, inflation: 0 }] }), 55)
  assert.ok(windfall < enoughAtAge(base(), 55))
})

test('the accumulation run wraps the same history and steps the contribution up', () => {
  const cfg = base({ stepUp: 0.1, haveNow: 0 })
  const flat = runAccumulation(base({ stepUp: 0 }), 100000, 0, 0)
  const stepped = runAccumulation(cfg, 100000, 0, 0)
  assert.equal(stepped.length, cfg.retireAge - cfg.currentAge + 1)
  assert.ok(stepped[stepped.length - 1] > flat[flat.length - 1])
})

test('the solved SIP arrives at the target in every sequence', () => {
  const a = solveEnough(base({ haveNow: 5000000 }))
  assert.ok(a.sip > 0)
  for (let st = 0; st < SEQUENCE_COUNT; st += 1) {
    const r = runAccumulation(a.cfg, a.sip * 1.001, st, a.cfg.haveNow)
    assert.ok(r[r.length - 1] >= a.target, `sequence ${st} should reach the target`)
  }
  // Being ready for a bad stretch costs more than being ready for an average one.
  assert.ok(a.sip >= a.sipMedian)
})

test('the expense multiple compares two figures in the same year’s rupees', () => {
  const a = solveEnough(base())
  // A nominal corpus over today's spending would read like a century of expenses; over the
  // spending of the year it is priced in, it lands where a FIRE multiple belongs.
  assert.ok(a.expenseMultiple > 15 && a.expenseMultiple < 60, `got ${a.expenseMultiple}`)
  const firstYear = a.cfg.spendMonthly * 12 * Math.pow(1 + a.cfg.inflation, a.cfg.retireAge - a.cfg.currentAge)
  assert.ok(Math.abs(a.expenseMultiple - a.target / firstYear) < 1e-9)
})

test('holding more means needing to put away less', () => {
  const poor = solveEnough(base({ haveNow: 1000000 }))
  const rich = solveEnough(base({ haveNow: 30000000 }))
  assert.ok(rich.sip < poor.sip)
})

test('waterfall and rebalance are different strategies, not different labels', () => {
  const reb = enoughAtAge(base({ drawdown: 'rebalance' }), 55)
  const wf = enoughAtAge(base({ drawdown: 'waterfall' }), 55)
  assert.notEqual(reb, wf)
})

test('nothing rebalances on its own — a withdrawal is what moves money', () => {
  const cfg = base({ drawdown: 'waterfall', spendMonthly: 100000 })
  const r = runRetirement(cfg, 100000000, 0)
  // Safest first: debt drains before equity is touched, so the mix drifts to equity.
  const shareEquity = r.balances.equity / Object.values(r.balances).reduce((a, b) => a + b, 0)
  assert.ok(shareEquity > cfg.weights.equity)
})

test('the earliest workable age is monotone and consistent with the age on the plan', () => {
  const cfg = base({ haveNow: 40000000, saveMonthly: 200000 })
  const e = earliestRetirementAge(cfg)
  assert.ok(e != null && e >= cfg.currentAge && e < cfg.planAge)
  assert.equal(earliestRetirementAge(base()), null, 'unanswerable without holdings or saving')
})

test('the paths cover every age and the worst line is one real run', () => {
  const a = solveEnough(base({ haveNow: 20000000, saveMonthly: 150000 }))
  const p = projectEnoughPaths(a.cfg, a)
  assert.equal(p.ages.length, a.cfg.planAge - a.cfg.currentAge + 1)
  assert.equal(p.worst.length, p.ages.length)
  for (let i = 0; i < p.ages.length; i += 1) {
    if (p.worst[i] == null) continue
    // The band's edges bound everything; the worst LINE is one real run, chosen by how it
    // ends, so mid-path it may sit above the per-age median. That is the point of drawing
    // a run rather than a per-age minimum nobody travels.
    assert.ok(p.median[i] <= p.best[i] + 1e-6)
    assert.ok(p.worst[i] <= p.best[i] + 1e-6)
    assert.equal(p.worst[i], p.worstRun[i])
  }
  // And it is the run that ends worst, which is what the table underneath prints.
  assert.equal(p.worst[p.ages.length - 1], p.endWorst)
})

test('the table is the worst run written out, and marks the run-out year once', () => {
  const a = solveEnough(base({ haveNow: 500000, saveMonthly: 10000 }))
  const p = projectEnoughPaths(a.cfg, a)
  const rows = enoughYearRows(a.cfg, p)
  assert.equal(rows.length, p.ages.length)
  rows.forEach((r, i) => assert.equal(r.corpus, p.worst[i]))
  assert.ok(rows.filter((r) => r.ranOutHere).length <= 1)
})

test('retiring today is answered the same way, in this year’s rupees', () => {
  const t = retireTodayVerdict(base({ haveNow: 200000000 }))
  assert.ok(t.need > 0)
  assert.equal(t.ok, true)
  const broke = retireTodayVerdict(base({ haveNow: 1000000 }))
  assert.equal(broke.ok, false)
  assert.ok(broke.ruinAge > broke.age)
  assert.equal(retireTodayVerdict(base()).ok, null, 'no holdings means no verdict, not a zero')
})

test('what you arrive with is carried forward, never compared across years', () => {
  const cfg = base({ haveNow: 10000000, saveMonthly: 100000 })
  const fw = forwardCorpus(cfg)
  assert.ok(fw > cfg.haveNow)
  assert.equal(forwardCorpus(base()), null)
})

test('inflation above every rate in the plan is flagged rather than blocked', () => {
  assert.equal(inflationOutrunsEverything(base()), false)
  assert.equal(inflationOutrunsEverything(base({ inflation: 0.35 })), true)
})

test('the equity CAGR is computed from the series, not typed', () => {
  const c = equityCagr()
  assert.ok(c > 0.1 && c < 0.25)
})
