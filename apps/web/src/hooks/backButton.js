/** Stack of handlers — topmost returns true when it consumed the back press. */
const handlers = []

export function registerBackHandler(handler) {
  handlers.push(handler)
  return () => {
    const i = handlers.indexOf(handler)
    if (i >= 0) handlers.splice(i, 1)
  }
}

export function consumeBackPress() {
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i]()) return true
  }
  return false
}
