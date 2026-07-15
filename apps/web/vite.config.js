import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8').replace(/^﻿/, ''))
// Every build stamps itself: version from package.json + build date/time,
// shown on the Landing and Settings footers so any installed APK is identifiable.
const buildStamp = new Date().toLocaleString('en-IN', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
})

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_STAMP__: JSON.stringify(buildStamp),
  },
  server: {
    port: 5173,
    proxy: {
      '/v1': 'http://localhost:3001',
      '/healthz': 'http://localhost:3001',
    },
  },
})
