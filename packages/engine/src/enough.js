/* HOW MUCH IS ENOUGH — the FIRE number, solved against real market history.
 *
 * Every other projection in this app fixes the corpus and reports the outcome. This one
 * fixes the outcome — the money must last to plan age and still leave the bequest — and
 * solves for the corpus. One capability, pointed the other way.
 *
 * There is no Monte Carlo here and no assumed equity return. We replay the NIFTY 500 TRI
 * calendar years in their real order, once per starting year, wrapping when the plan
 * outlives the series, and take the smallest corpus that survives EVERY one of them.
 * Order matters as much as magnitude: bad years just after you retire mean redeeming into
 * a fall, and an average return has no order, so it cannot show that at all.
 *
 * Everything in this file is pure and works in RUPEES and DECIMAL RATES, like the rest of
 * the engine. Nothing reads global state, and no function mutates its argument — which is
 * what makes the per-age solve (`enoughCurve`) safe to run 50 times in a row.
 */

/** NIFTY 500 Total Returns Index, calendar-year returns.
 *  Source: NSE Indices (niftyindices.com › Reports › Historical Data › TRI values),
 *  last trading day of December year on year, computed rather than hand-typed.
 *  A genuine total-return series: dividends are already in it.
 *
 *  NIFTY and NIFTY 500 are trademarks of NSE Indices Limited. This app is not affiliated
 *  with, endorsed or sponsored by NSE Indices Limited or the National Stock Exchange of
 *  India, and it republishes none of their data — only yearly percentages derived from it.
 */
export const EQUITY_HISTORY = {
  startYear: 1995,
  returns: [
    -0.3435, -0.0595, 0.1450, -0.0684, 1.0092, -0.2345, -0.2155, 0.1392, 1.0485, 0.2107,
    0.3877, 0.3616, 0.6458, -0.5654, 0.9096, 0.1527, -0.2640, 0.3348, 0.0482, 0.3930,
    0.0022, 0.0512, 0.3765, -0.0214, 0.0897, 0.1789, 0.3160, 0.0425, 0.2691, 0.1624,
    0.0776,
  ],
}

export const SEQUENCE_COUNT = EQUITY_HISTORY.returns.length
export const EQUITY_END_YEAR = EQUITY_HISTORY.startYear + SEQUENCE_COUNT - 1

export const ENOUGH_ASSETS = {
  equity: 'Equity',
  debt: 'Debt & cash',
  gold: 'Gold',
  realEstate: 'Real estate',
  other: 'Other',
}

const ASSET_KEYS = Object.keys(ENOUGH_ASSETS)

/** Published defaults for the four classes we do NOT replay. Every one is editable, and
 *  each grows at its fixed rate every single year — they never have a bad one, which is
 *  why a debt-heavy answer here looks better than it should. Equity is absent on purpose:
 *  we do not assume a rate for it. */
export const DEFAULT_ENOUGH_RETURNS = { debt: 0.065, gold: 0.08, realEstate: 0.07, other: 0.08 }

/** Safest first. Equity is only touched when everything before it is gone. */
export const WATERFALL_ORDER = ['debt', 'gold', 'realEstate', 'other', 'equity']

export const DEFAULT_ENOUGH_MIX = { equity: 0, debt: 0, gold: 0, realEstate: 0, other: 0 }

