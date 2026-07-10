import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestOtp } from '../api/client.js'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await requestOtp(email)
      navigate('/otp', { state: { email, devOtp: res.devOtp } })
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

        <form onSubmit={submit} className="space-y-4">
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
          {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending OTP…' : 'Continue with email'}
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
