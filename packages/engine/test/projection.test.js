import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeProjection, computeTax } from '../src/index.js'
import { defaultPlanPayload, defaultProfile } from '../../schema/src/index.js'

const baseState = (over = {}) => ({
  profile: { ...defaultProfile },
  ...structuredClone(defaultPlanPayload),
  ...over,
})

test('projection identical with taxAware off, even when grossSalary is set', () => {
  const a = computeProjection(baseState())
  const b = computeProjection(baseState({ taxAware: false, profile: { ...defaultProfile, grossSalary: 2400000 } }))
  assert.deepEqual(a, b)
})

test('tax-aware projection swaps take-home salary for gross minus tax', () => {
  const profile = { ...defaultProfile, grossSalary: 2400000, taxRegime: 'new' }
  const off = computeProjection(baseState({ profile }))
  const on = computeProjection(baseState({ profile, taxAware: true }))

  // Year 0: salary flow is ₹18L take-home; gross 24L under new regime pays
  // ₹2,92,500 tax → net 21,07,500, so income rises by 3,07,500 (not doubled).
  const { tax } = computeTax({ grossIncome: 2400000, regime: 'new', age: profile.currentAge })
  assert.equal(tax, 292500)
  assert.equal(on[0].income - off[0].income, 2400000 - tax - 1800000)
})

test('tax-aware mode is a no-op without grossSalary or salary flow', () => {
  const noGrossProfile = { ...defaultProfile, grossSalary: null }
  const off = computeProjection(baseState({ profile: noGrossProfile }))
  const noGross = computeProjection(baseState({ profile: noGrossProfile, taxAware: true }))
  assert.deepEqual(off, noGross)

  const profile = { ...defaultProfile, grossSalary: 2400000 }
  const noSalary = baseState({ profile, taxAware: true })
  noSalary.incomes = noSalary.incomes.filter((i) => i.id !== 'salary')
  const offNoSalary = baseState({ profile })
  offNoSalary.incomes = offNoSalary.incomes.filter((i) => i.id !== 'salary')
  assert.deepEqual(computeProjection(noSalary), computeProjection(offNoSalary))
})
