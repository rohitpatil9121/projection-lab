import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestOtp, requestPhoneOtp } from '../api/client.js'

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
    <div className="min-h-screen flex items-center justify-center px-5 bg-ink-50 dark:bg-ink-950">
      <div className="card w-full max-w-md shadow-soft">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white text-xl font-extrabold mb-3">PL</div>
          <h1 className="text-2xl font-extrabold tracking-tight">ProjectLab India</h1>
          <p className="text-sm text-ink-400 mt-1">Plan your financial future in ₹ lakh/crore</p>
        </div>

        {/* Email / Phone toggle */}
        <div className="inline-flex w-full rounded-xl bg-ink-100 dark:bg-ink-800 p-1 text-sm font-semibold mb-4">
          <button
            type="button"
            onClick={() => { setMode('phone'); setError('') }}
            className={`flex-1 px-3 py-2 rounded-lg transition ${mode === 'phone' ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500'}`}
          >📱 Mobile</button>
          <button
            type="button"
            onClick={() => { setMode('email'); setError('') }}
            className={`flex-1 px-3 py-2 rounded-lg transition ${mode === 'email' ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500'}`}
          >✉️ Email</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'phone' ? (
            <label className="block">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Mobile number</span>
              <div className="flex mt-1">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800 text-sm font-semibold text-ink-500">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  className="input !rounded-l-none flex-1"
                />
              </div>
            </label>
          ) : (
            <label className="block">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input mt-1"
              />
            </label>
          )}
          {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending OTP…' : mode === 'phone' ? 'Send OTP to mobile' : 'Continue with email'}
          </button>
        </form>

        <p className="text-xs text-ink-400 text-center mt-6 leading-relaxed">
          Illustration only — not investment advice. By continuing you agree to our terms.
        </p>

        <div className="mt-4 text-center">
          <Link to="/onboarding" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Continue as guest (local only)
          </Link>
        </div>
      </div>
    </div>
  )
}
