import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '../api/client.js'
import { useStore } from '../data/store.js'
import { Spinner } from '../components/ui.jsx'

const FEATURES = [
  { icon: '📈', text: 'Year-by-year net-worth projection' },
  { icon: '🎯', text: 'Goals, milestones & life events' },
  { icon: '🎲', text: 'Monte Carlo risk analysis' },
  { icon: '🇮🇳', text: 'EPF · PPF · NPS · SIP · 80C — India-first' },
]

export default function Login() {
  const navigate = useNavigate()
  const afterLogin = useStore((s) => s.afterLogin)
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = mode === 'signup'
        ? await registerUser(email.trim(), password, name.trim())
        : await loginUser(email.trim(), password)
      await afterLogin(data.user)
      navigate(useStore.getState().onboarded ? '/' : '/onboarding', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-5 py-10 bg-ink-50 dark:bg-ink-950">
      {/* Animated background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-brand-400/25 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        {/* Left — hero (desktop) */}
        <div className="hidden lg:block animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 dark:border-ink-800 bg-white/60 dark:bg-ink-900/60 backdrop-blur px-3 py-1 text-xs font-semibold text-ink-500 mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> India-first financial planning
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Plan your financial future in{' '}
            <span className="bg-gradient-to-r from-brand-500 to-indigo-500 bg-clip-text text-transparent">₹ lakh &amp; crore</span>
          </h1>
          <p className="text-ink-500 dark:text-ink-400 mt-4 text-lg leading-relaxed max-w-md">
            Model income, investments, loans and life events — then see exactly when you hit financial freedom.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f, i) => (
              <li key={f.text} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${120 + i * 90}ms` }}>
                <span className="grid place-items-center h-9 w-9 rounded-xl bg-white dark:bg-ink-900 shadow-card text-lg shrink-0">{f.icon}</span>
                <span className="text-sm font-medium text-ink-600 dark:text-ink-300">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — auth card */}
        <div className="card shadow-lift w-full max-w-md mx-auto lg:mx-0 animate-scale-in">
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white text-xl font-extrabold mb-3 shadow-glow">PL</div>
            <h1 className="text-2xl font-extrabold tracking-tight">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
            <p className="text-sm text-ink-400 mt-1">{mode === 'signup' ? 'Start planning in under a minute' : 'Sign in to your ProjectLab account'}</p>
          </div>

          {/* Login / Signup toggle */}
          <div className="inline-flex w-full rounded-xl bg-ink-100 dark:bg-ink-800 p-1 text-sm font-semibold mb-4" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'}
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 px-3 py-2 rounded-lg transition-all duration-200 ${mode === 'login' ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'}`}
            >Log in</button>
            <button type="button" role="tab" aria-selected={mode === 'signup'}
              onClick={() => { setMode('signup'); setError('') }}
              className={`flex-1 px-3 py-2 rounded-lg transition-all duration-200 ${mode === 'signup' ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'}`}
            >Sign up</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <label className="block animate-fade-in">
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Your name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohit" className="input mt-1" />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Email</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input mt-1" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Password</span>
              <div className="relative mt-1">
                <input
                  type={showPw ? 'text' : 'password'} required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  className="input pr-16"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400 hover:text-ink-600 px-2 py-1">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            {error && (
              <p className="flex items-start gap-2 text-sm text-rose-600 font-medium bg-rose-50 dark:bg-rose-950/40 rounded-lg px-3 py-2 animate-fade-in">
                <span aria-hidden="true">⚠️</span><span>{error}</span>
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <><Spinner size={16} /> Please wait…</> : mode === 'signup' ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-400 mt-4">
            {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError('') }} className="font-semibold text-brand-600 hover:text-brand-700">
              {mode === 'signup' ? 'Log in' : 'Sign up'}
            </button>
          </p>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
            <span className="text-xs text-ink-400 font-medium">or</span>
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
          </div>

          <Link to="/onboarding" className="btn-secondary w-full">Continue as guest</Link>

          <p className="text-[11px] text-ink-400 text-center mt-5 leading-relaxed">
            Illustration only — not investment advice.<br />
            <a href="/privacy-policy.html" target="_blank" rel="noreferrer" className="underline hover:text-ink-500">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
