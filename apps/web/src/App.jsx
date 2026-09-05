import { useEffect, useState, useCallback, useRef } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Topbar from './components/Topbar.jsx'
import MobileNav from './components/MobileNav.jsx'
import Plan from './pages/Plan.jsx'
import Accounts from './pages/Accounts.jsx'
import CashFlow from './pages/CashFlow.jsx'
import MonteCarlo from './pages/MonteCarlo.jsx'
import Enough from './pages/Enough.jsx'
import Milestones from './pages/Milestones.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Landing from './pages/Landing.jsx'
import { useStore, isAuthenticated } from './data/store.js'
import { warmApi } from './api/client.js'
import { Spinner } from './components/ui.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import AndroidBackHandler from './components/AndroidBackHandler.jsx'
import { shouldShowLanding, markLandingSeen, landingDestination } from './utils/landing.js'

gsap.registerPlugin(useGSAP)

/**
 * Rises the page's cards in sequence rather than all at once.
 *
 * Everything moving on the same frame is what made the app read cheap; 55ms between
 * neighbours is enough for the eye to follow the page assembling itself. Mounted under
 * `key={pathname}`, so each navigation is a fresh mount and replays the cascade.
 *
 * `clearProps` matters: cards keep their own hover transforms, and a leftover inline
 * transform from the tween would fight them.
 */
function PageCascade({ children }) {
  const scope = useRef(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const cards = gsap.utils.toArray('.card, .hero-card', scope.current)
      if (!cards.length) return
      gsap.from(cards, {
        y: 22,
        opacity: 0,
        duration: 0.8,
        ease: 'expo.out',
        stagger: 0.06,
        clearProps: 'transform,opacity',
      })
    })
    return () => mm.revert()
  }, { scope })

  return <div ref={scope}>{children}</div>
}

function AppShell() {
  const dark = useStore((s) => s.ui.dark)
  const { pathname } = useLocation()
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // No sidebar: the chrome is a floating bar up top and, on a phone, a dock at the
  // bottom. Content sits in one measured column so a card is never wider than it can
  // be read.
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Topbar />
      <main className="w-full max-w-3xl mx-auto flex-1 px-4 md:px-6 pt-6 md:pt-10 pb-32 md:pb-20">
        <ErrorBoundary>
          {/* Keyed on route so each navigation replays the card cascade. */}
          <PageCascade key={pathname}>
            <Outlet />
          </PageCascade>
        </ErrorBoundary>
      </main>
      <MobileNav />
    </div>
  )
}

function OnboardingRoute() {
  const onboarded = useStore((s) => s.onboarded)
  const { state } = useLocation()
  if (onboarded && !state?.newScenario) return <Navigate to="/" replace />
  return <Onboarding />
}

function ProtectedLayout() {
  const onboarded = useStore((s) => s.onboarded)
  const planHydrating = useStore((s) => s.planHydrating)
  const hasAuth = isAuthenticated()

  if (hasAuth && !onboarded) {
    return <Navigate to="/onboarding" replace />
  }

  if (!onboarded && !hasAuth) {
    return <Navigate to="/login" replace />
  }

  if (hasAuth && planHydrating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-ink-50 dark:bg-ink-950">
        <Spinner size={28} className="text-brand-600" />
        <p className="text-sm font-medium text-ink-500">Loading your plan…</p>
      </div>
    )
  }

  return <Outlet />
}

export default function App() {
  const navigate = useNavigate()
  const onboarded = useStore((s) => s.onboarded)
  const initFromSession = useStore((s) => s.initFromSession)
  const scheduleSync = useStore((s) => s.scheduleSync)
  const [showLanding, setShowLanding] = useState(shouldShowLanding)

  const finishLanding = useCallback(() => {
    markLandingSeen()
    setShowLanding(false)
    navigate(landingDestination({ onboarded }), { replace: true })
  }, [navigate, onboarded])

  useEffect(() => {
    // Start waking the API immediately: on Render's free plan it sleeps and takes
    // ~25s to come back, and the landing screen buys most of that time for free.
    warmApi()
    initFromSession()
    useStore.getState().recordSnapshot()
    const onOnline = () => scheduleSync()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [initFromSession, scheduleSync])

  return (
    <ErrorBoundary>
      {showLanding && <Landing onComplete={finishLanding} />}
      <AndroidBackHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/enough/plan" replace />} />
            <Route path="plan" element={<Plan />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="cash-flow" element={<CashFlow />} />
            <Route path="monte-carlo" element={<MonteCarlo />} />
            <Route path="enough" element={<Enough />} />
            <Route path="enough/plan" element={<Enough />} />
            <Route path="enough/what-if" element={<Enough />} />
            <Route path="milestones" element={<Milestones />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