/** Long-run compound rate of the equity series — computed, never typed. */
export function equityCagr() {
  const p = EQUITY_HISTORY.returns.reduce((acc, r) => acc * (1 + r), 1)
  return Math.pow(p, 1 / SEQUENCE_COUNT) - 1
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const num = (v, fallback = 0) => (Number.isFinite(+v) ? +v : fallback)

/**
 * Fills in every field the solver reads, normalises the allocation to weights, and
 * pre-computes the tax gross-up. Call it once and pass the result around: the solver runs
 * tens of thousands of years of arithmetic and should not be re-parsing config each time.
 *
 * Returns `mixSet: false` when no allocation was given. That is not an error to paper over
 * with a default — a default allocation is a recommendation, and this app does not make
 * recommendations. The caller must ask.
 */
export function normalizeEnoughInput(raw = {}) {
  const currentAge = Math.max(0, Math.round(num(raw.currentAge, 30)))
  const planAge = Math.max(currentAge + 1, Math.round(num(raw.planAge, 90)))
  const retireAge = Math.min(planAge - 1, Math.max(currentAge, Math.round(num(raw.retireAge, 60))))
  const currentYear = Math.round(num(raw.currentYear, new Date().getFullYear()))

  const mixRaw = { ...DEFAULT_ENOUGH_MIX, ...(raw.mix || {}) }
  let total = 0
  ASSET_KEYS.forEach((k) => { mixRaw[k] = Math.max(0, num(mixRaw[k])); total += mixRaw[k] })
  const weights = {}
  ASSET_KEYS.forEach((k) => { weights[k] = total > 0 ? mixRaw[k] / total : 0 })

  const returns = { ...DEFAULT_ENOUGH_RETURNS, ...(raw.returns || {}) }
  ASSET_KEYS.filter((k) => k !== 'equity').forEach((k) => { returns[k] = num(returns[k]) })

  // Every rupee spent in retirement is a rupee sold, and a long-term equity gain is taxed.
  // Modelling that exactly needs per-lot cost basis, which this app cannot know. So: one
  // honest approximation, stated on screen and editable — a share of each withdrawal is
  // gain, and that share is taxed. To spend ₹100 you must sell grossUp × ₹100.
  const taxRate = Math.min(0.6, Math.max(0, num(raw.taxRate, 0.125)))
  const taxGainShare = Math.min(1, Math.max(0, num(raw.taxGainShare, 0.6)))
  const drag = taxRate * taxGainShare
  const grossUp = drag > 0 && drag < 0.95 ? 1 / (1 - drag) : 1

  const goals = (raw.goals || [])
    .filter((g) => g && g.on !== false && num(g.amount) !== 0)
    .map((g, i) => {
      const atAge = Math.round(num(g.atAge, currentAge + 1))
      return {
        id: g.id ?? `g${i}`,
        name: g.name || 'Goal',
        amount: num(g.amount),
        atAge,
        untilAge: g.untilAge == null ? atAge : Math.max(atAge, Math.round(num(g.untilAge, atAge))),
        inflation: Math.max(0, num(g.inflation, num(raw.inflation, 0.06))),
      }
    })

  return {
    currentAge,
    retireAge,
    planAge,
    currentYear,
    inflation: Math.max(0, Math.min(0.4, num(raw.inflation, 0.06))),
    spendMonthly: Math.max(0, num(raw.spendMonthly)),
    goals,
    bequest: Math.max(0, num(raw.bequest)),
    haveNow: raw.haveNow == null ? null : Math.max(0, num(raw.haveNow)),
    saveMonthly: raw.saveMonthly == null ? null : Math.max(0, num(raw.saveMonthly)),
    stepUp: Math.max(0, Math.min(0.4, num(raw.stepUp, 0.06))),
    mix: mixRaw,
    weights,
    mixSet: total > 0,
    returns,
    taxRate,
    taxGainShare,
    grossUp,
    drawdown: raw.drawdown === 'waterfall' ? 'waterfall' : 'rebalance',
    // A break from work: an inclusive age range in which nothing is contributed and living
    // costs come out of what has been saved so far. Preview-only in the UI — the plan has no
    // field for it — so it arrives via "What if" and is not persisted.
    pause: raw.pause && raw.pause.from != null && raw.pause.to != null
      ? { from: Math.round(num(raw.pause.from)), to: Math.round(num(raw.pause.to)) }
      : null,
  }
}

/** True when the cost of living is set above every rate in the plan. The arithmetic still
 *  works; the answer does not mean anything, so callers say so rather than block. */
export function inflationOutrunsEverything(cfg) {
  const rates = []
  if (cfg.weights.equity > 0) rates.push(equityCagr())
  ASSET_KEYS.filter((k) => k !== 'equity').forEach((k) => {
    if (cfg.weights[k] > 0) rates.push(cfg.returns[k])
  })
  return rates.length > 0 && cfg.inflation > Math.max(...rates)
}

// ---------------------------------------------------------------------------
// The pot: five balances, each growing at its own rate
// ---------------------------------------------------------------------------
//
// One pot growing at the blended rate is arithmetically a portfolio held exactly at target
// every year — rebalanced continuously, free of cost and free of tax, with every withdrawal
// taken pro-rata. A fine simplification, and a strategy nobody runs. So the pot is five
// balances and the strategy decides which one is sold. NOTHING rebalances on its own in
// either mode: the only thing that moves money between assets is a cash flow.

const splitAtTarget = (cfg, total) => {
  const b = {}
  ASSET_KEYS.forEach((k) => { b[k] = Math.max(0, total) * cfg.weights[k] })
  return b
}

const balanceTotal = (b) => ASSET_KEYS.reduce((t, k) => t + b[k], 0)

/** Takes `need` out of `b` (mutates it) and returns whatever could not be raised. */
function takeOut(cfg, b, need) {
  if (need <= 0) return 0
  const total = balanceTotal(b)
  if (need >= total) {
    ASSET_KEYS.forEach((k) => { b[k] = 0 })
    return need - total
  }
  if (cfg.drawdown === 'waterfall') {
    // When one is emptied the rest comes from the next, which is why a bad year can still
    // reach equity — it just takes everything else being gone first.
    let left = need
    for (const k of WATERFALL_ORDER) {
      if (left <= 0) break
      const take = Math.min(b[k], left)
      b[k] -= take
      left -= take
    }
    return left > 1e-6 ? left : 0
  }
  // Sell what is overweight, in proportion to how overweight it is. The gaps from the
  // POST-withdrawal target sum to exactly `need`, so scaling the positive ones to `need`
  // never buys anything and never sells an underweight asset.
  const after = total - need
  const over = {}
  let sum = 0
  ASSET_KEYS.forEach((k) => {
    const d = b[k] - cfg.weights[k] * after
    if (d > 0) { over[k] = d; sum += d }
  })
  if (sum <= 0) {
    ASSET_KEYS.forEach((k) => { b[k] -= (b[k] / total) * need })
    return 0
  }
  const f = need / sum
  Object.keys(over).forEach((k) => { b[k] = Math.max(0, b[k] - over[k] * f) })
  return 0
}

/** Puts `add` in (mutates `b`). Rebalance-at-withdrawal buys whatever is furthest below
 *  target — the mirror of how it sells. Waterfall never rebalances, so new money simply
 *  follows the target split. */
function putIn(cfg, b, add) {
  if (add <= 0) return
  if (cfg.drawdown === 'waterfall') {
    ASSET_KEYS.forEach((k) => { b[k] += add * cfg.weights[k] })
    return
  }
  const after = balanceTotal(b) + add
  const under = {}
  let sum = 0
  ASSET_KEYS.forEach((k) => {
    const d = cfg.weights[k] * after - b[k]
    if (d > 0) { under[k] = d; sum += d }
  })
  if (sum <= 0) {
    ASSET_KEYS.forEach((k) => { b[k] += add * cfg.weights[k] })
    return
  }
  const f = Math.min(1, add / sum)
  let placed = 0
  Object.keys(under).forEach((k) => { const put = under[k] * f; b[k] += put; placed += put })
  const rest = add - placed
  if (rest > 1e-6) ASSET_KEYS.forEach((k) => { b[k] += rest * cfg.weights[k] })
}

/** One year of market. Equity from the record; everything else at its fixed rate. */
function growYear(cfg, b, seqIndex) {
  ASSET_KEYS.forEach((k) => {
    const r = k === 'equity'
      ? EQUITY_HISTORY.returns[((seqIndex % SEQUENCE_COUNT) + SEQUENCE_COUNT) % SEQUENCE_COUNT]
      : cfg.returns[k]
    b[k] = Math.max(0, b[k] * (1 + r))
  })
}

// ---------------------------------------------------------------------------
// Cash flows
// ---------------------------------------------------------------------------

const retireYear = (cfg, retireAge = cfg.retireAge) => cfg.currentYear + (retireAge - cfg.currentAge)
const endYear = (cfg) => cfg.currentYear + (cfg.planAge - cfg.currentAge)

/** Goals falling due in a given calendar year, each grown at its own rate. Signed: a
 *  negative amount is money arriving, and it nets against the year's withdrawal. */
export function goalsDueInYear(cfg, year) {
  let due = 0
  for (const g of cfg.goals) {
    const y0 = cfg.currentYear + (g.atAge - cfg.currentAge)
    const y1 = cfg.currentYear + (g.untilAge - cfg.currentAge)
    if (year < y0 || year > y1) continue
    due += g.amount * Math.pow(1 + g.inflation, year - cfg.currentYear)
  }
  return due
}

const livingCost = (cfg, year) =>
  cfg.spendMonthly * 12 * Math.pow(1 + cfg.inflation, year - cfg.currentYear)

/** The legacy, in the rupees of the last year of the plan. */
export const bequestNominal = (cfg) =>
  cfg.bequest > 0 ? cfg.bequest * Math.pow(1 + cfg.inflation, cfg.planAge - cfg.currentAge) : 0

// ---------------------------------------------------------------------------
// One life
// ---------------------------------------------------------------------------

/**
 * Retirement, replayed once.
 *
 * `start` is either an amount — the solved target, handed over on the day, so it is split
 * at the target weights because that is what the figure means — or a set of balances, from
 * a life that saved its way here and arrives holding whatever the drift left it. Re-splitting
 * those would be a free rebalance at exactly the moment the strategy forbids one.
 *
 * THE YEAR'S MONEY COMES OUT FIRST, THEN WHAT IS LEFT GROWS. A retiree spends from January,
 * not from December. It is the reading that cannot flatter the plan.
 */
export function runRetirement(cfg, start, seqStart, seqOffset = 0, retireAge = cfg.retireAge) {
  const from = retireYear(cfg, retireAge)
  const to = endYear(cfg)
  const bal = typeof start === 'object' && start !== null
    ? { ...start }
    : splitAtTarget(cfg, start)

  let pot = balanceTotal(bal)
  let ruinYear = null
  const row = [pot]
  const legacy = bequestNominal(cfg)

  for (let year = from + 1; year <= to; year += 1) {
    if (ruinYear != null) { row.push(0); continue }
    const need = (livingCost(cfg, year) + goalsDueInYear(cfg, year)) * cfg.grossUp
    const short = takeOut(cfg, bal, need)
    if (short > 0) { ruinYear = year; row.push(0); continue }
    growYear(cfg, bal, seqStart + seqOffset + (year - from - 1))
    pot = Math.max(0, balanceTotal(bal))
    row.push(pot)
  }

  return {
    ok: ruinYear == null && pot >= legacy - 1e-6,
    ruinYear,
    end: ruinYear == null ? pot : 0,
    row,
    balances: bal,
    legacy,
  }
}

/**
 * The saving years, on the same engine as the decumulation years.
 *
 * This used to be a textbook annuity at one blended rate, which made the target
 * stress-tested and the path to it average-case — two different beliefs about markets, on
 * one screen. Now the same sequences run forwards.
 *
 * Goals falling due before you retire are paid out of these years, not ignored: a 2032 bill
 * cannot come from a 2035 corpus, but it is still money you have to find, so it raises what
 * you must put away rather than vanishing.
 */
export function runAccumulation(cfg, monthly, seqStart, startAmount = 0, retireAge = cfg.retireAge) {
  const to = retireYear(cfg, retireAge)
  const bal = splitAtTarget(cfg, startAmount)
  const row = [Math.max(0, startAmount)]
  let ok = true

  for (let year = cfg.currentYear + 1; year <= to; year += 1) {
    const t = year - cfg.currentYear - 1
    const age = cfg.currentAge + (year - cfg.currentYear)
    // On a break from work nothing goes in, and that year's living costs are drawn from what
    // has been saved so far — the same expense the retirement years pay, arriving early.
    const onBreak = cfg.pause != null && age >= cfg.pause.from && age <= cfg.pause.to
    const goalBill = goalsDueInYear(cfg, year) * cfg.grossUp
    const breakBill = onBreak ? livingCost(cfg, year) * cfg.grossUp : 0
    // Out first, then growth, then this year's contribution at the end of the year. A goal
    // falling due while you are still saving is a withdrawal like any other, so it obeys
    // the same strategy — otherwise one plan would price a goal at 46 under one rule and a
    // goal at 60 under another.
    const billNow = (goalBill > 0 ? goalBill : 0) + breakBill
    if (billNow > 0 && takeOut(cfg, bal, billNow) > 0) ok = false
    if (goalBill < 0) putIn(cfg, bal, -goalBill)
    growYear(cfg, bal, seqStart + t)
    if (!onBreak) putIn(cfg, bal, monthly * 12 * Math.pow(1 + cfg.stepUp, t))
    row.push(Math.max(0, balanceTotal(bal)))
  }

  row.ok = ok
  // The composition at the end, not just the total — the retirement half continues from it.
  row.balances = bal
  return row
}

// ---------------------------------------------------------------------------
// Tests a candidate corpus has to pass
// ---------------------------------------------------------------------------

const survivesEvery = (cfg, corpus, retireAge) => {
  for (let st = 0; st < SEQUENCE_COUNT; st += 1) {
    if (!runRetirement(cfg, corpus, st, 0, retireAge).ok) return false
  }
  return true
}

const survivesMedian = (cfg, corpus, retireAge) => {
  let n = 0
  for (let st = 0; st < SEQUENCE_COUNT; st += 1) {
    if (runRetirement(cfg, corpus, st, 0, retireAge).ok) n += 1
  }
  return n * 2 > SEQUENCE_COUNT
}

const arrivesEvery = (cfg, monthly, corpus, retireAge) => {
  for (let st = 0; st < SEQUENCE_COUNT; st += 1) {
    const r = runAccumulation(cfg, monthly, st, cfg.haveNow || 0, retireAge)
    if (!r.ok || r[r.length - 1] < corpus) return false
  }
  return true
}

const arrivesMedian = (cfg, monthly, corpus, retireAge) => {
  let n = 0
  for (let st = 0; st < SEQUENCE_COUNT; st += 1) {
    const r = runAccumulation(cfg, monthly, st, cfg.haveNow || 0, retireAge)
    if (r.ok && r[r.length - 1] >= corpus) n += 1
  }
  return n * 2 > SEQUENCE_COUNT
}

/** Smallest value that passes `test`, by doubling then halving. Returns null when no
 *  amount passes — which is a real answer, not a failure: at some rates the spending
 *  grows faster than the money however much you start with. */
export function solveSmallest(test, { cap = 1e18 } = {}) {
  let hi = 1
  let guard = 0
  while (!test(hi) && guard < 200) { hi *= 2; guard += 1; if (hi > cap) return null }
  if (!test(hi)) return null
  let lo = 0
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2
    if (test(mid)) hi = mid
    else lo = mid
  }
  return hi
}

