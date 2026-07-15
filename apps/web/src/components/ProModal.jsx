import { Modal } from './ui.jsx'
import { IconCheck } from './Icons.jsx'

const PERKS = [
  'Unlimited what-if scenarios in the cloud',
  '10,000-run Monte Carlo simulations',
  'Old vs new regime deep comparison & PDF reports',
  'Priority support',
]

// Honest Pro teaser — no billing exists yet, so say so plainly.
export default function ProModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Financial Blueprint Pro">
      <p className="text-sm text-ink-500 dark:text-ink-300">
        Pro is coming soon at <span className="font-bold money">₹149/mo</span> or{' '}
        <span className="font-bold money">₹999/yr</span>. Everything you use today stays free.
      </p>
      <ul className="mt-4 space-y-2.5">
        {PERKS.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm">
            <span className="grid place-items-center h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 shrink-0 mt-0.5">
              <IconCheck size={12} />
            </span>
            {p}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="btn-primary w-full mt-5">
        Got it — notify me when it launches
      </button>
    </Modal>
  )
}
