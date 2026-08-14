import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeProjection } from '../src/index.js'
import { migratePlanPayload } from '@projectlab/schema'

// Goals and life events used to be two collections; a goal now carries the cash
// impact the event used to. These pin the two halves of that: what the engine does
// with cashImpact, and that no pre-merge plan loses its events on the way in.

const CASH = { id: 'cash', name: 'Savings', kind: 'asset', type: 'cash', balance: 5000000, growth: 0, color: '#469b88' }

const plan = (over = {}) => ({
  profile: { name: 'T', currentAge: 30, retirementAge: 60, lifeExpectancy: 85, inflation: 0.06, currency: 'INR' },
  accounts: [CASH], incomes: [], expenses: [], contributions: [], milestones: [],
  currentYear: 2026, realTerms: false, taxAware: false,
  ...over,
})

const at = (rows, age) => rows.find((r) => r.age === age)

test('a spend goal takes its cash out of the plan at targetAge, once', () => {
  const goal = { id: 'g1', name: 'Buy a car', kind: 'spend', target: 1200000, cashImpact: -1200000, targetAge: 35 }
  const withGoal = computeProjection(plan({ milestones: [goal] }))
  const without = computeProjection(plan())

  assert.equal(at(withGoal, 34).netWorth, at(without, 34).netWorth, 'nothing happens before targetAge')
  assert.equal(
    at(without, 35).netWorth - at(withGoal, 35).netWorth,
    1200000,
    'the full cost leaves at targetAge',
  )
  // The gap must not widen afterwards — a repeated hit would compound year on year.
  assert.equal(at(without, 40).netWorth - at(withGoal, 40).netWorth, 1200000, 'it is a one-time hit')
})

test('a save goal never moves the projection', () => {
  const goal = { id: 'g1', name: 'First crore', kind: 'save', target: 10000000, cashImpact: 0, metric: 'netWorth', targetAge: 45 }
  const withGoal = computeProjection(plan({ milestones: [goal] }))
  const without = computeProjection(plan())
  assert.deepEqual(withGoal.map((r) => r.netWorth), without.map((r) => r.netWorth))
})

test('a marker goal can still bring money in', () => {
  const goal = { id: 'g1', name: 'Downsize home', kind: 'marker', target: 0, cashImpact: 4000000, targetAge: 70 }
  const rows = computeProjection(plan({ milestones: [goal] }))
  const without = computeProjection(plan())
  assert.equal(at(rows, 70).netWorth - at(without, 70).netWorth, 4000000)
})

test('migratePlanPayload turns a spend event into the goal it always was', () => {
  const out = migratePlanPayload({
    milestones: [],
    events: [{ id: 'e1', name: "Child's education", age: 48, amount: -3000000, icon: '🎓', color: '#0ea5e9' }],
  })
  assert.equal(out.events, undefined, 'the events collection is gone')
  assert.deepEqual(out.milestones, [{
    id: 'e1', name: "Child's education", targetAge: 48, icon: '🎓', color: '#0ea5e9',
    kind: 'spend', target: 3000000, cashImpact: -3000000, metric: 'investable', achieved: false,
  }])
})

test('migratePlanPayload keeps zero and positive events as markers', () => {
  const out = migratePlanPayload({
    milestones: [],
    events: [
      { id: 'e1', name: 'Retire', age: 60, amount: 0, icon: '🌴', color: '#469b88' },
      { id: 'e2', name: 'Downsize', age: 70, amount: 4000000, icon: '📦', color: '#9da7d0' },
    ],
  })
  assert.deepEqual(out.milestones.map((m) => [m.kind, m.target, m.cashImpact]), [
    ['marker', 0, 0],
    ['marker', 0, 4000000],
  ])
})

test('migratePlanPayload preserves existing goals and is idempotent', () => {
  const before = {
    milestones: [{ id: 'm1', name: 'Crore', kind: 'save', target: 10000000, cashImpact: 0 }],
    events: [{ id: 'e1', name: 'Buy a car', age: 35, amount: -1200000, color: '#f59e0b' }],
  }
  const once = migratePlanPayload(before)
  assert.equal(once.milestones.length, 2, 'the existing goal survives alongside the migrated event')
  // Running it again must not duplicate or drop anything — load() and applyServerPlan()
  // both call it, and a plan can round-trip through storage many times.
  assert.deepEqual(migratePlanPayload(once), once)
})

test('migratePlanPayload leaves a plan that never had events alone', () => {
  const payload = { milestones: [{ id: 'm1', name: 'Crore', kind: 'save', target: 10000000, cashImpact: 0 }], accounts: [] }
  assert.deepEqual(migratePlanPayload(payload), payload)
})

// A goal's "current value" must be TODAY's, not the projection's first row. The projection
// grows balances and adds a year of contributions before pushing row zero, so reading it
// credited the user with a year that has not happened: the sample plan showed 61% toward a
// ₹1 Cr net-worth goal while the Today page, from the same accounts, showed ₹40 L.
test('goal progress is measured against today, not a year from now', async () => {
  const { milestoneValue } = await import('../src/goals.js')
  const accounts = [
    { id: 'cash', name: 'Savings', kind: 'asset', type: 'cash', balance: 500000, growth: 0.04, color: '#469b88' },
    { id: 'eq', name: 'Equity', kind: 'asset', type: 'investment', balance: 3000000, growth: 0.12, color: '#377cc8' },
    { id: 'loan', name: 'Loan', kind: 'liability', type: 'loan', balance: 1000000, growth: 0.09, color: '#e0533d' },
  ]
  const state = plan({ accounts, contributions: [{ id: 'c1', accountId: 'eq', amount: 600000 }] })
  const projection = computeProjection(state)

  const netWorthNow = 500000 + 3000000 - 1000000
  assert.equal(milestoneValue({ metric: 'netWorth' }, accounts, projection), netWorthNow)
  assert.equal(milestoneValue({ metric: 'investable' }, accounts, projection), 3000000)

  // And it is genuinely different from row zero — otherwise this test proves nothing.
  assert.ok(projection[0].netWorth > netWorthNow, 'row zero is already a year ahead')

  // An account-linked goal always read the real balance; it must keep doing so.
  assert.equal(milestoneValue({ accountId: 'eq' }, accounts, projection), 3000000)
})