// ---------------------------------------------------------------------------
// The answers
// ---------------------------------------------------------------------------

/** The smallest corpus at `retireAge` that survives every sequence. */
export function enoughAtAge(cfg, retireAge) {
  if (retireAge >= cfg.planAge) return 0
  return solveSmallest((c) => survivesEvery(cfg, c, retireAge))
}

/**
 * The headline answer for the age on the plan, plus what it takes to get there.
 *
 * `target` is a standing start: the amount that lasts if it were handed to you on the day,
 * with no history behind it. `sip` is the smallest monthly amount that reaches that target
 * in every sequence, from whatever you already hold — tested the same way the target was,
 * against all of them, not against an average.
 */
export function solveEnough(input) {
  const cfg = input.weights ? input : normalizeEnoughInput(input)
  if (!cfg.mixSet) return { cfg, mixSet: false, target: null, sip: null }

  const target = enoughAtAge(cfg, cfg.retireAge)
  const targetMedian = cfg.retireAge >= cfg.planAge
    ? 0
    : solveSmallest((c) => survivesMedian(cfg, c, cfg.retireAge))
  const years = Math.max(0, cfg.retireAge - cfg.currentAge)

  let sip = null
  let sipMedian = null
  if (target != null && years > 0) {
    sip = solveSmallest((m) => arrivesEvery(cfg, m, target, cfg.retireAge))
    sipMedian = solveSmallest((m) => arrivesMedian(cfg, m, target, cfg.retireAge))
  }

  return {
    cfg,
    mixSet: true,
    target,
    targetMedian,
    sip,
    sipMedian,
    years,
    retireYear: retireYear(cfg),
    endYear: endYear(cfg),
    /** Read as a multiple of spending if that helps — but nothing here assumed a
     *  withdrawal rate, so this describes the answer rather than being its method.
     *
     *  BOTH SIDES MUST BE IN THE SAME YEAR'S RUPEES. The target is nominal, priced on the
     *  day you retire, so it is divided by the spending OF THAT YEAR — not today's. Divided
     *  by today's it read 134×, which is not a corpus multiple, it is thirty years of
     *  inflation wearing one. */
    expenseMultiple: target != null && cfg.spendMonthly > 0
      ? target / (cfg.spendMonthly * 12 * Math.pow(1 + cfg.inflation, cfg.retireAge - cfg.currentAge))
      : null,
  }
}

