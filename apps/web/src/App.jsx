import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import { useStore, isAuthenticated } from './data/store.js'
import { Spinner } from './components/ui.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

function AppShell() {
  const dark = useStore((s) => s.ui.dark)
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
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/cash-flow" element={<CashFlow />} />
              <Route path="/monte-carlo" element={<MonteCarlo />} />
              <Route path="/milestones" element={<Milestones />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
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

function ProtectedApp() {
  const onboarded = useStore((s) => s.onboarded)
  const planHydrating = useStore((s) => s.planHydrating)
  const hasAuth = isAuthenticated()

  // Signed in but setup not finished → onboarding (not login again)
  if (hasAuth && !onboarded) {
    return <Navigate to="/onboarding" replace />
  }

  // Not signed in and never set up → login / guest entry
  if (!onboarded && !hasAuth) {
    return <Navigate to="/login" replace />
  }

  // Cold start: restore cloud plan before showing dashboard
  if (hasAuth && planHydrating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-ink-50 dark:bg-ink-950">
        <Spinner size={28} className="text-brand-600" />
        <p className="text-sm font-medium text-ink-500">Loading your plan…</p>
      </div>
    )
  }

  return <AppShell />
}

export default function App() {
  const initFromSession = useStore((s) => s.initFromSession)
  const scheduleSync = useStore((s) => s.scheduleSync)

  useEffect(() => {
    initFromSession()
    useStore.getState().recordSnapshot()
    const onOnline = () => scheduleSync()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [initFromSession, scheduleSync])

  const onboarded = useStore((s) => s.onboarded)

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/otp" element={<Otp />} />
      <Route path="/onboarding" element={<OnboardingRoute />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  )
}
