/* WHAT IF — reading one plain sentence into changes to a FIRE plan.
 *
 * This is the engine half of the "What if" tab. It is pure and knows nothing about React,
 * the store or the network. It does three jobs:
 *
 *   1  scopeOfSentence — decide, on this device, whether a sentence is even about this
 *      app before anything is sent anywhere. Three outcomes: 'ok', 'advice', 'off'.
 *   2  readEnoughSentence — read the common sentences directly, with no model at all. A
 *      sentence the app already understands never has to leave the device.
 *   3  WHAT_IF_OPS / applyWhatIfOps — apply a list of operations to a *raw* enough-input
 *      object (the plain object handed to normalizeEnoughInput), on a clone.
 *
 * AMOUNTS ARE RUPEES, AGES ARE WHOLE YEARS — the same units the rest of the app works in,
 * so an op can be applied to a raw input with no conversion. The natural-language layer
 * accepts lakh/crore/k and converts here, once.
 *
 * THE MODEL, WHEN THERE IS ONE, NEVER STATES A FIGURE. It returns operations and at most a
 * line of prose; every number the user sees is computed by the engine from the same market
 * history as everything else. That contract lives in the UI/back end; this file only reads
 * and applies operations, so a wrong number cannot originate here.
 */

import { fmtMoney } from './format.js'

const money = (v) => fmtMoney(v, { compact: true })

// ---------------------------------------------------------------------------
// Amounts and ages
// ---------------------------------------------------------------------------

// Rupees per unit. A bare small number is read as lakhs (how Indians say it out loud); a
// bare number in the thousands is read as rupees.
const UNIT_RUPEES = {
  k: 1e3, thousand: 1e3,
  l: 1e5, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5,
  cr: 1e7, crore: 1e7, crores: 1e7,
}

