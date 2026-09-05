import { IconPlan, IconTarget, IconSpark, IconSettings } from './Icons.jsx'

// One list for the desktop island and the mobile dock, so they can never disagree.
export const NAV_LINKS = [
  { to: '/enough/plan', label: 'Your plan', Icon: IconPlan },
  { to: '/enough', label: 'FIRE number', Icon: IconTarget, end: true },
  { to: '/enough/what-if', label: 'What if', Icon: IconSpark },
  { to: '/settings', label: 'Settings', Icon: IconSettings },
]
