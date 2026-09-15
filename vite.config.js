import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Resolve the backend URL at build time:
  // 1. process.env.VITE_API_URL (CI/CD injected, e.g. Vercel)
  // 2. committed .env.production (the Render backend)
  // 3. '' -> relative /api, proxied to the local backend in development.
  // Never fall back to a hardcoded host: it would bake localhost into the
  // production bundle and break every deployed client.
  const env = loadEnv(mode, process.cwd())
  const apiUrl = process.env.VITE_API_URL || env.VITE_API_URL || ''

  return {
    plugins: [react()],
    build: {
      target: 'es2020',
    },
    server: {
      // Own port, away from the portfolio's 5173 (and Vite's auto-fallback
      // 5174): sharing an origin with another dev app is what let a stale
      // service worker hijack this app's preview. See index.html SW guard.
      port: 5175,
      host: true,
      proxy: {
        '/api': {
          target: apiUrl || 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        },
        // Legacy profile photos are served from the backend's /uploads mount
        '/uploads': {
          target: apiUrl || 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    // Ensure environment variables are available at build time
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
    }
  }
})