/**
 * THE ENOUGH CURVE. At every age, the smallest corpus that survives every sequence from
 * that age to the end of the plan. Where it meets your own money is the age you can
 * retire — the answer this whole feature exists to give, readable without touching a
 * control.
 *
 * IT IS NOMINAL, LIKE EVERY FIGURE HERE, so it RISES with age even though the number of
 * years left to pay for falls: at 65 there are fewer years but each is priced in 2056
 * rupees. Discount it by inflation and the real curve falls, which is the intuition
 * people arrive with — the UI must not let those two readings be confused.
 *
 * One full solve per age, so it is the expensive call here. Compute it once per plan.
 */
export function enoughCurve(cfg) {
  const out = []
  for (let age = cfg.currentAge; age <= cfg.planAge; age += 1) {
    out.push(enoughAtAge(cfg, age))
  }
  return out
}

/** How each life ends. The engine has always known the year every failing run hits zero;
 *  "in the worst history you run out at 71" is the most useful sentence a set of runs can
 *  produce, so it is returned rather than thrown away. */
function summariseEndings(cfg, ends, ruinYears) {
  const sorted = ends.map((v) => Math.max(0, v)).sort((a, b) => a - b)
  const outs = ruinYears.filter((y) => y != null)
  return {
    endWorst: sorted[0],
    endMedian: sorted[Math.floor((sorted.length - 1) / 2)],
    endBest: sorted[sorted.length - 1],
    ruinCount: outs.length,
    ruinAge: outs.length ? cfg.currentAge + (Math.min(...outs) - cfg.currentYear) : null,
  }
}

