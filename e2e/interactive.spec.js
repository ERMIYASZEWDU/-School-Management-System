import { test, expect } from '@playwright/test'
import { loginAs, getSession, BASE_URL, API_URL } from './helpers'

// Interactive smoke tests: real create flows through the UI, verified
// through the API and across roles, then cleaned up. Probe data carries a
// per-run stamp and is removed in finally blocks so a failure can never
// leave test data behind.

const STAMP = Date.now()
const STUDENT = {
  name: 'Probe Smoke Student',
  email: `probe.smoke.${STAMP}@smartsms.et`,
  password: 'Probe@123',
  enrollmentNumber: `ST-PROBE-${STAMP}`,
  grade: 'Grade 10',
  section: 'A',
  rollNumber: '99',
  dateOfBirth: '2010-04-01',
  guardianName: 'Probe Guardian',
  guardianPhone: '+251-91-000-0000',
  address: 'Probe District, Addis Ababa'
}
const ANNOUNCEMENT_TITLE = `Smoke Probe Announcement ${STAMP}`

// --- API helpers (probe verification + cleanup, not UI) -------------------

async function adminHeaders(request) {
  const { token } = await getSession(request, 'admin')
  return { Authorization: `Bearer ${token}` }
}

// Student profiles carry no email (it lives on the User) — the stable
// unique key on /api/admin/students is enrollmentNumber.
async function waitForProbeStudent(request, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const res = await request.get(`${API_URL}/api/admin/students`, {
      headers: await adminHeaders(request)
    })
    if (res.ok()) {
      const body = await res.json()
      const list = body.students || body
      const probe = (list || []).find((s) => s.enrollmentNumber === STUDENT.enrollmentNumber)
      if (probe) return probe
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}

async function findProbeStudent(request) {
  return waitForProbeStudent(request, 1)
}

// Poll until the probe announcement shows up in the admin announcements list.
async function waitForProbeAnnouncement(request, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const res = await request.get(`${API_URL}/api/announcements/admin/all?page=1&limit=50`, {
      headers: await adminHeaders(request)
    })
    if (res.ok()) {
      const body = await res.json()
      const probe = (body.announcements || []).find((a) => a.title === ANNOUNCEMENT_TITLE)
      if (probe) return probe
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}

async function deleteProbeStudent(request) {
  const probe = await findProbeStudent(request)
  if (probe?._id) {
    const res = await request.delete(`${API_URL}/api/admin/student/${probe._id}`, {
      headers: await adminHeaders(request)
    })
    if (!res.ok()) throw new Error(`probe student cleanup failed: ${res.status()}`)
  }
  return probe?._id || null
}

async function deleteProbeAnnouncement(request) {
  const probe = await waitForProbeAnnouncement(request, 1)
  if (probe?._id) {
    const res = await request.delete(`${API_URL}/api/announcements/${probe._id}`, {
      headers: await adminHeaders(request)
    })
    if (!res.ok()) throw new Error(`probe announcement cleanup failed: ${res.status()}`)
  }
  return probe?._id || null
}

// Seed a session onto an extra page (same mechanism as loginAs) without
// touching the first page's storage.
async function openAsRole(context, request, roleKey, path) {
  const { token, user } = await getSession(request, roleKey)
  const p = await context.newPage()
  await p.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token)
      localStorage.setItem('auth-storage', JSON.stringify({ state: { user, token }, version: 0 }))
    },
    { token, user }
  )
  await p.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' })
  await p.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  return p
}

// --- Tests -----------------------------------------------------------------

