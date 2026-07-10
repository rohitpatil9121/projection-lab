// Central financial data store — India edition.
// Projection engine lives in @projectlab/engine; this file handles persistence + cloud sync.

import { create } from './miniStore.js'
import { CURRENT_YEAR } from '@projectlab/engine'
import { defaultPlanPayload, defaultProfile, emptyPlanPayload, emptyProfile } from '@projectlab/schema'
import { loadSession } from '../auth/session.js'
import { fetchPlans, fetchPlan, syncPlan, logoutApi, apiFetch } from '../api/client.js'

export {
  computeProjection,
  computeReadiness,
  computeTaxSavings,
  runMonteCarlo,
  CURRENT_YEAR,
} from '@projectlab/engine'

const DEFAULT_STATE = {
  profile: { ...emptyProfile },
  ...emptyPlanPayload,
  onboarded: false,
  scenarios: [{ id: 'base', name: 'Base plan', data: null }],
  activeScenarioId: 'base',
  snapshots: [],
  ui: { dark: false, realTerms: true },
}

// Everything that differs between scenarios (plan data + profile assumptions).
function scenarioData(s) {
  const { profile, accounts, incomes, expenses, contributions, milestones, events } = s
  return JSON.parse(JSON.stringify({ profile, accounts, incomes, expenses, contributions, milestones, events }))
}

const KEY = 'projectlab-state-in-v1'
let syncTimer = null

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Existing users (saved before the onboarded flag existed) are treated as onboarded.
      return { ...DEFAULT_STATE, ...parsed, onboarded: parsed.onboarded ?? true }
    }
  } catch { /* ignore */ }
  return DEFAULT_STATE
}

function planPayload(state) {
  const { accounts, incomes, expenses, contributions, milestones, events } = state
  return { accounts, incomes, expenses, contributions, milestones, events }
}

function applyUserProfile(state, user) {
  return {
    profile: {
      ...state.profile,
      name: user.name ?? state.profile.name,
      currentAge: user.currentAge ?? state.profile.currentAge,
      retirementAge: user.retirementAge ?? state.profile.retirementAge,
      lifeExpectancy: user.lifeExpectancy ?? state.profile.lifeExpectancy,
      inflation: user.inflation ?? state.profile.inflation,
      taxRegime: user.taxRegime ?? state.profile.taxRegime,
      taxSlab: user.taxSlab ?? state.profile.taxSlab,
      currency: user.currency ?? state.profile.currency,
    },
    ui: { ...state.ui, ...(user.uiPrefs || {}) },
  }
}

