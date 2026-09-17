import { defineConfig } from '@playwright/test'

// Smoke suite for Smart SMS. `npm run smoke` reuses already-running servers,
// or boots the backend (port 5000, correct cwd/env) and the Vite dev server
// (port 5175) itself when they are not running.
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5175',
    headless: true,
    viewport: { width: 1440, height: 900 }
  },
  webServer: [
    {
      command: 'node index.js',
      cwd: 'server',
      url: 'http://localhost:5000/api/db-status',
      reuseExistingServer: true,
      timeout: 120_000,
      // Explicit PORT: the shell may carry a stray PORT=0 that the server inherits
      env: { ...process.env, PORT: '5000' }
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5175',
      reuseExistingServer: true,
      timeout: 120_000
    }
  ]
})
