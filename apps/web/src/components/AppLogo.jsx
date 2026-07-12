export default function AppLogo({ size = 36, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="Financial Blueprint"
      width={size}
      height={size}
      className={`rounded-xl object-cover shrink-0 ${className}`}
    />
  )
}
