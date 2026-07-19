import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeProjection } from '../src/index.js'

// Deliberately tiny plans: with one loan and one salary, the right answer is checkable
// by hand, so a regression here is unambiguous rather than a vibe.
const CASH = { id: 'cash', name: 'Savings', kind: 'asset', type: 'cash', balance: 500000, growth: 0.04, color: '#469b88' }
const SALARY = { id: 'salary', name: 'Salary', amount: 2500000, growth: 0.08, startAge: 30, endAge: 60, color: '#469b88' }

const plan = (over = {}) => ({
  profile: { name: 'T', currentAge: 30, retirementAge: 60, lifeExpectancy: 85, inflation: 0.06, currency: 'INR' },
  accounts: [], incomes: [SALARY], expenses: [], contributions: [], milestones: [],
  currentYear: 2026, realTerms: false, taxAware: false,
  ...over,
})

const loan = (over = {}) => ({
  id: 'home', name: 'Home Loan', kind: 'liability', type: 'loan',
  balance: 5000000, growth: 0.09, color: '#e0533d', ...over,
})

const emi = (over = {}) => ({
  id: 'emi', name: 'Home Loan EMI', amount: 600000, growth: 0,
  startAge: 30, endAge: 60, accountId: 'home', color: '#e0533d', ...over,
})

const at = (rows, age) => rows.find((r) => r.age === age)

test('a serviced loan is actually paid off, and stays paid off', () => {
  const rows = computeProjection(plan({ accounts: [CASH, loan()], expenses: [emi()] }))
  const cleared = rows.find((r) => r.home === 0)
  assert.ok(cleared, 'loan should reach zero')
  // ₹50L at 9% against ₹6L/yr clears in ~16 years; guard the ballpark, not the decimal.
  assert.ok(cleared.age >= 44 && cleared.age <= 47, `cleared at ${cleared.age}, expected 44-47`)
  assert.equal(at(rows, 60).home, 0, 'must not resurrect after being cleared')
})

test('paying the EMI is what retires the debt', () => {
  const withEmi = computeProjection(plan({ accounts: [CASH, loan()], expenses: [emi()] }))
  const without = computeProjection(plan({ accounts: [CASH, loan()], expenses: [] }))
  assert.notEqual(at(withEmi, 50).home, at(without, 50).home)
})

test('an unserviced loan accrues interest rather than fading away', () => {
  const rows = computeProjection(plan({ accounts: [CASH, loan()], expenses: [] }))
  assert.ok(at(rows, 40).home > 5000000, 'unpaid debt should grow, not shrink')
})

test('the interest rate on a liability changes the outcome', () => {
  const cheap = computeProjection(plan({ accounts: [CASH, loan({ growth: 0.02 })], expenses: [emi()] }))
  const dear = computeProjection(plan({ accounts: [CASH, loan({ growth: 0.20 })], expenses: [emi()] }))
  assert.notEqual(at(cheap, 40).home, at(dear, 40).home)
  assert.ok(at(dear, 40).home > at(cheap, 40).home, 'costlier debt should linger')
})

test('an EMI only pays down the loan it names', () => {
  const two = computeProjection(plan({
    accounts: [CASH, loan(), loan({ id: 'car', name: 'Car Loan', balance: 800000, growth: 0.11 })],
    expenses: [emi()], // names 'home' only
  }))
  assert.ok(at(two, 40).home < 5000000, 'named loan is being paid down')
  assert.ok(at(two, 40).car > 800000, "unnamed loan must not benefit from another loan's EMI")
})

test('an EMI that ends early stops paying the loan down', () => {
  const rows = computeProjection(plan({
    accounts: [CASH, loan()],
    expenses: [emi({ endAge: 35 })],
  }))
  const atStop = at(rows, 35).home
  assert.ok(at(rows, 45).home > atStop, 'balance should climb again once payments stop')
})

test('legacy plans using payoff keep their old behaviour', () => {
  // Plans written before EMIs could be linked rely on payoff; changing them silently
  // would move real users' net worth without them touching anything.
  const rows = computeProjection(plan({ accounts: [CASH, loan({ payoff: 0.06 })] }))
  assert.equal(Math.round(at(rows, 50).home), 1363499)
})

test('a linked EMI takes precedence over a legacy payoff', () => {
  const rows = computeProjection(plan({ accounts: [CASH, loan({ payoff: 0.06 })], expenses: [emi()] }))
  const cleared = rows.find((r) => r.home === 0)
  assert.ok(cleared, 'real amortisation should win over the fallback')
})