/** A run that runs out is worse than one that does not; among those that run out, the one
 *  that runs out soonest is worst; among survivors, the one that ends with least. One rule,
 *  used by the chart and by the year-by-year table, so the two cannot disagree. */
function worstIndex(ends, ruinYears) {
  let best = 0
  let score = Infinity
  for (let i = 0; i < ends.length; i += 1) {
    const s = ruinYears[i] != null ? -1e15 + ruinYears[i] : ends[i]
    if (s < score) { score = s; best = i }
  }
  return best
}

/**
 * The picture: one line per age from today to plan age.
 *
 * When we know what you hold and what you put away, each sequence is replayed as ONE
 * CONTINUOUS LIFE — the years that build the pot are the years that then spend it. That is
 * the truer account, and usually the kinder of the two tests, so a plan can sit under the
 * target and still never run out.
 *
 * Otherwise we draw the solved plan: the saving run that arrives with least, joined to the
 * retirement it pays for.
 *
 * `worst` is ONE REAL RUN, not a per-age minimum, because the year-by-year table is the
 * same figures written out and a reader adds up the rows. `best` is stitched from whichever
 * run was luckiest that year — a range, travelled by nobody, and the UI must say so.
 */
export function projectEnoughPaths(cfg, { target = null, sip = null } = {}) {
  const ages = []
  for (let a = cfg.currentAge; a <= cfg.planAge; a += 1) ages.push(a)
  const accYears = Math.max(0, cfg.retireAge - cfg.currentAge)
  const live = cfg.haveNow != null || cfg.saveMonthly != null

  let runs
  let retireIndex = accYears

  if (live) {
    runs = []
    for (let st = 0; st < SEQUENCE_COUNT; st += 1) {
      const acc = runAccumulation(cfg, cfg.saveMonthly || 0, st, cfg.haveNow || 0)
      const dec = runRetirement(cfg, accYears > 0 ? acc.balances : (cfg.haveNow || 0), st, accYears)
      runs.push(acc.concat(dec.row.slice(1)))
    }
  } else {
    // The binding saving run — the one that arrives with least. The monthly amount was
    // solved so that this run lands exactly on the target, which is where the retirement
    // half starts, so the two halves join at one point and it is a life, not a stitch.
    let accRow = null
    if (sip != null && accYears > 0) {
      const rows = []
      for (let st = 0; st < SEQUENCE_COUNT; st += 1) rows.push(runAccumulation(cfg, sip, st, cfg.haveNow || 0))
      let worst = 0
      for (let st = 1; st < SEQUENCE_COUNT; st += 1) {
        if (rows[st][accYears] < rows[worst][accYears]) worst = st
      }
      accRow = rows[worst]
    }
    runs = []
    for (let st = 0; st < SEQUENCE_COUNT; st += 1) {
      const dec = runRetirement(cfg, target ?? 0, st).row
      runs.push(accRow ? accRow.concat(dec.slice(1)) : new Array(accYears).fill(null).concat(dec))
    }
  }

  const last = ages.length - 1
  const ends = runs.map((r) => r[last] ?? 0)
  const ruinYears = runs.map((r) => {
    for (let i = retireIndex; i < r.length; i += 1) {
      if (r[i] != null && r[i] <= 1e-4) return cfg.currentYear + i
    }
    return null
  })
  const wi = worstIndex(ends, ruinYears)

  const worst = []
  const median = []
  const best = []
  for (let i = 0; i < ages.length; i += 1) {
    const col = runs.map((r) => r[i]).filter((v) => v != null).sort((a, b) => a - b)
    worst.push(runs[wi][i])
    median.push(col.length ? col[Math.floor((col.length - 1) / 2)] : null)
    best.push(col.length ? col[col.length - 1] : null)
  }

  return {
    ages,
    worst,
    median,
    best,
    worstRun: runs[wi],
    worstSequenceStart: EQUITY_HISTORY.startYear + wi,
    retireIndex,
    retireAge: cfg.retireAge,
    target,
    sip,
    live,
    legacy: bequestNominal(cfg),
    ...summariseEndings(cfg, ends, ruinYears),
  }
}

