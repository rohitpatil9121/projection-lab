/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand primary — built around #377CC8 (brand blue). brand-600 = exact.
        brand: {
          50: '#eef5fb',
          100: '#d8e8f6',
          200: '#b3d0ec',
          300: '#85b4e0',
          400: '#5695d4',
          500: '#3f83cd',
          600: '#377cc8',
          700: '#2f6aac',
          800: '#2a578c',
          900: '#274a75',
        },
        // Brand palette (charts, categories, accents) — from the brand guide.
        coral: '#e0533d',      // negative / money out / liabilities
        teal: '#469b88',       // positive / money in / assets
        periwinkle: '#9da7d0',
        sun: '#eed868',
        blossom: '#e78c9d',
        // Money language rebranded to the brand palette: every existing
        // emerald-* (positive/green) → brand teal, rose-* (negative/red) → coral.
        emerald: {
          50: '#edf6f4', 100: '#d3e9e4', 200: '#a9d3c9', 300: '#7bbaac', 400: '#5aa695',
          500: '#469b88', 600: '#3c8778', 700: '#326e63', 800: '#2b574f', 900: '#264942',
        },
        rose: {
          50: '#fdf0ed', 100: '#fadbd4', 200: '#f4b8ab', 300: '#ec8d79', 400: '#e56b52',
          500: '#e0533d', 600: '#c9412c', 700: '#a83323', 800: '#8a2c20', 900: '#73281f',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#3a3f47',
          // Dark base retuned to the brand's #242424 charcoal (base colour).
          // Only 800/900/950 back dark-mode surfaces + light-mode darkest text.
          800: '#3a3a3a', // borders / hover surfaces in dark
          900: '#242424', // card surface — exact brand dark base
          950: '#181818', // app background — a hair darker than base
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', '"Roboto Mono"', 'monospace'],
      },
      // 8px-grid-friendly extra sizes
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '1.75rem',
      },
      boxShadow: {
        // Shadows carry the canvas hue (slate-navy), never plain black.
        card: '0 1px 2px rgba(30,41,59,0.04), 0 8px 24px -16px rgba(30,41,59,0.18)',
        soft: '0 6px 28px -12px rgba(30,41,59,0.16)',
        lift: '0 18px 44px -18px rgba(30,41,59,0.28), 0 6px 14px -8px rgba(30,41,59,0.10)',
        glow: '0 10px 26px -10px rgba(55,124,200,0.55)',
        // The double bezel: hairline, then a pale tray ring, then its own hairline.
        bezel: '0 0 0 1px rgba(30,41,59,0.06), 0 0 0 6px rgba(255,255,255,0.55), 0 0 0 7px rgba(30,41,59,0.05), 0 18px 40px -24px rgba(30,41,59,0.30)',
        'bezel-dark': '0 0 0 1px rgba(255,255,255,0.07), 0 0 0 6px rgba(255,255,255,0.025), 0 0 0 7px rgba(255,255,255,0.05), 0 24px 48px -24px rgba(0,0,0,0.6)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        // The one curve every interactive element shares — heavy start, long settle.
        silk: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        'sheet-in': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        // Landing scene. `float-y` keeps each card's own tilt via --r.
        'float-y': {
          '0%,100%': { transform: 'translateY(0) rotate(var(--r,0deg))' },
          '50%': { transform: 'translateY(-16px) rotate(var(--r,0deg))' },
        },
        // Drifts one grid cell then repeats — indistinguishable from panning the
        // background-position, but a transform composites instead of repainting
        // the whole screen every frame.
        'grid-pan': {
          from: { transform: 'translate3d(0,0,0)' },
          to: { transform: 'translate3d(44px,44px,0)' },
        },
        // A scaling halo replaces the old animated box-shadow. Same pulse, except
        // box-shadow repaints each frame and scale/opacity do not.
        'glow-pulse': {
          '0%,100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.45)', opacity: '0' },
        },
        'draw-line': {
          to: { strokeDashoffset: '0' },
        },
        'gradient-pan': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-in-up': 'fade-in-up 0.7s cubic-bezier(0.32,0.72,0,1) both',
        'scale-in': 'scale-in 0.45s cubic-bezier(0.32,0.72,0,1) both',
        'sheet-in': 'sheet-in 0.5s cubic-bezier(0.32,0.72,0,1) both',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 6s ease-in-out infinite',
        'float-y': 'float-y 8s ease-in-out infinite',
        'grid-pan': 'grid-pan 14s linear infinite',
        'glow-pulse': 'glow-pulse 3.2s ease-in-out infinite',
        'draw-line': 'draw-line 2.4s cubic-bezier(0.16,1,0.3,1) 0.3s forwards',
        'gradient-pan': 'gradient-pan 12s ease infinite',
      },
    },
  },
  plugins: [],
}
