import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import MobileNav from './components/MobileNav.jsx'
import Today from './pages/Today.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Plan from './pages/Plan.jsx'
import Accounts from './pages/Accounts.jsx'
import CashFlow from './pages/CashFlow.jsx'
import MonteCarlo from './pages/MonteCarlo.jsx'
import Milestones from './pages/Milestones.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import Otp from './pages/Otp.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Landing from './pages/Landing.jsx'
import { useStore, isAuthenticated } from './data/store.js'
import { Spinner } from './components/ui.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import AndroidBackHandler from './components/AndroidBackHandler.jsx'
import { shouldShowLanding, markLandingSeen, landingDestination } from './utils/landing.js'

function AppShell() {
  const dark = useStore((s) => s.ui.dark)
  const { pathname } = useLocation()
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 px-5 md:px-8 py-6 pb-24 md:pb-8 max-w-[1400px] w-full mx-auto">
          <ErrorBoundary>
            {/* Keyed on route so each page fades in on navigation. */}
            <div key={pathname} className="animate-page-in">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
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

  const finishLanding = useCallback((action) => {
    markLandingSeen()
    setShowLanding(false)
    navigate(landingDestination(action, { onboarded }), { replace: true })
  }, [navigate, onboarded])

  useEffect(() => {
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
        <Route path="/otp" element={<Otp />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route element={<AppShell />}>
            <Route index element={<Today />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="plan" element={<Plan />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="cash-flow" element={<CashFlow />} />
            <Route path="monte-carlo" element={<MonteCarlo />} />
            <Route path="milestones" element={<Milestones />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
