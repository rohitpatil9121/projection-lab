import { useEffect, useState, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { IconShield, IconTrend } from '../components/Icons.jsx'
import { registerBackHandler } from '../hooks/backButton.js'

const AUTO_MS = Capacitor.isNativePlatform() ? 4800 : 5500

export default function Landing({ onComplete }) {
  const [phase, setPhase] = useState(0)
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting] = useState(false)

  const finish = useCallback((action = 'continue') => {
    if (exiting) return
    setExiting(true)
    setTimeout(() => onComplete(action), 380)
  }, [exiting, onComplete])

  const finishRef = useRef(finish)
  finishRef.current = finish

  useEffect(() => {
    const start = performance.now()
    let frame
    const tick = (now) => {
      const pct = Math.min(100, ((now - start) / AUTO_MS) * 100)
      setProgress(pct)
      if (pct < 100) frame = requestAnimationFrame(tick)
      else finishRef.current('continue')
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 1200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    return registerBackHandler(() => {
      finishRef.current('continue')
      return true
    })
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col overflow-hidden bg-ink-950 text-white transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      role="presentation"
    >
      {/* Animated background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-brand-500/25 blur-[100px] animate-float" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-[110px] animate-float" style={{ animationDelay: '2s' }} />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* 3D-style scene: glass panels + spiral ribbons (mock p1) */}
      <div aria-hidden className={`absolute inset-0 transition-opacity duration-[1400ms] ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <svg viewBox="0 0 430 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
          <defs>
            <linearGradient id="pane" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#312e81" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="ribbonA" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ribbonB" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Floating glass panels */}
          <g stroke="#c7d2fe" strokeOpacity="0.14" fill="url(#pane)">
            <rect x="235" y="180" width="90" height="240" rx="8" transform="rotate(8 280 300)" />
            <rect x="300" y="120" width="76" height="300" rx="8" transform="rotate(-6 338 270)" />
            <rect x="60" y="230" width="80" height="210" rx="8" transform="rotate(-10 100 335)" />
            <rect x="150" y="140" width="70" height="200" rx="8" transform="rotate(4 185 240)" />
            <rect x="330" y="430" width="70" height="180" rx="8" transform="rotate(12 365 520)" />
          </g>

          {/* Spiral ribbons wrapping the scene */}
          <g fill="none" strokeLinecap="round">
            <path d="M-30 560 C 90 480, 340 470, 460 560" stroke="url(#ribbonA)" strokeWidth="26" />
            <path d="M-30 610 C 110 700, 320 700, 460 600" stroke="url(#ribbonA)" strokeWidth="18" strokeOpacity="0.7" />
            <path d="M-30 500 C 130 430, 300 430, 460 510" stroke="url(#ribbonB)" strokeWidth="12" />
            <path d="M-30 660 C 140 760, 300 750, 460 650" stroke="url(#ribbonB)" strokeWidth="8" strokeOpacity="0.8" />
          </g>

          {/* Rising wealth line */}
          <path d="M20 840 L110 800 L170 810 L240 740 L300 720 L360 660 L430 630 L430 900 L20 900 Z" fill="url(#lg)" opacity="0.5" />
          <path
            d="M20 840 L110 800 L170 810 L240 740 L300 720 L360 660 L430 630"
            fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round"
            strokeDasharray="620" strokeDashoffset={phase >= 1 ? '0' : '620'}
            style={{ transition: 'stroke-dashoffset 2.2s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 pb-4 pt-12 w-full max-w-md mx-auto">
        {/* Brand icon in indigo circle */}
        <div
          className={`relative mb-8 transition-all duration-700 ${phase >= 1 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
        >
          <div className="absolute inset-0 -m-3 rounded-full bg-brand-500/30 blur-xl animate-pulse" />
          <div className="relative grid place-items-center h-20 w-20 rounded-full bg-brand-600 shadow-glow">
            <IconTrend size={34} />
          </div>
        </div>

        <h1
          className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center leading-[1.1] animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          Engineering Your
          <br />
          Wealth
        </h1>

        <p
          className="mt-4 text-center text-sm sm:text-base text-ink-300 max-w-xs leading-relaxed animate-fade-in-up"
          style={{ animationDelay: '360ms' }}
        >
          Institutional-grade planning for the modern Indian investor. Secure, precise, and transparent.
        </p>

        {/* Outlined pill chips */}
        <div className={`mt-10 flex items-center justify-center gap-3 w-full transition-all duration-700 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur px-4 py-2 text-xs sm:text-sm font-semibold text-ink-100">
            <IconShield size={16} className="text-white" /> Secure Assets
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur px-4 py-2 text-xs sm:text-sm font-semibold text-ink-100">
            <IconTrend size={16} className="text-white" /> Smart Growth
          </span>
        </div>
      </div>

      {/* Bottom CTAs + progress */}
      <div
        className={`relative px-6 pb-8 pt-4 space-y-4 w-full max-w-md mx-auto transition-all duration-700 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-indigo-400 transition-[width] duration-100 linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => finish('continue')}
            className="w-full rounded-2xl bg-brand-600 hover:bg-brand-500 text-white py-3.5 text-sm font-bold shadow-glow active:scale-[0.98] transition-transform"
          >
            Get Started <span aria-hidden>→</span>
          </button>
          <button
            type="button"
            onClick={() => finish('signin')}
            className="w-full rounded-2xl border border-white/25 bg-white/5 backdrop-blur py-3 text-sm font-semibold text-white active:scale-[0.98] transition-transform"
          >
            Sign In <span aria-hidden>›</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => finish('guest')}
          className="w-full text-center text-xs font-medium text-ink-400 hover:text-ink-200 transition-colors py-1"
        >
          Continue as guest →
        </button>

        <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-ink-500">
          Financial Blueprint · V{__APP_VERSION__} · {__BUILD_STAMP__}
        </p>
      </div>
    </div>
  )
}