export const useStore = create((set, get) => ({
  ...load(),
  currentYear: CURRENT_YEAR,
  auth: null,
  syncStatus: 'idle',
  syncError: null,

  persist() {
    const s = get()
    const { profile, accounts, incomes, expenses, contributions, milestones, events, ui, onboarded, scenarios, activeScenarioId, snapshots } = s
    localStorage.setItem(KEY, JSON.stringify({ profile, accounts, incomes, expenses, contributions, milestones, events, ui, onboarded, scenarios, activeScenarioId, snapshots }))
    get().scheduleSync()
  },

  scheduleSync() {
    const { auth } = get()
    if (!auth?.planId) return
    clearTimeout(syncTimer)
    set({ syncStatus: navigator.onLine ? 'syncing' : 'offline' })
    syncTimer = setTimeout(() => get().pushToCloud(), 2000)
  },

  async pushToCloud() {
    const s = get()
    if (!s.auth?.planId || !navigator.onLine) {
      set({ syncStatus: s.auth?.planId ? 'offline' : 'idle' })
      return
    }
    set({ syncStatus: 'syncing', syncError: null })
    try {
      const updated = await syncPlan(s.auth.planId, {
        payload: planPayload(s),
        version: s.auth.planVersion,
        profile: {
          name: s.profile.name,
          currentAge: s.profile.currentAge,
          retirementAge: s.profile.retirementAge,
          lifeExpectancy: s.profile.lifeExpectancy,
          inflation: s.profile.inflation,
          taxRegime: s.profile.taxRegime,
          taxSlab: s.profile.taxSlab,
        },
        uiPrefs: s.ui,
      })
      set({
        auth: { ...s.auth, planVersion: updated.version },
        syncStatus: 'synced',
      })
    } catch (err) {
      if (err.status === 409 && err.data?.plan) {
        set({ syncStatus: 'conflict', syncError: 'Plan updated on another device' })
      } else {
        set({ syncStatus: 'error', syncError: err.message })
      }
    }
  },

  async initFromSession() {
    const session = loadSession()
    if (!session?.accessToken) return
    try {
      const plans = await fetchPlans()
      let plan
      if (plans.length) {
        plan = await fetchPlan(plans[0].id)
      } else {
        const local = load()
        plan = await apiFetch('/plans', {
          method: 'POST',
          body: JSON.stringify({ payload: planPayload(local) }),
        })
      }
      get().applyServerPlan(plan, session.user)
    } catch {
      set({ auth: null, syncStatus: 'idle' })
    }
  },

  applyServerPlan(plan, user) {
    const hasData = (plan.payload?.accounts?.length || 0) + (plan.payload?.incomes?.length || 0) > 0
    const patch = {
      ...plan.payload,
      ...applyUserProfile(get(), user || {}),
      auth: { user, planId: plan.id, planVersion: plan.version },
      syncStatus: 'synced',
      onboarded: get().onboarded || hasData,
    }
    set(patch)
    get().persistLocalOnly()
  },

  async afterLogin(user) {
    const local = load()
    const hasLocal = localStorage.getItem(KEY) != null
    const plans = await fetchPlans()
    if (plans.length) {
      const plan = await fetchPlan(plans[0].id)
      if (hasLocal && confirm('We found a local plan. Import it to the cloud? (Cancel keeps the cloud copy)')) {
        const updated = await syncPlan(plan.id, {
          payload: planPayload(local),
          version: plan.version,
          profile: local.profile,
          uiPrefs: local.ui,
        })
        get().applyServerPlan(updated, user)
      } else {
        get().applyServerPlan(plan, user)
      }
    } else {
      const plan = await apiFetch('/plans', {
        method: 'POST',
        body: JSON.stringify({ payload: planPayload(hasLocal ? local : get()) }),
      })
      get().applyServerPlan(plan, user)
    }
  },

  persistLocalOnly() {
    const s = get()
    const { profile, accounts, incomes, expenses, contributions, milestones, events, ui, onboarded, scenarios, activeScenarioId, snapshots } = s
    localStorage.setItem(KEY, JSON.stringify({ profile, accounts, incomes, expenses, contributions, milestones, events, ui, onboarded, scenarios, activeScenarioId, snapshots }))
  },

  async logout() {
    await logoutApi()
    set({ auth: null, syncStatus: 'idle', syncError: null })
  },

  resolveConflict(useLocal) {
    const s = get()
    if (useLocal) get().pushToCloud()
    else get().initFromSession()
  },

  // ---- Scenarios (ProjectionLab-style what-if plans) ----

  addScenario(name) {
    const s = get()
    const current = scenarioData(s)
    const scenarios = s.scenarios.map((x) => (x.id === s.activeScenarioId ? { ...x, data: current } : x))
    const id = 'sc' + Math.round(performance.now() * 1000)
    set({ scenarios: [...scenarios, { id, name, data: JSON.parse(JSON.stringify(current)) }], activeScenarioId: id })
    get().persist()
  },

  switchScenario(id) {
    const s = get()
    if (id === s.activeScenarioId) return
    const target = s.scenarios.find((x) => x.id === id)
    if (!target?.data) return
    const scenarios = s.scenarios.map((x) => (x.id === s.activeScenarioId ? { ...x, data: scenarioData(s) } : x))
    set({ scenarios, activeScenarioId: id, ...target.data })
    get().persist()
  },

  renameScenario(id, name) {
    set({ scenarios: get().scenarios.map((x) => (x.id === id ? { ...x, name } : x)) })
    get().persistLocalOnly()
  },

  deleteScenario(id) {
    const s = get()
    if (s.scenarios.length <= 1) return
    if (id === s.activeScenarioId) {
      const fallback = s.scenarios.find((x) => x.id !== id && x.data)
      if (!fallback) return
      set({
        scenarios: s.scenarios.filter((x) => x.id !== id),
        activeScenarioId: fallback.id,
        ...fallback.data,
      })
    } else {
      set({ scenarios: s.scenarios.filter((x) => x.id !== id) })
    }
    get().persist()
  },

  // ---- Progress tracking: monthly net-worth snapshots ----

  recordSnapshot() {
    const s = get()
    if (!s.onboarded || !s.accounts.length) return
    const netWorth = s.accounts.reduce((t, a) => t + (a.kind === 'asset' ? a.balance : -a.balance), 0)
    const ym = new Date().toISOString().slice(0, 7)
    const rest = s.snapshots.filter((x) => x.ym !== ym)
    set({ snapshots: [...rest, { ym, netWorth }].sort((a, b) => (a.ym < b.ym ? -1 : 1)) })
    get().persistLocalOnly()
  },

  loadSample() {
    set({
      ...defaultPlanPayload,
      profile: { ...defaultProfile },
      onboarded: true,
    })
    get().persist()
  },

  completeOnboarding(profile, payload) {
    set({
      ...emptyPlanPayload,
      ...payload,
      profile: { ...get().profile, ...profile },
      onboarded: true,
    })
    get().persist()
    get().recordSnapshot()
  },

  update(patch) { set(patch); get().persist() },

  setProfile(p) { set({ profile: { ...get().profile, ...p } }); get().persist() },

  addItem(collection, item) {
    set({ [collection]: [...get()[collection], { id: 'x' + Math.round(performance.now() * 1000), ...item }] })
    get().persist()
  },
  updateItem(collection, id, patch) {
    set({ [collection]: get()[collection].map((i) => (i.id === id ? { ...i, ...patch } : i)) })
    get().persist()
  },
  removeItem(collection, id) {
    set({ [collection]: get()[collection].filter((i) => i.id !== id) })
    get().persist()
  },

  toggleDark() {
    const dark = !get().ui.dark
    set({ ui: { ...get().ui, dark } })
    document.documentElement.classList.toggle('dark', dark)
    get().persist()
  },

  setRealTerms(realTerms) { set({ ui: { ...get().ui, realTerms } }); get().persist() },

  reset() {
    localStorage.removeItem(KEY)
    set({ ...DEFAULT_STATE, auth: get().auth, syncStatus: get().auth ? 'syncing' : 'idle' })
    get().persist()
  },
}))
