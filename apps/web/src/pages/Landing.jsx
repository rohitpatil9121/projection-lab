import { useEffect, useState, useCallback, useRef } from 'react'
import { registerBackHandler } from '../hooks/backButton.js'

// Brand-colour petal tiles — the hero collage (from the brand palette).
const TILES = [
  { c: '#e0533d', r: 'rounded-tl-[3rem] rounded-br-[3rem] rounded-tr-2xl rounded-bl-2xl' }, // coral
  { c: '#469b88', r: 'rounded-tr-[3rem] rounded-bl-[3rem] rounded-tl-2xl rounded-br-2xl' }, // teal
  { c: '#377cc8', r: 'rounded-bl-[3rem] rounded-tr-[3rem] rounded-tl-2xl rounded-br-2xl' }, // blue
  { c: '#eed868', r: 'rounded-br-[3rem] rounded-tl-[3rem] rounded-tr-2xl rounded-bl-2xl' }, // sun
  { c: '#e78c9d', r: 'rounded-tl-[3rem] rounded-br-[3rem] rounded-tr-2xl rounded-bl-2xl' }, // blossom
  { c: '#9da7d0', r: 'rounded-tr-[3rem] rounded-bl-[3rem] rounded-tl-2xl rounded-br-2xl' }, // periwinkle
]

export default function Landing({ onComplete }) {
  const [shown, setShown] = useState(false)
  const [exiting, setExiting] = useState(false)

  const finish = useCallback((action = 'continue') => {
    if (exiting) return
    setExiting(true)
    setTimeout(() => onComplete(action), 360)
  }, [exiting, onComplete])

  const finishRef = useRef(finish)
  finishRef.current = finish

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => registerBackHandler(() => { finishRef.current('continue'); return true }), [])

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col bg-ink-950 text-white transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      role="presentation"
    >
      {/* Top-right: quiet sign-in for returning users */}
      <div className="flex justify-end px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <button type="button" onClick={() => finish('signin')} className="text-sm font-semibold text-ink-400 hover:text-white transition-colors px-2 py-1">
          Sign in
        </button>
      </div>

      {/* Hero collage — brand-colour petal tiles */}
      <div className="flex-1 grid place-items-center px-8">
        <div className={`grid grid-cols-2 gap-3.5 w-full max-w-[280px] transition-all duration-700 ease-out ${shown ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          {TILES.map((t, i) => (
            <div
              key={i}
              className={`aspect-square ${t.r} transition-all duration-500`}
              style={{ background: t.c, transitionDelay: `${i * 70}ms`, transform: shown ? 'none' : 'translateY(16px)', opacity: shown ? 1 : 0 }}
            />
          ))}
        </div>
      </div>

      {/* Headline + subtitle + dots + arrow */}
      <div className={`px-7 pb-[max(2.5rem,env(safe-area-inset-bottom))] w-full max-w-md mx-auto transition-all duration-700 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '250ms' }}>
        <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight">
          Plan your money,<br />with clarity.
        </h1>
        <p className="mt-3 text-sm text-ink-400 leading-relaxed max-w-xs">
          Net worth, taxes and goals in one simple blueprint for your financial future.
        </p>

        <div className="mt-9 flex items-center justify-between">
          <div className="flex items-center gap-2" aria-hidden>
            <span className="h-2 w-6 rounded-full bg-white" />
            <span className="h-2 w-2 rounded-full bg-white/25" />
            <span className="h-2 w-2 rounded-full bg-white/25" />
          </div>
          <button
            type="button"
            onClick={() => finish('continue')}
            className="grid place-items-center h-16 w-16 rounded-full bg-white text-ink-900 shadow-lg active:scale-95 transition-transform"
            aria-label="Get started"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
