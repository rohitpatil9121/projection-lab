// Maps the engine's goal evaluation onto the design's three status pills.
// The engine judges "on track" against the goal's own timeline (expected vs actual
// progress), which is stronger than a flat percentage cut-off — we only fall back to
// one when a goal has no target age to measure against.

const ACHIEVED = { label: 'Achieved', color: '#469b88' }
const AHEAD = { label: 'Ahead of Schedule', color: '#469b88' }
const ON_TRACK = { label: 'On Track', color: '#377cc8' }
const NEEDS_PUSH = { label: 'Needs push', color: '#d9a441' }
const NO_TARGET = { label: 'Set target age', color: '#cbd5e1' }

export function goalStatus(ev) {
  if (ev.progress >= 100) return ACHIEVED
  if (ev.track === 'ahead') return AHEAD
  if (ev.track === 'on-track') return ON_TRACK
  if (ev.track === 'behind') return NEEDS_PUSH
  // No target age set — nothing to be early or late against.
  return NO_TARGET
}

/** Bar/ring colour only — falls back to a progress read when there's no timeline. */
export function goalColor(ev) {
  const s = goalStatus(ev)
  if (s !== NO_TARGET) return s.color
  return ev.progress >= 40 ? ON_TRACK.color : NEEDS_PUSH.color
}
