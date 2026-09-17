import { test, expect } from '@playwright/test'
import { loginAs, firstChildId, BASE_URL, FAILURE_TEXT } from './helpers'

// The 40 portal pages, exactly as routed in src/App.jsx. Paths are stored as
// suffixes and prefixed with the role base (e.g. '/admin' + '/profile').
// The parent child drill-downs need a real student id, resolved from the API
// inside the test.
const ROUTES = {
  admin: [
    '',
    '/profile',
    '/students',
    '/teachers',
    '/parents',
    '/classes',
    '/subjects',
    '/timetable',
    '/attendance',
    '/examinations',
    '/assignments',
    '/results',
    '/reports',
    '/enrollment',
    '/academic-years',
    '/settings',
    '/users',
    '/announcements'
  ],
  teacher: [
    '',
    '/profile',
    '/students',
    '/grades',
    '/attendance',
    '/assignments',
    '/timetable',
    '/announcements'
  ],
  student: [
    '',
    '/profile',
    '/grades',
    '/attendance',
    '/assignments',
    '/timetable',
    '/announcements'
  ],
  parent: ['', '/profile', '/children', '/announcements']
}

// A page fails the smoke walk if it is redirected (protected-route guard or
// unknown route), renders the app's own error banner / crash boundary, or
// throws an uncaught JS error. Empty states are legitimate and must NOT fail.
async function assertPage(page, url, label) {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded' })
  expect(res.status(), `HTTP status for ${label}`).toBeLessThan(400)

  // Let the route's API calls settle; tolerate slow dev-server modules
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(300)

  expect(page.url(), `should stay on ${label}, not get redirected`).toBe(url)

  const text = (await page.locator('main, body').first().textContent()) || ''
  expect(text.trim().length, `page should render content for ${label}`).toBeGreaterThan(0)
  expect(text, `no error banner on ${label}`).not.toMatch(FAILURE_TEXT)
}

function walkPortal(role, routes) {
  test.describe(`${role} portal (${routes.length} pages)`, () => {
    for (const path of routes) {
      const url = `${BASE_URL}/${role}${path}`
      const label = path || 'dashboard'

      test(`${role} ${label}`, async ({ page }) => {
        const jsErrors = []
        page.on('pageerror', (err) => jsErrors.push(err))

        await loginAs(page, role)
        await assertPage(page, url, label)
        expect(jsErrors, `no uncaught JS errors on ${label}`).toEqual([])
      })
    }
  })
}

for (const [role, routes] of Object.entries(ROUTES)) walkPortal(role, routes)

// Parent child drill-downs: /parent/child/:studentId/{grades,attendance,assignments}
for (const section of ['grades', 'attendance', 'assignments']) {
  test(`parent child ${section} drill-down`, async ({ page }) => {
    const jsErrors = []
    page.on('pageerror', (err) => jsErrors.push(err))

    await loginAs(page, 'parent')
    const childId = await firstChildId(page.request, 'parent')
    await assertPage(page, `${BASE_URL}/parent/child/${childId}/${section}`, `child ${section}`)
    expect(jsErrors, `no uncaught JS errors on child ${section}`).toEqual([])
  })
}
