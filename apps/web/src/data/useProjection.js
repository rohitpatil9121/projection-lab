import { useMemo } from 'react'
import { useStore } from './store.js'
import { computeProjection, computeReadiness } from './store.js'

// Recomputes the full projection whenever any input collection changes.
export function useProjection() {
  const profile = useStore((s) => s.profile)
  const accounts = useStore((s) => s.accounts)
  const incomes = useStore((s) => s.incomes)
  const expenses = useStore((s) => s.expenses)
  const contributions = useStore((s) => s.contributions)
  const events = useStore((s) => s.events)
  const currentYear = useStore((s) => s.currentYear)
  const realTerms = useStore((s) => s.ui.realTerms)
  const taxAware = useStore((s) => !!s.ui.taxAware)

  return useMemo(() => {
    const state = { profile, accounts, incomes, expenses, contributions, events, currentYear, realTerms, taxAware }
    const projection = computeProjection(state)
    const readiness = computeReadiness(state, projection)
    return { projection, readiness, state }
  }, [profile, accounts, incomes, expenses, contributions, events, currentYear, realTerms, taxAware])
}
