import { plans, users, id } from './db.js'
import { defaultPlanPayload, parsePlanPayload } from '@projectlab/schema'

export async function listPlans(userId) {
  const rows = await plans.listByUser(userId)
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    isDefault: p.isDefault,
    version: p.version,
    schemaVersion: p.schemaVersion,
    updatedAt: p.updatedAt,
  }))
}

export async function getPlan(userId, planId) {
  const plan = await plans.byId(planId)
  if (!plan || plan.userId !== userId) {
    const err = new Error('Plan not found')
    err.status = 404
    throw err
  }
  return plan
}

export async function createPlan(userId, { name = 'Base scenario', payload } = {}) {
  if (await plans.countByUser(userId) >= 1) {
    const err = new Error('Free tier allows 1 plan. Upgrade to Pro for more.')
    err.status = 403
    throw err
  }
  const parsed = parsePlanPayload(payload || defaultPlanPayload)
  const now = new Date().toISOString()
  return plans.create({
    id: id(),
    userId,
    name,
    isDefault: true,
    schemaVersion: 2,
    version: 1,
    payload: parsed,
    createdAt: now,
    updatedAt: now,
  })
}

export async function ensureDefaultPlan(userId) {
  const existing = await listPlans(userId)
  if (existing.length) return getPlan(userId, existing[0].id)
  return createPlan(userId)
}

export async function updatePlan(userId, planId, { payload, version, profile, uiPrefs }) {
  const plan = await getPlan(userId, planId)
  if (version != null && version !== plan.version) {
    const err = new Error('Version conflict')
    err.status = 409
    err.plan = plan
    throw err
  }
  if (payload) {
    const size = JSON.stringify(payload).length
    if (size > 256 * 1024) {
      const err = new Error('Payload too large')
      err.status = 413
      throw err
    }
    plan.payload = parsePlanPayload(payload)
  }
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  await plans.save(plan)

  if (profile || uiPrefs) {
    await users.update(userId, { ...(profile || {}), ...(uiPrefs ? { uiPrefs } : {}) })
  }

  return plan
}

export async function deletePlan(userId, planId) {
  await getPlan(userId, planId) // throws 404 if missing or not owned
  await plans.del(planId)
}