/**
 * The year-by-year table: the same worst run, written out.
 *
 * `out` is what the pot actually loses — tax included, because the engine grosses every
 * withdrawal up and a table that printed the pre-tax bill could never add up against the
 * corpus column. The goal rows on screen print the BILL; this prints the SALE.
 */
export function enoughYearRows(cfg, path) {
  const rows = []
  for (let i = 0; i < path.ages.length; i += 1) {
    const year = cfg.currentYear + i
    const afterRetirement = i > path.retireIndex
    const contributing = i >= 1 && i <= path.retireIndex
    const monthly = path.live ? (cfg.saveMonthly || 0) : (path.sip ?? 0)
    const moneyIn = contributing ? monthly * 12 * Math.pow(1 + cfg.stepUp, i - 1) : 0
    const moneyOut = i >= 1
      ? (goalsDueInYear(cfg, year) + (afterRetirement ? livingCost(cfg, year) : 0)) * cfg.grossUp
      : 0
    const left = path.worst[i]
    const prev = i > 0 ? path.worst[i - 1] : null
    rows.push({
      age: path.ages[i],
      year,
      moneyIn,
      moneyOut,
      corpus: left,
      isRetireYear: path.ages[i] === cfg.retireAge,
      // Marked on the one year it happens. A run of ₹0 after it implies a balance still
      // being tracked, and there is nothing left to track.
      ranOutHere: left != null && left <= 1e-4 && prev != null && prev > 1e-4,
      spent: left != null && left <= 1e-4 && i > 0,
    })
  }
  return rows
}

