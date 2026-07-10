// Minimal zustand-like store with React hook + selector support.
import { useSyncExternalStore } from 'react'

export function create(initializer) {
  let state
  const listeners = new Set()

  const setState = (partial) => {
    const next = typeof partial === 'function' ? partial(state) : partial
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  }
  const getState = () => state

  state = initializer(setState, getState)

  const subscribe = (l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }

  const identity = (s) => s
  function useStore(selector = identity) {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state),
    )
  }
  useStore.getState = getState
  useStore.setState = setState
  return useStore
}
