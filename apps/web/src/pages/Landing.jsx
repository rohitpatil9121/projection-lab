import { useEffect, useState, useCallback, useRef } from 'react'
import { registerBackHandler } from '../hooks/backButton.js'

const C = { coral: '#e0533d', teal: '#469b88', blue: '#377cc8', sun: '#eed868', blossom: '#e78c9d', peri: '#9da7d0' }
const PETAL = [
  'rounded-tl-[3rem] rounded-br-[3rem] rounded-tr-2xl rounded-bl-2xl',
  'rounded-tr-[3rem] rounded-bl-[3rem] rounded-tl-2xl rounded-br-2xl',
  'rounded-bl-[3rem] rounded-tr-[3rem] rounded-tl-2xl rounded-br-2xl',
  'rounded-br-[3rem] rounded-tl-[3rem] rounded-tr-2xl rounded-bl-2xl',
]

// Three real onboarding slides — each a distinct brand-tile arrangement + copy.
const SLIDES = [
  {
    tiles: [C.coral, C.teal, C.blue, C.sun, C.blossom, C.peri],
    title: ['Plan your money,', 'with clarity.'],
    body: 'Net worth, cash flow and projections in one simple blueprint.',
  },
  {
    tiles: [C.blue, C.sun, C.teal, C.peri, C.coral, C.blossom],
    title: ['Save more', 'on taxes.'],
    body: 'Compare the old vs new regime and track every 80C rupee.',
  },
  {
    tiles: [C.teal, C.blossom, C.sun, C.coral, C.peri, C.blue],
    title: ['Reach every', 'life goal.'],
    body: 'Set targets, get a clear plan, and watch your progress grow.',
  },
]

export default function Landing({ onComplete }) {
  const [i, setI] = useState(0)
  const [shown, setShown] = useState(false)
  const [exiting, setExiting] = useState(false)
  const touchX = useRef(null)

  const finish = useCallback((action = 'continue') => {
    if (exiting) return
    setExiting(true)
    setTimeout(() => onComplete(action), 360)
  }, [exiting, onComplete])

  const finishRef = useRef(finish)
  finishRef.current = finish

  const next = () => (i < SLIDES.length - 1 ? setI(i + 1) : finish('continue'))

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Android back: step to previous slide, else leave.
  useEffect(() => registerBackHandler(() => {
    setI((cur) => { if (cur > 0) return cur - 1; finishRef.current('continue'); return cur })
    return true
  }), [])

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (dx < -40 && i < SLIDES.length - 1) setI(i + 1)
    if (dx > 40 && i > 0) setI(i - 1)
  }

  const slide = SLIDES[i]

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col bg-ink-950 text-white transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      role="presentation"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top-right: quiet sign-in */}
      <div className="flex justify-end px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <button type="button" onClick={() => finish('signin')} className="text-sm font-semibold text-ink-400 hover:text-white transition-colors px-2 py-1">
          Sign in
        </button>
      </div>

      {/* Hero collage — re-keyed per slide so tiles animate in on change */}
      <div className="flex-1 grid place-items-center px-8">
        <div key={i} className={`grid grid-cols-2 gap-3.5 w-full max-w-[280px] transition-all duration-500 ${shown ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          {slide.tiles.map((c, idx) => (
            <div
              key={idx}
              className={`aspect-square ${PETAL[idx % PETAL.length]} animate-fade-in-up`}
              style={{ background: c, animationDelay: `${idx * 60}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Copy + dots + arrow */}
      <div className="px-7 pb-[max(2.5rem,env(safe-area-inset-bottom))] w-full max-w-md mx-auto">
        <div key={i} className="animate-fade-in-up">
          <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight">
            {slide.title[0]}<br />{slide.title[1]}
          </h1>
          <p className="mt-3 text-sm text-ink-400 leading-relaxed max-w-xs">{slide.body}</p>
        </div>

        <div className="mt-9 flex items-center justify-between">
          <div className="flex items-center gap-2" role="tablist" aria-label="Intro slides">
            {SLIDES.map((_, d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === i}
                aria-label={`Slide ${d + 1}`}
                onClick={() => setI(d)}
                className={`h-2 rounded-full transition-all duration-300 ${d === i ? 'w-6 bg-white' : 'w-2 bg-white/25 hover:bg-white/50'}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="grid place-items-center h-16 w-16 rounded-full bg-white text-ink-900 shadow-lg active:scale-95 transition-transform"
            aria-label={i < SLIDES.length - 1 ? 'Next' : 'Get started'}
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
