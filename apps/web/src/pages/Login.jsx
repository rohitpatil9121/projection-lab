import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestOtp, requestPhoneOtp } from '../api/client.js'
import { Spinner } from '../components/ui.jsx'

const FEATURES = [
  { icon: '📈', text: 'Year-by-year net-worth projection' },
  { icon: '🎯', text: 'Goals, milestones & life events' },
  { icon: '🎲', text: 'Monte Carlo risk analysis' },
  { icon: '🇮🇳', text: 'EPF · PPF · NPS · SIP · 80C — India-first' },
]

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('phone') // 'phone' | 'email'
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'phone') {
        const digits = phone.replace(/\D/g, '')
        if (digits.length !== 10) throw new Error('Enter a valid 10-digit mobile number')
        const res = await requestPhoneOtp(digits)
        navigate('/otp', { state: { channel: 'phone', phone: res.phone || ('+91' + digits), devOtp: res.devOtp } })
      } else {
        const res = await requestOtp(email)
        navigate('/otp', { state: { channel: 'email', email, devOtp: res.devOtp } })
      }
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
            <h1 className="text-2xl font-extrabold tracking-tight">Welcome to ProjectLab</h1>
            <p className="text-sm text-ink-400 mt-1">Sign in to save &amp; sync your plan</p>
          </div>

          {/* Email / Phone toggle */}
          <div className="inline-flex w-full rounded-xl bg-ink-100 dark:bg-ink-800 p-1 text-sm font-semibold mb-4" role="tablist">
            <button
              type="button" role="tab" aria-selected={mode === 'phone'}
              onClick={() => { setMode('phone'); setError('') }}
              className={`flex-1 px-3 py-2 rounded-lg transition-all duration-200 ${mode === 'phone' ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'}`}
            >📱 Mobile</button>
            <button
              type="button" role="tab" aria-selected={mode === 'email'}
              onClick={() => { setMode('email'); setError('') }}
              className={`flex-1 px-3 py-2 rounded-lg transition-all duration-200 ${mode === 'email' ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'}`}
            >✉️ Email</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'phone' ? (
              <label className="block animate-fade-in">
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Mobile number</span>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800 text-sm font-semibold text-ink-500">+91</span>
                  <input
                    type="tel" inputMode="numeric" required autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="input !rounded-l-none flex-1"
                  />
                </div>
              </label>
            ) : (
              <label className="block animate-fade-in">
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Email</span>
                <input
                  type="email" required autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input mt-1"
                />
              </label>
            )}
            {error && (
              <p className="flex items-start gap-2 text-sm text-rose-600 font-medium bg-rose-50 dark:bg-rose-950/40 rounded-lg px-3 py-2 animate-fade-in">
                <span aria-hidden="true">⚠️</span><span>{error}</span>
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <><Spinner size={16} /> Sending OTP…</> : mode === 'phone' ? 'Send OTP to mobile' : 'Continue with email'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
            <span className="text-xs text-ink-400 font-medium">or</span>
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
          </div>

          <Link to="/onboarding" className="btn-secondary w-full">
            Continue as guest
          </Link>

          <p className="text-[11px] text-ink-400 text-center mt-5 leading-relaxed">
            Illustration only — not investment advice.<br />
            <a href="/privacy-policy.html" target="_blank" rel="noreferrer" className="underline hover:text-ink-500">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