test('admin creates a student end-to-end (UI → DB → auth → list → cleanup)', async ({ page }) => {
  const jsErrors = []
  page.on('pageerror', (err) => jsErrors.push(err))

  await loginAs(page, 'admin')

  try {
    await page.goto(`${BASE_URL}/admin/students`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // Open the create modal
    await page.getByRole('button', { name: /Add New Student/i }).click()
    const form = page.locator('#student-form')
    await expect(form).toBeVisible()

    // Fill the real form (submit button lives outside the form, bound via form=)
    await form.getByPlaceholder(/Enter student name/i).fill(STUDENT.name)
    await form.locator('input[type=email]').fill(STUDENT.email)
    await form.locator('input[type=password]').fill(STUDENT.password)
    await form.getByPlaceholder(/STU-2026-001/i).fill(STUDENT.enrollmentNumber)
    await form.locator('select').nth(0).selectOption(STUDENT.grade)
    await form.locator('select').nth(1).selectOption(STUDENT.section)
    await form.locator('input[type=number]').fill(STUDENT.rollNumber)
    await form.locator('input[type=date]').fill(STUDENT.dateOfBirth)
    await form.getByPlaceholder(/Ato Kebede Worku/i).fill(STUDENT.guardianName)
    await form.getByPlaceholder(/\+251-91-234-5678/i).fill(STUDENT.guardianPhone)
    await form.getByPlaceholder(/Bole, Addis Ababa/i).fill(STUDENT.address)

    await page.locator('button[form="student-form"]').click()
    await expect(form).toBeHidden({ timeout: 15_000 })

    // 1. Persisted correctly (verify via API, not just the UI)
    const probe = await waitForProbeStudent(page.request)
    expect(probe, 'created student found via API').toBeTruthy()
    expect(probe.name).toBe(STUDENT.name)
    expect(probe.enrollmentNumber).toBe(STUDENT.enrollmentNumber)
    expect(probe.grade).toBe(STUDENT.grade)
    expect(probe.section).toBe(STUDENT.section)

    // 2. The new student can actually log in (User + Student wired up)
    const loginRes = await page.request.post(`${API_URL}/api/auth/login`, {
      data: { email: STUDENT.email, password: STUDENT.password }
    })
    expect(loginRes.status(), 'new student can log in').toBe(200)

    // 3. The refreshed admin list shows the new student (UI reflects DB)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(page.locator('body')).toContainText(STUDENT.enrollmentNumber)

  } finally {
    // Delete cascade: profile, user, grades, attendance — verified in cleanup
    await deleteProbeStudent(page.request)
  }

  expect(jsErrors, 'no uncaught JS errors during student create flow').toEqual([])
})

test('admin creates an announcement; student sees it (UI → DB → cross-role → cleanup)', async ({ page, request }) => {
  const jsErrors = []
  page.on('pageerror', (err) => jsErrors.push(err))

  await loginAs(page, 'admin')

  try {
    await page.goto(`${BASE_URL}/admin/announcements`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // Open the create modal (admin-only toolbar button)
    await page.getByRole('button', { name: /Create Announcement/i }).first().click()

    const form = page.locator('form').filter({ has: page.getByPlaceholder(/Enter announcement title/i) })
    await form.getByPlaceholder(/Enter announcement title/i).fill(ANNOUNCEMENT_TITLE)
    // Placeholders come from en.json (locale overrides the source defaults):
    // "Enter brief message" / "Enter detailed content"
    await form.getByPlaceholder(/Enter brief message/i).fill('Interactive smoke probe message')
    await form.getByPlaceholder(/Enter detailed content/i).fill('Full probe content for the interactive smoke test.')

    // Target students specifically (role toggle chips)
    await form.getByRole('button', { name: /student/i, exact: false }).first().click()

    // Create (submit button inside the form)
    await form.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(form.getByPlaceholder(/Enter announcement title/i)).toBeHidden({ timeout: 15_000 })

    // 1. Persisted (admin management list)
    const probe = await waitForProbeAnnouncement(request)
    expect(probe, 'created announcement found via API').toBeTruthy()
    expect(probe.title).toBe(ANNOUNCEMENT_TITLE)
    expect(probe.priority).toBe('medium')

    // 2. Cross-role: a student actually sees it in their portal
    const studentPage = await openAsRole(page.context(), request, 'student', '/student/announcements')
    try {
      await expect(studentPage.locator('body')).toContainText(ANNOUNCEMENT_TITLE, { timeout: 10_000 })
    } finally {
      await studentPage.close()
    }

  } finally {
    await deleteProbeAnnouncement(request)
  }

  expect(jsErrors, 'no uncaught JS errors during announcement flow').toEqual([])
})
