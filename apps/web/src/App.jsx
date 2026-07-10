import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
import { useStore } from './data/store.js'

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
        </main>
      </div>
      <MobileNav />
    </div>
  )
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
      <Route path="/onboarding" element={onboarded ? <Navigate to="/" replace /> : <Onboarding />} />
      <Route path="/*" element={onboarded ? <AppShell /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}