// ---------------------------------------------------------------------------
// When can you stop
// ---------------------------------------------------------------------------

/** Whether retiring at `age` works on what you hold and put away now. */
export function worksAtAge(cfg, age, mode = 'worst') {
  if (age >= cfg.planAge) return false
  const corpus = mode === 'median'
    ? solveSmallest((c) => survivesMedian(cfg, c, age))
    : enoughAtAge(cfg, age)
  if (corpus == null) return false
  const monthly = cfg.saveMonthly || 0
  return mode === 'median'
    ? arrivesMedian(cfg, monthly, corpus, age)
    : arrivesEvery(cfg, monthly, corpus, age)
}

/**
 * The earliest age that works. Only answerable if you said what you hold or what you put
 * away — both optional, and a blank box is not a zero.
 *
 * Later is always easier: more years of saving, fewer years to fund. That monotonicity is
 * what lets this bisect instead of trying every year, which matters because each probe is
 * a full solve plus 31 accumulation replays.
 */
export function earliestRetirementAge(cfg, mode = 'worst') {
  if (cfg.haveNow == null && cfg.saveMonthly == null) return null
  const top = cfg.planAge - 1
  if (!worksAtAge(cfg, top, mode)) return null
  let lo = cfg.currentAge
  let hi = top
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (worksAtAge(cfg, mid, mode)) hi = mid
    else lo = mid + 1
  }
  return lo
}

