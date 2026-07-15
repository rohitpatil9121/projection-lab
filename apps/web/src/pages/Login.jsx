import { useState, useEffect } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { loginUser, registerUser, forgotPassword, resetPassword, requestOtp, requestPhoneOtp } from '../api/client.js'
import { apiConfigError } from '../api/config.js'
import { useStore, redirectAfterAuth, isAuthenticated } from '../data/store.js'
import { Spinner } from '../components/ui.jsx'
import { IconChevron, IconMail, IconLock, IconShield, IconTrend } from '../components/Icons.jsx'

const FEATURES = [
  { icon: '📈', text: 'Year-by-year net-worth projection' },
  { icon: '🎯', text: 'Goals, milestones & life events' },
  { icon: '🎲', text: 'Monte Carlo risk analysis' },
  { icon: '🇮🇳', text: 'EPF · PPF · NPS · SIP · 80C — India-first' },
]


export default function Login() {
  const navigate = useNavigate()
  const afterLogin = useStore((s) => s.afterLogin)
  const onboarded = useStore((s) => s.onboarded)
  const planHydrating = useStore((s) => s.planHydrating)

  // Already signed in — skip login screen
  if (isAuthenticated() && !planHydrating) {
    return <Navigate to={onboarded ? '/' : '/onboarding'} replace />
  }
  const [view, setView] = useState('auth') // 'auth' | 'forgot' | 'reset' | 'otp'
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [otpChannel, setOtpChannel] = useState('email') // 'email' | 'phone'
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [secureDevice, setSecureDevice] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const apiUnavailable = apiConfigError()

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = mode === 'signup'
        ? await registerUser(email.trim(), password, name.trim())
        : await loginUser(email.trim(), password)
      await afterLogin(data.user)
      redirectAfterAuth(navigate)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitForgot(e) {
    e.preventDefault()
    setLoading(true); setError(''); setNotice('')
    try {
      const res = await forgotPassword(email.trim())
      setView('reset')
      setNotice(res.devCode && import.meta.env.DEV
        ? `Dev mode: your reset code is ${res.devCode}`
        : 'If that email exists, a reset code has been sent. Check your inbox.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitReset(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const data = await resetPassword(email.trim(), code.trim(), password)
      await afterLogin(data.user)
      redirectAfterAuth(navigate)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitOtpRequest(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (otpChannel === 'phone') {
        const res = await requestPhoneOtp(phone.trim())
        navigate('/otp', { state: { channel: 'phone', phone: res.phone, devOtp: import.meta.env.DEV ? res.devOtp : undefined } })
      } else {
        const res = await requestOtp(email.trim())
        navigate('/otp', { state: { channel: 'email', email: email.trim(), devOtp: import.meta.env.DEV ? res.devOtp : undefined } })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const goAuth = () => { setView('auth'); setError(''); setNotice(''); setPassword(''); setCode('') }

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
          <button
            type="button"
            onClick={() => (view === 'auth' ? navigate(-1) : goAuth())}
            aria-label="Back"
            className="mb-4 -ml-2 grid place-items-center h-9 w-9 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
          >
            <IconChevron size={18} className="rotate-180" />
          </button>

          <div className="mb-6">
            <span className="grid place-items-center h-11 w-11 rounded-full bg-brand-600 text-white shadow-glow mb-4">
              <IconTrend size={20} />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {view === 'forgot' ? 'Reset Password' : view === 'reset' ? 'Check Your Email' : view === 'otp' ? 'Sign in with OTP' : mode === 'signup' ? 'Open an Account' : 'Welcome Back'}
            </h1>
            <p className="text-sm text-ink-400 mt-2 leading-relaxed">
              {view === 'forgot' ? "Enter your email and we'll send a reset code"
                : view === 'reset' ? 'Enter the code and your new password'
                : view === 'otp' ? 'We will send a 6-digit code to verify you'
                : mode === 'signup' ? 'Start planning in under a minute' : 'Sign in to access your Financial Blueprint and track your net worth.'}
            </p>
          </div>

          {apiUnavailable && (
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2 mb-4">
              {apiUnavailable}
            </p>
          )}
          {error && (
            <p className="flex items-start gap-2 text-sm text-rose-600 font-medium bg-rose-50 dark:bg-rose-950/40 rounded-lg px-3 py-2 mb-4 animate-fade-in">
              <span aria-hidden="true">⚠️</span><span>{error}</span>
            </p>
          )}
          {notice && (
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/40 rounded-lg px-3 py-2 mb-4 animate-fade-in">{notice}</p>
          )}

          {/* ---- AUTH (login / signup) ---- */}
          {view === 'auth' && (
            <>
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
                  <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Email address</span>
                  <div className="relative mt-1">
                    <IconMail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                    <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@institutional.com" className="input pl-10" />
                  </div>
                </label>
                <label className="block">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Password</span>
                    {mode === 'login' && (
                      <button type="button" onClick={() => { setView('forgot'); setError('') }} className="text-xs font-semibold text-brand-600 hover:text-brand-700">forgot?</button>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <IconLock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                    <input
                      type={showPw ? 'text' : 'password'} required
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                      className="input pl-10 pr-16"
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400 hover:text-ink-600 px-2 py-1">
                      {showPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>
                {mode === 'login' && (
                  <label className="flex items-center gap-2.5 text-sm font-medium text-ink-600 dark:text-ink-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={secureDevice}
                      onChange={(e) => setSecureDevice(e.target.checked)}
                      className="h-4 w-4 rounded border-ink-300 accent-brand-600"
                    />
                    Secure login on this device
                  </label>
                )}
                <button type="submit" disabled={loading || !!apiUnavailable} className="btn-primary w-full uppercase tracking-wide">
                  {loading ? <><Spinner size={16} /> Please wait…</> : <>{mode === 'signup' ? 'Create account' : 'Sign in'} <span aria-hidden>→</span></>}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
                <span className="text-xs text-ink-400 font-medium tracking-wide">secure authentication</span>
                <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
              </div>

              <p className="text-center text-sm text-ink-500 dark:text-ink-400">
                {mode === 'signup' ? 'Already have an account? ' : 'New to Financial Blueprint? '}
                <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError('') }} className="font-bold text-brand-600 hover:text-brand-700">
                  {mode === 'signup' ? 'Log in' : 'Open an Account'}
                </button>
              </p>

              <button type="button" onClick={() => { setView('otp'); setError('') }} className="btn-secondary w-full mt-4">Sign in with OTP</button>

              <Link to="/onboarding" className="btn-secondary w-full mt-3 block text-center">Continue as guest</Link>

              <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400 mt-5">
                <IconShield size={13} /> End-to-end encryption enabled
              </p>
              <p className="text-[11px] text-ink-400 text-center mt-2 leading-relaxed">
                Illustration only — not investment advice.{' '}
                <a href="/privacy-policy.html" target="_blank" rel="noreferrer" className="underline hover:text-ink-500">Privacy Policy</a>
              </p>
            </>
          )}

          {/* ---- OTP request ---- */}
          {view === 'otp' && (
            <form onSubmit={submitOtpRequest} className="space-y-4">
              <div className="inline-flex w-full rounded-xl bg-ink-100 dark:bg-ink-800 p-1 text-sm font-semibold" role="tablist">
                <button type="button" role="tab" aria-selected={otpChannel === 'email'}
                  onClick={() => { setOtpChannel('email'); setError('') }}
                  className={`flex-1 px-3 py-2 rounded-lg transition-all duration-200 ${otpChannel === 'email' ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500'}`}
                >Email</button>
                <button type="button" role="tab" aria-selected={otpChannel === 'phone'}
                  onClick={() => { setOtpChannel('phone'); setError('') }}
                  className={`flex-1 px-3 py-2 rounded-lg transition-all duration-200 ${otpChannel === 'phone' ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500'}`}
                >Mobile</button>
              </div>
              {otpChannel === 'email' ? (
                <label className="block">
                  <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Email</span>
                  <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input mt-1" />
                </label>
              ) : (
                <label className="block">
                  <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Mobile number</span>
                  <input type="tel" required autoFocus inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" className="input mt-1" />
                </label>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <><Spinner size={16} /> Sending…</> : 'Send OTP'}
              </button>
              <button type="button" onClick={goAuth} className="btn-secondary w-full">Back to login</button>
            </form>
          )}

          {/* ---- FORGOT: enter email ---- */}
          {view === 'forgot' && (
            <form onSubmit={submitForgot} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Email</span>
                <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input mt-1" />
              </label>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <><Spinner size={16} /> Sending…</> : 'Send reset code'}
              </button>
              <button type="button" onClick={goAuth} className="btn-secondary w-full">Back to login</button>
            </form>
          )}

          {/* ---- RESET: code + new password ---- */}
          {view === 'reset' && (
            <form onSubmit={submitReset} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Reset code</span>
                <input inputMode="numeric" required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" className="input mt-1 tracking-widest" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">New password</span>
                <div className="relative mt-1">
                  <input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="input pr-16" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400 hover:text-ink-600 px-2 py-1">{showPw ? 'Hide' : 'Show'}</button>
                </div>
              </label>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <><Spinner size={16} /> Resetting…</> : 'Reset password & sign in'}
              </button>
              <button type="button" onClick={goAuth} className="btn-secondary w-full">Back to login</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
