import { useEffect, useState, useCallback, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { IconShield, IconTrend } from '../components/Icons.jsx'
import { registerBackHandler } from '../hooks/backButton.js'

gsap.registerPlugin(useGSAP)

export default function Landing({ onComplete }) {
  const [phase, setPhase] = useState(0)
  const [exiting, setExiting] = useState(false)
  const root = useRef(null)

  const finish = useCallback(() => {
    if (exiting) return
    setExiting(true)
    setTimeout(() => onComplete(), 380)
  }, [exiting, onComplete])

  const finishRef = useRef(finish)
  finishRef.current = finish

  // Fades the background scene in behind the content stagger.
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 400)
    return () => clearTimeout(t)
  }, [])

  // The design's own entrance: every .lz element rises in, one after another.
  // matchMedia gives us a no-op branch for reduced motion — GSAP writes inline
  // styles, so the stylesheet's reduced-motion rule can't reach these.
  //
  // fromTo, not from: this callback runs more than once, and .from() infers its
  // destination from wherever the element sits at call time. Staggered elements sit
  // parked at the start offset waiting their turn, so a second .from() read y:26 as
  // the resting place and left whichever element was waiting stranded 26px down —
  // most visibly the CTA, dropped onto the version line. Stating both ends fixes it.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        '.lz',
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.75, stagger: 0.12, ease: 'power3.out', delay: 0.12, overwrite: 'auto' },
      )
    })
    return () => mm.revert()
  }, { scope: root })

  useEffect(() => {
    return registerBackHandler(() => {
      finishRef.current()
      return true
    })
  }, [])

  return (
    <div
      ref={root}
      className={`fixed inset-0 z-[200] flex flex-col overflow-hidden text-white transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'radial-gradient(120% 80% at 50% 8%, #1c3350, #101826 55%, #0a0f17)' }}
      role="presentation"
    >
      {/* Drifting dot grid. Oversized by one cell so translating it never exposes an
          edge, and the pattern repeats exactly at 44px — the loop is seamless. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[44px] opacity-60 animate-grid-pan"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          willChange: 'transform',
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
          // No backdrop-blur here on purpose: at 2–3% white over a dark gradient a
          // 2px blur is invisible, but it forces the GPU to re-sample the backdrop
          // behind four moving elements every frame. Pure cost, no pixels.
          <div
            key={i}
            className={`absolute rounded-[22px] border animate-float-y ${p.cls} ${p.bg}`}
            style={{ '--r': p.r, animationDelay: p.d, animationDuration: p.dur, willChange: 'transform' }}
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
        {/* Brand icon. The halo is its own element so the pulse can ride on
            scale/opacity — the previous animated box-shadow repainted every frame. */}
        <div className="lz relative grid place-items-center h-[74px] w-[74px]">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-brand-500/60 blur-xl animate-glow-pulse"
            style={{ willChange: 'transform, opacity' }}
          />
          <span
            className="relative grid place-items-center h-full w-full rounded-full"
            style={{
              background: 'linear-gradient(160deg, #4f93da, #2f6aac)',
              boxShadow: '0 0 42px 6px rgba(63,131,205,.45)',
            }}
          >
            <IconTrend size={30} className="!stroke-[2.4]" />
          </span>
        </div>

        <h1 className="lz mt-6 text-[38px] font-extrabold tracking-[-0.03em] leading-[1.05]">
          Engineering Your Wealth
        </h1>

        <p className="lz mt-4 max-w-[300px] text-[15px] leading-relaxed text-white/[0.66]">
          Institutional-grade planning for the modern Indian investor. Secure, precise, and transparent.
        </p>

        {/* Outlined pill chips */}
        <div className="lz mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.04] px-4 py-2.5 text-[13px] font-bold">
            <IconShield size={15} /> Secure Assets
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.04] px-4 py-2.5 text-[13px] font-bold">
            <IconTrend size={15} /> Smart Growth
          </span>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative px-7 pb-8 pt-4 w-full max-w-md mx-auto">
        <button
          type="button"
          onClick={finish}
          className="lz w-full rounded-2xl bg-brand-500 py-[17px] text-base font-extrabold text-white shadow-[0_14px_34px_-10px_rgba(63,131,205,.8)] transition-transform hover:bg-brand-400 active:scale-[0.98]"
        >
          Get Started <span aria-hidden>→</span>
        </button>

        <p className="lz mt-5 text-center text-[10px] font-bold tracking-[0.14em] text-white/[0.32]">
          FINANCIAL BLUEPRINT · V{__APP_VERSION__} · {__BUILD_STAMP__}
        </p>
      </div>
    </div>
  )
}
