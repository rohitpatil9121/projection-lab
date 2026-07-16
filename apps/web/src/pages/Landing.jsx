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
      className={`fixed inset-0 z-[200] flex flex-col overflow-hidden text-white transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'radial-gradient(120% 80% at 50% 8%, #1c3350, #101826 55%, #0a0f17)' }}
      role="presentation"
    >
      {/* Drifting dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 animate-grid-pan"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Floating glass slabs — each keeps its own tilt via --r */}
      <div aria-hidden className={`pointer-events-none absolute inset-0 transition-opacity duration-[1400ms] ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        {[
          { cls: 'top-[8%] left-[10%] w-[150px] h-[300px]', r: '-9deg', d: '0s', dur: '7s', bg: 'bg-white/[0.03] border-white/[0.08]' },
          { cls: 'top-[6%] right-[9%] w-[130px] h-[340px]', r: '8deg', d: '.8s', dur: '8.5s', bg: 'bg-white/[0.03] border-white/[0.08]' },
          { cls: 'top-[20%] right-[20%] w-[120px] h-[260px]', r: '-4deg', d: '.4s', dur: '9.5s', bg: 'bg-white/[0.025] border-white/[0.06]' },
          { cls: 'top-[44%] -left-[4%] w-[120px] h-[220px]', r: '6deg', d: '1.2s', dur: '8s', bg: 'bg-white/[0.02] border-white/[0.06]' },
        ].map((p, i) => (
          <div
            key={i}
            className={`absolute rounded-[22px] border backdrop-blur-[2px] animate-float-y ${p.cls} ${p.bg}`}
            style={{ '--r': p.r, animationDelay: p.d, animationDuration: p.dur }}
          />
        ))}
        {/* Warm horizon glow */}
        <div
          className="absolute inset-x-0 top-[46%] h-[200px]"
          style={{ background: 'radial-gradient(60% 100% at 50% 0, rgba(238,216,104,.16), transparent 70%)' }}
        />
        {/* Rising wealth line, drawn on entry */}
        <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[46%] w-full opacity-90">
          <path
            d="M-10 250 L60 232 L110 244 L170 150 L230 176 L300 92 L360 60 L420 20"
            fill="none" stroke="#3f83cd" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            className="animate-draw-line" style={{ strokeDasharray: 1400, strokeDashoffset: 1400 }}
          />
        </svg>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-7 pb-4 pt-14 w-full max-w-md mx-auto text-center">
        {/* Brand icon */}
        <div
          className={`grid place-items-center h-[74px] w-[74px] rounded-full animate-glow-pulse transition-all duration-700 ${phase >= 1 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
          style={{
            background: 'linear-gradient(160deg, #4f93da, #2f6aac)',
            transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <IconTrend size={30} className="!stroke-[2.4]" />
        </div>

        <h1
          className="mt-6 text-[38px] font-extrabold tracking-[-0.03em] leading-[1.05] animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          Engineering Your Wealth
        </h1>

        <p
          className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-white/[0.66] animate-fade-in-up"
          style={{ animationDelay: '360ms' }}
        >
          Institutional-grade planning for the modern Indian investor. Secure, precise, and transparent.
        </p>

        {/* Outlined pill chips */}
        <div className={`mt-6 flex flex-wrap items-center justify-center gap-2.5 transition-all duration-700 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.04] px-4 py-2.5 text-[13px] font-bold">
            <IconShield size={15} /> Secure Assets
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.04] px-4 py-2.5 text-[13px] font-bold">
            <IconTrend size={15} /> Smart Growth
          </span>
        </div>
      </div>

      {/* Bottom CTAs + progress */}
      <div
        className={`relative px-7 pb-8 pt-4 w-full max-w-md mx-auto transition-all duration-700 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="h-1 rounded-full bg-white/[0.12] overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-100 linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <button
          type="button"
          onClick={() => finish('continue')}
          className="mt-6 w-full rounded-2xl bg-brand-500 py-[17px] text-base font-extrabold text-white shadow-[0_14px_34px_-10px_rgba(63,131,205,.8)] transition-transform hover:bg-brand-400 active:scale-[0.98]"
        >
          Get Started <span aria-hidden>→</span>
        </button>
        <button
          type="button"
          onClick={() => finish('signin')}
          className="mt-3 w-full rounded-2xl border border-white/20 bg-white/[0.04] py-4 text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
        >
          Sign In <span aria-hidden>›</span>
        </button>

        <button
          type="button"
          onClick={() => finish('guest')}
          className="mt-3 w-full py-1 text-center text-xs font-medium text-white/40 transition-colors hover:text-white/70"
        >
          Continue as guest →
        </button>

        <p className="mt-5 text-center text-[10px] font-bold tracking-[0.14em] text-white/[0.32]">
          FINANCIAL BLUEPRINT · V{__APP_VERSION__} · {__BUILD_STAMP__}
        </p>
      </div>
    </div>
  )
}
