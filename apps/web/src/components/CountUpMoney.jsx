import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { fmtMoney } from '@projectlab/engine'

gsap.registerPlugin(useGSAP)

/**
 * A money figure that counts to its value instead of snapping to it.
 *
 * On mount it runs up from zero; when `value` changes it tweens from wherever it
 * was — so dragging a Plan slider reads as the number moving, not flickering.
 *
 * The tween drives a plain object and formats on each frame rather than animating
 * text: `fmtMoney` switches units (₹98 L → ₹1.02 Cr), so interpolating the rendered
 * string would produce nonsense mid-flight.
 */
export default function CountUpMoney({ value, className = '', duration = 0.9 }) {
  const el = useRef(null)
  const shown = useRef(0)

  useGSAP(() => {
    const target = Number(value) || 0
    const node = el.current
    if (!node) return

    const paint = (n) => { node.textContent = fmtMoney(n, { compact: true }) }

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const proxy = { n: shown.current }
      const tween = gsap.to(proxy, {
        n: target,
        duration,
        ease: 'power2.out',
        onUpdate: () => paint(proxy.n),
        onComplete: () => { shown.current = target },
      })
      return () => tween.kill()
    })
    // Reduced motion (or no match): show the real figure immediately.
    mm.add('(prefers-reduced-motion: reduce)', () => {
      shown.current = target
      paint(target)
    })

    return () => mm.revert()
  }, { dependencies: [value], scope: el })

  // Rendered once as the real value so it is correct before JS runs and for
  // screen readers; GSAP takes over the text node from there.
  return <span ref={el} className={className}>{fmtMoney(Number(value) || 0, { compact: true })}</span>
}
