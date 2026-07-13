import { useEffect, useState, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import AppLogo from '../components/AppLogo.jsx'
import { registerBackHandler } from '../hooks/backButton.js'

const FEATURES = [
  { icon: '📈', label: 'Net-worth projection', delay: '500ms' },
  { icon: '🎯', label: 'Goals & life events', delay: '650ms' },
  { icon: '🎲', label: 'Monte Carlo risk', delay: '800ms' },
  { icon: '🇮🇳', label: 'EPF · SIP · 80C', delay: '950ms' },
]

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
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-brand-500/30 blur-[100px] animate-float" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-indigo-600/25 blur-[110px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-24 left-1/4 h-[360px] w-[360px] rounded-full bg-emerald-500/15 blur-[90px] animate-float" style={{ animationDelay: '4s' }} />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Mini chart motion */}
      <div aria-hidden className={`absolute right-0 top-24 w-[55%] max-w-[280px] opacity-40 transition-all duration-1000 ${phase >= 1 ? 'translate-x-0 opacity-40' : 'translate-x-8 opacity-0'}`}>
        <svg viewBox="0 0 200 120" className="w-full h-auto">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 100 L40 85 L70 88 L100 55 L130 48 L160 20 L200 8 L200 120 L0 120 Z"
            fill="url(#lg)"
            className="animate-fade-in"
            style={{ animationDelay: '600ms' }}
          />
          <path
            d="M0 100 L40 85 L70 88 L100 55 L130 48 L160 20 L200 8"
            fill="none"
            stroke="#818cf8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="320"
            strokeDashoffset={phase >= 1 ? '0' : '320'}
            style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 pb-8 pt-12">
        {/* Logo ring */}
        <div
          className={`relative mb-8 transition-all duration-700 ${phase >= 1 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
        >
          <div className="absolute inset-0 -m-3 rounded-3xl bg-brand-500/30 blur-xl animate-pulse" />
          <div className="relative rounded-2xl p-1 bg-gradient-to-br from-brand-400 to-indigo-600 shadow-glow">
            <AppLogo size={72} className="rounded-xl shadow-lift" />
          </div>
        </div>

        <p
          className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300 mb-3 animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          India-first planning
        </p>

        <h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center leading-tight animate-fade-in-up"
          style={{ animationDelay: '320ms' }}
        >
          Financial{' '}
          <span className="bg-gradient-to-r from-brand-300 via-indigo-300 to-emerald-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-pan">
            Blueprint
          </span>
        </h1>

        <p
          className="mt-3 text-center text-sm sm:text-base text-ink-300 max-w-xs leading-relaxed animate-fade-in-up"
          style={{ animationDelay: '440ms' }}
        >
          Plan your future in{' '}
          <span className="text-white font-semibold">₹ lakh & crore</span>
          {' '}— income, SIPs, goals & retirement.
        </p>

        {/* Feature chips */}
        <div className={`mt-10 grid grid-cols-2 gap-2.5 w-full max-w-sm transition-all duration-700 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-2.5 animate-fade-in-up"
              style={{ animationDelay: f.delay }}
            >
              <span className="text-lg">{f.icon}</span>
              <span className="text-[11px] font-semibold text-ink-100 leading-tight">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTAs + progress */}
      <div
        className={`relative px-6 pb-10 pt-4 space-y-4 transition-all duration-700 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
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
            className="w-full rounded-2xl bg-white text-ink-900 py-3.5 text-sm font-bold shadow-lift active:scale-[0.98] transition-transform"
          >
            Get started
          </button>
          <button
            type="button"
            onClick={() => finish('signin')}
            className="w-full rounded-2xl border border-white/20 bg-white/5 backdrop-blur py-3 text-sm font-semibold text-white active:scale-[0.98] transition-transform"
          >
            Sign in
          </button>
        </div>

        <button
          type="button"
          onClick={() => finish('guest')}
          className="w-full text-center text-xs font-medium text-ink-400 hover:text-ink-200 transition-colors py-1"
        >
          Continue as guest →
        </button>
      </div>
    </div>
  )
}
