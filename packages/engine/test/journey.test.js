import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeProjection, computeReadiness, computeFitness, computeStages,
  growthVsContributions, savingsRateSeries, allocationVsTarget,
  coastFiAge, corpusLastsToAge, consistencyCells,
} from '../src/index.js'
import { defaultPlanPayload, defaultProfile, emptyPlanPayload, emptyProfile } from '../../schema/src/index.js'

const baseState = (over = {}) => ({
  profile: { ...defaultProfile },
  ...structuredClone(defaultPlanPayload),
  ...over,
})
const withProjection = (state) => {
  const projection = computeProjection(state)
  const readiness = computeReadiness(state, projection)
  return { projection, readiness }
}

test('fitness score is 0–100 with five dimensions', () => {
  const state = baseState()
  const { projection, readiness } = withProjection(state)
  const fit = computeFitness(state, projection, readiness)
  assert.ok(fit.score >= 0 && fit.score <= 100)
  assert.equal(fit.dimensions.length, 5)
  assert.ok(typeof fit.band === 'string')
  for (const d of fit.dimensions) {
    assert.ok(d.score >= 0 && d.score <= 100, `${d.key} in range`)
    assert.ok(['good', 'ok', 'warn'].includes(d.status))
  }
})

test('empty plan scores low and sits at the first stage', () => {
  const state = { profile: { ...emptyProfile }, ...structuredClone(emptyPlanPayload) }
  const { projection, readiness } = withProjection(state)
  const fit = computeFitness(state, projection, readiness)
  assert.ok(fit.score < 50)
  const { stages, currentIndex } = computeStages(state, projection, readiness)
  assert.equal(stages.length, 5)
  assert.equal(currentIndex, 0)
  assert.equal(stages[0].status, 'here')
})

test('sample plan has cleared the Foundation stage', () => {
  const state = baseState()
  const { projection, readiness } = withProjection(state)
  const { stages } = computeStages(state, projection, readiness)
  assert.equal(stages[0].status, 'done') // ₹1L saved is well cleared
  assert.ok(stages.some((s) => s.status === 'here'))
})

test('growth vs contributions: growth is non-negative and total rises', () => {
  const state = baseState()
  const { projection } = withProjection(state)
  const series = growthVsContributions(state, projection)
  assert.ok(series.length > 0)
  for (const p of series) {
    assert.ok(p.growth >= 0)
    assert.ok(p.contributed >= 0)
  }
  const last = series[series.length - 1]
  const firstYear = series[0]
  assert.ok(last.growth + last.contributed >= firstYear.growth + firstYear.contributed)
})

test('savings-rate series covers working years only', () => {
  const state = baseState()
  const { projection } = withProjection(state)
  const series = savingsRateSeries(state, projection)
  assert.ok(series.length > 0)
  assert.ok(series.every((p) => p.age <= state.profile.retirementAge))
})

test('allocation vs target sums current ~100% and carries targets', () => {
  const state = baseState()
  const alloc = allocationVsTarget(state)
  assert.equal(alloc.length, 3)
  const sum = alloc.reduce((s, a) => s + a.current, 0)
  assert.ok(Math.abs(sum - 100) <= 2) // rounding tolerance
  for (const a of alloc) {
    assert.ok(a.target >= 0 && a.target <= 100)
    assert.equal(a.drift, a.current - a.target)
  }
})

test('coast-FI age (if any) is before retirement, corpus lasts to a valid age', () => {
  const state = baseState()
  const { projection } = withProjection(state)
  const coast = coastFiAge(state, projection)
  if (coast != null) assert.ok(coast < state.profile.retirementAge)
  const lasts = corpusLastsToAge(state, projection)
  assert.ok(lasts >= state.profile.retirementAge && lasts <= state.profile.lifeExpectancy)
})

test('consistency cells count matches and steady run is bounded', () => {
  const snapshots = [
    { ym: '2026-05', netWorth: 100 },
    { ym: '2026-06', netWorth: 120 },
    { ym: '2026-07', netWorth: 110 },
  ]
  const { cells, steady } = consistencyCells(snapshots, 12)
  assert.equal(cells.length, 12)
  assert.ok(steady >= 0 && steady <= 12)
})
