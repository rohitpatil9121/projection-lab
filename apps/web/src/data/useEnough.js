/* The inputs to "How much is enough", and where each one comes from.
 *
 * THE PLAN IS THE SOURCE. Ages, inflation, holdings, contributions and goals already exist
 * in this app — asking for them a second time would be asking the user to keep two truths
 * in sync, and they would drift. So everything here is DERIVED from the plan by default,
 * and each derived figure can be overridden for this screen alone.
 *
 * An override is stored as an explicit value; absent means "follow the plan". That is the
 * whole reason the settings object holds nulls rather than pre-filled numbers: a copied
 * default stops tracking the thing it was copied from, silently, the moment the plan moves.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  normalizeEnoughInput,
  solveEnough,
  projectEnoughPaths,
  enoughCurve,
  earliestRetirementAge,
  retireTodayVerdict,
  forwardCorpus,
  applyWhatIfOps,
  opsSavable,
  DEFAULT_ENOUGH_RETURNS,
} from '@projectlab/engine'
import { useStore } from './store.js'

const KEY = 'projectlab-enough-v1'

export const DEFAULT_ENOUGH_SETTINGS = {
  spendMonthly: null,
  retireAge: null,
  planAge: null,
  inflation: null,
  haveNow: null,
  saveMonthly: null,
  stepUp: 0.06,
  bequest: 0,
  mix: null,
  returns: { ...DEFAULT_ENOUGH_RETURNS },
  taxRate: 0.125,
  taxGainShare: 0.6,
  drawdown: 'rebalance',
  // The goals list this feature owns. `null` means "not touched yet — follow the plan's
  // milestones"; once the user adds, edits or toggles anything it becomes a concrete array
  // and is self-contained, so it never rewrites the global milestone list.
  goals: null,
}

/**
 * The goals the Your-plan tab shows and edits: the feature's own list once it exists,
 * otherwise the plan's milestones read as editable goals (each on, no inflation).
 */
export function effectiveEnoughGoals(settings, derived) {
  if (settings.goals != null) return settings.goals
  return (derived.goals || []).map((g) => ({
    id: g.id, name: g.name, amount: g.amount, atAge: g.atAge,
    untilAge: g.untilAge, inflation: g.inflation ?? 0, on: true,
  }))
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_ENOUGH_SETTINGS, ...JSON.parse(raw) }
  } catch { /* a browser that refuses storage still gets a working screen */ }
  return { ...DEFAULT_ENOUGH_SETTINGS }
}

export function useEnoughSettings() {
  const [settings, setSettings] = useState(loadSettings)
  const patch = (p) => setSettings((s) => {
    const next = { ...s, ...p }
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
    return next
  })
  return [settings, patch]
}

/** Which asset class each account type is held as. Not a recommendation — a reading of
 *  what the user has already told us they hold. */
const CLASS_OF_TYPE = {
  investment: 'equity',
  cash: 'debt',
  retirement: 'debt',
}

const investableTypes = new Set(['cash', 'investment', 'retirement'])

/**
 * The allocation implied by the accounts on the plan.
 *
 * READ FROM THE SAME ACCOUNTS THE CORPUS IS. The house is excluded here for exactly the
 * reason it is excluded from `investableFromAccounts` — the corpus this screen solves for
 * is money you can sell to eat. Counting the home in the allocation but not in the holding
 * gave a sample plan a 76%-real-estate split against a corpus that held no property at all,
 * so the solver was pricing a portfolio nobody owned.
 *
 * Returns null when there is nothing to read it from, and null must STAY null: a filled-in
 * default allocation is a recommendation, and this app does not make them.
 */
export function mixFromAccounts(accounts = []) {
  const mix = { equity: 0, debt: 0, gold: 0, realEstate: 0, other: 0 }
  let total = 0
  accounts
    .filter((a) => a.kind === 'asset' && investableTypes.has(a.type))
    .forEach((a) => {
      mix[CLASS_OF_TYPE[a.type] || 'other'] += a.balance || 0
      total += a.balance || 0
    })
  if (total <= 0) return null
  Object.keys(mix).forEach((k) => { mix[k] = Math.round((mix[k] / total) * 1000) / 10 })
  return mix
}

