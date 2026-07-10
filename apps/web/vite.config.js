import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/v1': 'http://localhost:3001',
      '/healthz': 'http://localhost:3001',
    },
  },
})
