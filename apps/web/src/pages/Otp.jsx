import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { verifyOtp, verifyPhoneOtp } from '../api/client.js'
import { useStore, redirectAfterAuth, isAuthenticated } from '../data/store.js'

export default function Otp() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const afterLogin = useStore((s) => s.afterLogin)
  const onboarded = useStore((s) => s.onboarded)

  if (isAuthenticated()) {
    return <Navigate to={onboarded ? '/' : '/onboarding'} replace />
  }

  const channel = state?.channel || 'email'
  const email = state?.email || ''
  const phone = state?.phone || ''
  const target = channel === 'phone' ? phone : email

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const refs = useRef([])

  useEffect(() => {
    if (!target) navigate('/login', { replace: true })
  }, [target, navigate])

  function updateDigit(i, val) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
    if (next.every(Boolean)) submit(next.join(''))
  }

  async function submit(otp) {
    setLoading(true)
    setError('')
    try {
      const data = channel === 'phone'
        ? await verifyPhoneOtp(phone, otp)
        : await verifyOtp(email, otp)
      await afterLogin(data.user)
      redirectAfterAuth(navigate)
    } catch (err) {
      setError(err.message)
      setDigits(['', '', '', '', '', ''])
      refs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-ink-50 dark:bg-ink-950">
      <div className="card w-full max-w-md shadow-soft">
        <h1 className="text-xl font-extrabold">Enter OTP</h1>
        <p className="text-sm text-ink-400 mt-1">
          Sent to <span className="font-semibold text-ink-700 dark:text-ink-200">{target}</span>
        </p>
        {import.meta.env.DEV && state?.devOtp && (
          <p className="mt-2 text-xs font-mono bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded-lg px-3 py-2">
            Dev OTP: {state.devOtp}
          </p>
        )}

        <div className="flex gap-2 justify-center my-6">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => updateDigit(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
              }}
              className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900"
            />
          ))}
        </div>

        {error && <p className="text-sm text-rose-600 font-medium text-center mb-3">{error}</p>}
        {loading && <p className="text-sm text-ink-400 text-center">Verifying…</p>}

        <Link to="/login" className="block text-center text-sm font-semibold text-brand-600 mt-4">
          Use a different {channel === 'phone' ? 'number' : 'email'}
        </Link>
      </div>
    </div>
  )
}
