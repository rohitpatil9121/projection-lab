// Central financial data store — India edition.
// Projection engine lives in @projectlab/engine; this file handles persistence + cloud sync.

import { create } from './miniStore.js'
import { CURRENT_YEAR } from '@projectlab/engine'
import { defaultPlanPayload, defaultProfile, emptyPlanPayload, emptyProfile } from '@projectlab/schema'
import { loadSession, saveSession, isAuthenticated } from '../auth/session.js'
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

function emptyScenarioData() {
  return JSON.parse(JSON.stringify({ profile: { ...emptyProfile }, ...emptyPlanPayload }))
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

function planHasData(payload) {
  if (!payload) return false
  return (payload.accounts?.length || 0) + (payload.incomes?.length || 0) > 0
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

export const useStore = create((set, get) => {
  const session = loadSession()
  return {
  ...load(),
  currentYear: CURRENT_YEAR,
  auth: session?.accessToken && session?.user ? {
    user: session.user,
    planId: session.planId || null,
    planVersion: session.planVersion || null,
  } : null,
  syncStatus: 'idle',
  syncError: null,
  planHydrating: false,

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
    set({ planHydrating: true, syncStatus: 'syncing' })
    try {
      const user = await apiFetch('/me')
      saveSession({ ...session, user })
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
      get().applyServerPlan(plan, user)
    } catch (err) {
      // Drop stale tokens so the app doesn't stay stuck on the loading screen.
      saveSession(null)
      set({
        syncStatus: 'error',
        syncError: err.message || 'Could not load your plan',
        auth: null,
      })
    } finally {
      set({ planHydrating: false })
    }
  },

  applyServerPlan(plan, user) {
    const payload = plan.payload || emptyPlanPayload
    const hasData = planHasData(payload)
    const { profile, ui } = applyUserProfile(
      { profile: { ...emptyProfile }, ui: get().ui || { dark: false, realTerms: true } },
      user || {},
    )
    set({
      ...emptyPlanPayload,
      ...payload,
      profile,
      ui,
      scenarios: [{ id: 'base', name: 'Base plan', data: null }],
      activeScenarioId: 'base',
      auth: { user, planId: plan.id, planVersion: plan.version },
      syncStatus: 'synced',
      syncError: null,
      onboarded: hasData || get().onboarded,
      planHydrating: false,
    })
    saveSession({
      ...loadSession(),
      user,
      planId: plan.id,
      planVersion: plan.version,
    })
    get().persistLocalOnly()
    if (hasData) get().recordSnapshot()
  },

  async afterLogin(user) {
    set({ planHydrating: true, syncStatus: 'syncing' })
    try {
      const local = load()
      const localHasData = planHasData(local)
      const plans = await fetchPlans()

      if (plans.length) {
        const plan = await fetchPlan(plans[0].id)
        const cloudHasData = planHasData(plan.payload)
        // Returning user → always use cloud when it has data.
        // New signup with guest data on device → upload local once.
        if (!cloudHasData && localHasData) {
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
          body: JSON.stringify({ payload: planPayload(localHasData ? local : get()) }),
        })
        get().applyServerPlan(plan, user)
      }
    } finally {
      set({ planHydrating: false })
    }
  },

  persistLocalOnly() {
    const s = get()
    const { profile, accounts, incomes, expenses, contributions, milestones, events, ui, onboarded, scenarios, activeScenarioId, snapshots } = s
    localStorage.setItem(KEY, JSON.stringify({ profile, accounts, incomes, expenses, contributions, milestones, events, ui, onboarded, scenarios, activeScenarioId, snapshots }))
  },

  async logout() {
    await logoutApi()
    set({ auth: null, syncStatus: 'idle', syncError: null, planHydrating: false })
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
    const emptyData = emptyScenarioData()
    set({
      scenarios: [...scenarios, { id, name, data: emptyData }],
      activeScenarioId: id,
      ...emptyData,
    })
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
    const s = get()
    const next = {
      ...emptyPlanPayload,
      ...payload,
      profile: { ...emptyProfile, ...profile },
      onboarded: true,
    }
    const data = scenarioData({ ...s, ...next })
    const scenarios = s.scenarios.map((x) =>
      x.id === s.activeScenarioId ? { ...x, data } : x,
    )
    set({ ...next, scenarios })
    get().persist()
    get().recordSnapshot()
  },

  update(patch) { set(patch); get().persist() },

  setProfile(p) { set({ profile: { ...get().profile, ...p } }); get().persist() },

  addItem(collection, item) {
    const extra = collection === 'milestones'
      ? {
          startAge: get().profile.currentAge,
          priority: Math.max(0, ...get().milestones.map((m) => m.priority || 0)) + 1,
        }
      : {}
    set({ [collection]: [...get()[collection], { id: 'x' + Math.round(performance.now() * 1000), ...extra, ...item }] })
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

  moveMilestone(id, direction) {
    const list = [...get().milestones].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    const idx = list.findIndex((m) => m.id === id)
    if (idx < 0) return
    const swap = direction === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= list.length) return
    const a = list[idx]
    const b = list[swap]
    const aPri = a.priority ?? idx + 1
    const bPri = b.priority ?? swap + 1
    set({
      milestones: get().milestones.map((m) => {
        if (m.id === a.id) return { ...m, priority: bPri }
        if (m.id === b.id) return { ...m, priority: aPri }
        return m
      }),
    })
    get().persistLocalOnly()
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
}})

export function redirectAfterAuth(navigate) {
  const s = useStore.getState()
  const hasData = planHasData(s)
  navigate(s.onboarded || hasData ? '/' : '/onboarding', { replace: true })
}

export { isAuthenticated }