/**
 * Retiring today — the one question that never changes meaning, whatever the inputs are.
 * The retirement age is set to this year, so nothing needs discounting: every figure here
 * is already in today's money.
 */
export function retireTodayVerdict(cfg) {
  const age = cfg.currentAge
  const need = age >= cfg.planAge ? 0 : enoughAtAge(cfg, age)
  const have = cfg.haveNow
  if (have == null || age >= cfg.planAge) {
    return { age, need, have, ok: null, ruinAge: null, endWorst: null }
  }
  const runs = []
  for (let st = 0; st < SEQUENCE_COUNT; st += 1) runs.push(runRetirement(cfg, have, st, 0, age))
  const summary = summariseEndings(cfg, runs.map((r) => r.end), runs.map((r) => r.ruinYear))
  return {
    age,
    need,
    have,
    ok: runs.every((r) => r.ok),
    ruinAge: summary.ruinAge,
    endWorst: summary.endWorst,
  }
}

/**
 * What you will actually be holding on the day.
 *
 * Once the target is quoted in the rupees of the year you retire, subtracting a corpus
 * stated in today's rupees is not arithmetic — it is two different units. So the holding is
 * carried forward through the same sequences, at the saving you actually do, and the WORST
 * of those arrivals is the figure, because the worst run is the arbiter everywhere else here.
 */
export function forwardCorpus(cfg) {
  if (cfg.haveNow == null && cfg.saveMonthly == null) return null
  if (cfg.retireAge <= cfg.currentAge) return cfg.haveNow || 0
  let worst = Infinity
  for (let st = 0; st < SEQUENCE_COUNT; st += 1) {
    const r = runAccumulation(cfg, cfg.saveMonthly || 0, st, cfg.haveNow || 0)
    worst = Math.min(worst, r[r.length - 1])
  }
  return worst
}