/** Goals the plan already carries, as bills this screen has to fund. Only goals that
 *  actually move money count: a pure tracking milestone has nothing to withdraw. */
export function goalsFromMilestones(milestones = [], currentAge) {
  return milestones
    .filter((m) => m.cashImpact && m.targetAge != null && m.targetAge > currentAge && !m.achieved)
    .map((m) => ({
      id: m.id,
      name: m.name,
      // cashImpact is signed the plan's way: negative is money out. Here a bill is
      // positive, so the sign flips — and money arriving stays negative, which nets
      // against that year's withdrawal exactly as it should.
      amount: -m.cashImpact,
      atAge: m.targetAge,
      inflation: 0,
    }))
}

/** What the plan says you hold in things you could actually spend. A house is not in it:
 *  the corpus this screen solves for is money you can sell to eat, and the family home is
 *  not that, whatever it is worth. */
export function investableFromAccounts(accounts = []) {
  return accounts
    .filter((a) => a.kind === 'asset' && investableTypes.has(a.type))
    .reduce((t, a) => t + (a.balance || 0), 0)
}

export function saveMonthlyFromPlan(contributions = []) {
  return contributions.reduce((t, c) => t + (c.amount || 0), 0) / 12
}

/** A starting point for retirement spending: today's outgoings, less anything that is
 *  visibly a loan being retired, since a loan ends and retirement does not. Editable,
 *  and the screen says it is a guess. */
export function spendMonthlyFromPlan(expenses = []) {
  const total = expenses
    .filter((e) => !e.accountId)
    .reduce((t, e) => t + (e.amount || 0), 0)
  return total / 12
}

/**
 * The plain object the solver reads, assembled from plan + overrides. Pure, so both the
 * live screen and the "What if" preview build from the same place — a what-if is just this
 * object with a list of operations applied on a clone.
 */
export function buildEnoughRaw(settings, derived, profile, currentYear, retireAgeOverride) {
  const pick = (key) => (settings[key] == null ? derived[key] : settings[key])
  return {
    currentAge: profile.currentAge,
    retireAge: retireAgeOverride ?? settings.retireAge ?? profile.retirementAge,
    planAge: settings.planAge ?? profile.lifeExpectancy,
    currentYear,
    inflation: settings.inflation ?? profile.inflation,
    spendMonthly: pick('spendMonthly'),
    goals: effectiveEnoughGoals(settings, derived),
    bequest: settings.bequest,
    haveNow: pick('haveNow'),
    saveMonthly: pick('saveMonthly'),
    stepUp: settings.stepUp,
    mix: pick('mix') || {},
    returns: settings.returns,
    taxRate: settings.taxRate,
    taxGainShare: settings.taxGainShare,
    drawdown: settings.drawdown,
  }
}

/** Everything the solver needs, assembled from plan + overrides. Cheap and pure — the
 *  expensive part is what consumes it. */
export function useEnoughInput(settings, retireAgeOverride) {
  const profile = useStore((s) => s.profile)
  const accounts = useStore((s) => s.accounts)
  const contributions = useStore((s) => s.contributions)
  const expenses = useStore((s) => s.expenses)
  const milestones = useStore((s) => s.milestones)
  const currentYear = useStore((s) => s.currentYear)

  return useMemo(() => {
    const derived = {
      mix: mixFromAccounts(accounts),
      haveNow: accounts.length ? investableFromAccounts(accounts) : null,
      saveMonthly: contributions.length ? saveMonthlyFromPlan(contributions) : null,
      spendMonthly: spendMonthlyFromPlan(expenses),
      goals: goalsFromMilestones(milestones, profile.currentAge),
    }
    const raw = buildEnoughRaw(settings, derived, profile, currentYear, retireAgeOverride)
    return { cfg: normalizeEnoughInput(raw), derived, raw }
  }, [profile, accounts, contributions, expenses, milestones, currentYear, settings, retireAgeOverride])
}