/** Parses "1.5 lakh", "2cr", "50k", "1,50,000", "₹85000" into rupees, or null. */
export function parseAmount(str) {
  const m = String(str).replace(/,/g, '').match(/(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(k|thousand|l|lakhs?|lacs?|cr|crores?)?/i)
  if (!m) return null
  const n = parseFloat(m[1])
  if (!Number.isFinite(n)) return null
  const u = (m[2] || '').toLowerCase()
  if (u && UNIT_RUPEES[u] != null) return n * UNIT_RUPEES[u]
  return n >= 1000 ? n : n * 1e5
}

const ageIn = (t) => {
  const m = t.match(/\bat\s*(?:age\s*)?(\d{2})\b/) || t.match(/\bage\s*(\d{2})\b/)
  return m ? +m[1] : null
}

// ---------------------------------------------------------------------------
// Scope — decided here, before anything is sent
// ---------------------------------------------------------------------------

const OFF = [
  /ignore (all |any |the )?(previous|prior|above|earlier)/i, /disregard .{0,20}(instruction|rule|prompt)/i,
  /system prompt|your (instruction|prompt|rules)|repeat (the |everything )?above|print your/i,
  /you are (now|no longer)|pretend (to be|you)|act as|roleplay|role-play|jailbreak|\bDAN\b|developer mode/i,
  /write (me )?(a |some )?(code|script|program|function|essay|poem|story|song|joke|email|letter|resume|cv)/i,
  /\b(python|javascript|typescript|sql|html|css|regex|bash|c\+\+|java)\b/i,
  /translate|summari[sz]e this (article|text|page)|recipe|homework|assignment|lyrics/i,
  /\b(weather|news|sports|score|election|movie|film|celebrity)\b/i,
  /diagnos|symptom|prescri|\bdosage\b|lawsuit|sue |legal advice|visa |immigration/i,
  /base64|rot13|encode|decode|cipher|prompt inject/i,
  /api[_ -]?key|token|credential|bearer|env var/i,
]
const ADVICE = [
  /which (fund|stock|share|scheme|amc|etf|nps|policy|insurance|bank)/i,
  /(should|shall) i (buy|sell|invest|switch|redeem|book|exit|put|hold)/i,
  /\b(recommend|suggest|best|top|good) .{0,24}(fund|stock|scheme|etf|amc|portfolio|allocation|investment|split|mix)\b/i,
  /\b(stock|share|crypto|bitcoin) (tip|pick|recommendation)/i,
  /what should i (invest|buy|do with my money)/i,
  /\b(smallcap|midcap|largecap|index fund|mutual fund) .{0,20}(better|best|good|choose|pick)/i,
]
const DOMAIN = /retire|retirement|fire\b|corpus|sip|save|saving|savings|spend|spending|expense|expenses|inflation|allocation|equity|debt|gold|goal|lakh|crore|₹|rupee|age\b|year|years|month|monthly|pension|epf|ppf|nps|withdraw|drawdown|portfolio|plan|break|sabbatical|windfall|inherit|bonus|tax|ltcg|money|income|salary|freedom|work|job|quit|hold|holding|legacy|bequest|kid|child|college|wedding|house|travel/i

/** 'ok' | 'advice' | 'off' — computed on this device, so a sentence trying to talk its way
 *  past a refusal never reaches a model that could be talked to. */
export function scopeOfSentence(text) {
  const t = String(text)
  for (const r of OFF) if (r.test(t)) return 'off'
  for (const r of ADVICE) if (r.test(t)) return 'advice'
  if (!DOMAIN.test(t)) return 'off'
  return 'ok'
}

// ---------------------------------------------------------------------------
// Reading a sentence, with no model
// ---------------------------------------------------------------------------

/**
 * Reads a plain sentence into zero or more operations, using only regexes on this device.
 * `ctx` is { currentAge, retireAge } — used for the defaults a sentence leaves implicit
 * ("take 2 years off" with no age starts a few years before retirement).
 */
export function readEnoughSentence(text, ctx = {}) {
  const currentAge = Math.round(ctx.currentAge ?? 30)
  const retireAge = Math.round(ctx.retireAge ?? 60)
  const t = ` ${String(text).toLowerCase().replace(/\s+/g, ' ')} `
  const ops = []

  // A break from work — read alone, because it usually carries a duration that other rules
  // would misread as an age or amount.
  let m = t.match(/(\d+)\s*(?:year|yr)s?\s*(?:off|away|break|gap|sabbatical)/) || t.match(/(?:sabbatical|career break|take a break|time off)/)
  if (m) {
    const n = m[1] ? +m[1] : 1
    const from = ageIn(t) || Math.max(currentAge + 1, retireAge - 5)
    ops.push({ op: 'breakYears', from, to: from + n - 1 })
    return ops
  }

  // Money arriving later (not something you already hold or spend).
  if (/\b(windfall|bonus|inherit|inheritance|esop|sell|selling|sale|payout|exit|get|gets|getting|receive|coming in|comes in|expect|expecting|due)\b/.test(t)
      && !/\b(spend|spending|save|saving|sip|have|holding)\b/.test(t)) {
    const v = parseAmount(t)
    if (v != null) ops.push({ op: 'windfall', amount: v, age: ageIn(t) || currentAge, name: 'Money coming in' })
  }

  // Retire at
  if (/\b(stop|retire|quit|leave work)\b/.test(t)) {
    const a = ageIn(t) || (t.match(/\b(?:stop|retire|quit)\w*\s+(?:at\s+)?(\d{2})\b/) || [])[1]
    if (a) ops.push({ op: 'retireAt', age: +a })
  }

  // Plan until
  m = t.match(/\bplan\w*\s*(?:till|until|to)\s*(\d{2,3})\b/)
  if (m) ops.push({ op: 'planTo', age: +m[1] })

  // Spending
  if (/\bspend|spending|live on|living on|monthly (?:cost|expense)/.test(t)) {
    const v = parseAmount(t)
    if (v != null) ops.push({ op: 'spendMonthly', amount: v })
  }

  // Already have
  if (/\b(?:i have|already have|holding|invested|corpus of|portfolio of)\b/.test(t)) {
    const v = parseAmount(t)
    if (v != null) ops.push({ op: 'holdNow', amount: v })
  }

  // Saving
  if (/\b(?:save|saving|sip|putting away|put away|invest(?:ing)? every month)\b/.test(t)) {
    const v = parseAmount(t)
    if (v != null) ops.push({ op: 'savingMonthly', amount: v })
  }

  return ops
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
//
// Each op mutates a *raw* enough-input object — the plain shape handed to
// normalizeEnoughInput. `savable` says whether "Make this my plan" may keep it: a windfall
// and a break from work are tried but not saved, because the plan form has no field for
// them (matching the prototype this was ported from).

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export const WHAT_IF_OPS = {
  retireAt: {
    savable: true,
    describe: (o) => `retiring at ${Math.round(o.age)}`,
    apply: (raw, o) => { raw.retireAge = Math.round(o.age) },
  },
  planTo: {
    savable: true,
    describe: (o) => `planning to ${Math.round(o.age)}`,
    apply: (raw, o) => { raw.planAge = Math.round(o.age) },
  },
  spendMonthly: {
    savable: true,
    describe: (o) => `spending ${money(o.amount)} a month`,
    apply: (raw, o) => { raw.spendMonthly = o.amount },
  },
  holdNow: {
    savable: true,
    describe: (o) => `already holding ${money(o.amount)}`,
    apply: (raw, o) => { raw.haveNow = o.amount },
  },
  savingMonthly: {
    savable: true,
    describe: (o) => `putting away ${money(o.amount)} a month`,
    apply: (raw, o) => { raw.saveMonthly = o.amount },
  },
  addGoal: {
    savable: true,
    describe: (o) => `${o.name || 'that'} at ${money(o.amount)}${o.untilAge ? ` a year from ${Math.round(o.age)} to ${Math.round(o.untilAge)}` : ` at ${Math.round(o.age)}`}`,
    apply: (raw, o) => {
      raw.goals = (raw.goals || []).concat([{
        id: `whatif-${Math.round(o.age)}-${Math.round(o.amount)}`,
        name: o.name || 'Something',
        amount: o.amount,
        atAge: Math.round(o.age),
        untilAge: o.untilAge ? Math.round(o.untilAge) : undefined,
        inflation: (o.rise == null ? 6 : o.rise) / 100,
      }])
    },
  },
  windfall: {
    savable: false,
    describe: (o) => `${money(o.amount)} arriving at ${Math.round(o.age)}`,
    apply: (raw, o, ctx) => {
      const a = Math.round(o.age)
      if (a <= Math.round(ctx.currentAge ?? 0)) { raw.haveNow = (raw.haveNow || 0) + o.amount; return }
      raw.goals = (raw.goals || []).concat([{
        id: `windfall-${a}`, name: o.name || 'Money coming in', amount: -o.amount, atAge: a, inflation: 0,
      }])
    },
  },
  breakYears: {
    savable: false,
    describe: (o) => `${plural(Math.round(o.to) - Math.round(o.from) + 1, 'year', 'years')} away from work from ${Math.round(o.from)}`,
    apply: (raw, o) => { raw.pause = { from: Math.round(o.from), to: Math.round(o.to) } },
  },
}

/** Applies a list of ops to a clone of `raw` and returns the clone. `ctx` carries
 *  { currentAge } for the ops that branch on it (a windfall you already reached is money
 *  in the bank, not a future inflow). */
export function applyWhatIfOps(raw, ops, ctx = {}) {
  const clone = JSON.parse(JSON.stringify(raw || {}))
  for (const o of ops || []) {
    const t = WHAT_IF_OPS[o.op]
    if (t) t.apply(clone, o, ctx)
  }
  return clone
}

/** A human sentence for a list of ops — "retiring at 48, and spending ₹2 L a month". */
export function describeOps(ops) {
  return (ops || []).map((o) => WHAT_IF_OPS[o.op]?.describe(o)).filter(Boolean).join(', and ')
}

/** Whether every op in the list may be saved back to the plan. */
export const opsSavable = (ops) => (ops || []).length > 0 && ops.every((o) => WHAT_IF_OPS[o.op]?.savable)