/** One solved outcome for a raw input — the three figures a "What if" compares. */
function whatIfSnapshot(raw) {
  const cfg = normalizeEnoughInput(raw)
  if (!cfg.mixSet) return { mixSet: false, corpus: null, sip: null, earliest: null, retireAge: cfg.retireAge }
  const answer = solveEnough(cfg)
  const earliest = (cfg.haveNow != null && cfg.saveMonthly != null) ? earliestRetirementAge(cfg) : null
  return { mixSet: true, corpus: answer.target, sip: answer.sip, earliest, retireAge: cfg.retireAge }
}

/**
 * Runs a list of operations against a copy of the plan and reports what moved. The real
 * plan is never touched — the ops are applied to a clone of `baseRaw` and both are solved.
 */
export function previewWhatIf(baseRaw, ops) {
  const ctx = { currentAge: baseRaw.currentAge }
  const afterRaw = applyWhatIfOps(baseRaw, ops, ctx)
  return {
    base: whatIfSnapshot(baseRaw),
    after: whatIfSnapshot(afterRaw),
    savable: opsSavable(ops),
  }
}

/**
 * Turns a list of savable ops into a settings patch for "Make this my plan". Only the ops
 * that have a home in the plan are kept; a goal added by name is appended to this feature's
 * own goals list (`baseGoals` is the current effective list) so it never rewrites the
 * global milestone list.
 */
export function whatIfPatch(ops, baseGoals = []) {
  const patch = {}
  const extra = []
  for (const o of ops || []) {
    if (o.op === 'retireAt') patch.retireAge = Math.round(o.age)
    else if (o.op === 'planTo') patch.planAge = Math.round(o.age)
    else if (o.op === 'spendMonthly') patch.spendMonthly = o.amount
    else if (o.op === 'holdNow') patch.haveNow = o.amount
    else if (o.op === 'savingMonthly') patch.saveMonthly = o.amount
    else if (o.op === 'addGoal') {
      extra.push({
        id: `whatif-${extra.length}-${Math.round(o.amount)}-${Math.round(o.age)}`,
        name: o.name || 'Something',
        amount: o.amount,
        atAge: Math.round(o.age),
        untilAge: o.untilAge ? Math.round(o.untilAge) : undefined,
        inflation: (o.rise == null ? 6 : o.rise) / 100,
        on: true,
      })
    }
  }
  if (extra.length) patch.goals = [...(baseGoals || []), ...extra]
  return patch
}

/** The headline solve plus the picture. A few hundred milliseconds of arithmetic, so it is
 *  memoised on the config and nothing else. */
export function useEnoughAnswer(cfg) {
  return useMemo(() => {
    if (!cfg.mixSet) return { mixSet: false }
    const answer = solveEnough(cfg)
    if (answer.target == null) return { ...answer, paths: null, today: retireTodayVerdict(cfg) }
    return {
      ...answer,
      paths: projectEnoughPaths(cfg, answer),
      today: retireTodayVerdict(cfg),
      arriveWith: forwardCorpus(cfg),
    }
  }, [cfg])
}

/**
 * The enough curve and the earliest workable age — one full solve per age, so about a
 * second of work. It is deliberately NOT part of the memo above: the screen has to paint
 * its answer first and let this land afterwards, or every slider nudge would stall.
 *
 * The ref guards against a stale result overwriting a newer one when the config changes
 * mid-flight, which a plain setState in a timeout would happily do.
 */
export function useEnoughCurve(cfg, enabled = true) {
  const [state, setState] = useState({ curve: null, earliest: null, pending: false })
  const token = useRef(0)

  useEffect(() => {
    if (!enabled || !cfg.mixSet) { setState({ curve: null, earliest: null, pending: false }); return undefined }
    const mine = ++token.current
    setState((s) => ({ ...s, pending: true }))
    const id = setTimeout(() => {
      const curve = enoughCurve(cfg)
      const earliest = earliestRetirementAge(cfg)
      if (token.current === mine) setState({ curve, earliest, pending: false })
    }, 30)
    return () => clearTimeout(id)
  }, [cfg, enabled])

  return state
}
