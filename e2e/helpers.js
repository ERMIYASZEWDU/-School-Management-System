// Shared helpers for the smoke suite.
export const BASE_URL = 'http://localhost:5175'
export const API_URL = 'http://localhost:5000'

// Seeded demo credentials (see server/seed.js).
export const ROLES = {
  admin: { email: 'admin@smartsms.et', password: 'Admin@123' },
  teacher: { email: 'teacher1@smartsms.et', password: 'Teacher@123' },
  student: { email: 'student1@smartsms.et', password: 'Student@123' },
  parent: { email: 'parent1@smartsms.et', password: 'Parent@123' }
}

// One login per role per run — the auth limiter (per-IP, per-minute) rejects
// bursts of logins, so every test of a role reuses the cached session. A failed
// login is also cached (as a rejected promise) so one bad run can't turn into
// 40 retry storms against the rate limiter.
const sessionCache = new Map() // roleKey -> Promise<{ token, user }>
const LOGIN_RETRIES = 3

async function loginWithRetry(request, roleKey) {
  const { email, password } = ROLES[roleKey]
  for (let attempt = 1; attempt <= LOGIN_RETRIES; attempt++) {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email, password }
    })
    if (res.ok()) {
      const body = await res.json()
      const token = body.token || body.data?.token
      const user = body.user || body.data?.user || { id: `${roleKey}-smoke`, name: roleKey, role: roleKey, email }
      return { token, user }
    }
    if (attempt === LOGIN_RETRIES) {
      throw new Error(
        `Login failed for ${roleKey}: ${res.status()} after ${LOGIN_RETRIES} attempts (429 = rate limited; restart the backend to clear its in-memory limiter)`
      )
    }
    // Back off before retrying a 429
    await new Promise((r) => setTimeout(r, attempt * 2000))
  }
}

export function getSession(request, roleKey) {
  if (!sessionCache.has(roleKey)) {
    // The promise (success or rejection) stays cached: all tests of this role
    // share one login, and a genuinely failed login fails the run fast
    // instead of every test hammering the rate limiter.
    sessionCache.set(roleKey, loginWithRetry(request, roleKey))
  }
  return sessionCache.get(roleKey)
}

// Mirror the session into localStorage the same way the login form does,
// then open the app.
export async function loginAs(page, roleKey) {
  const { token, user } = await getSession(page.request, roleKey)
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token)
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({ state: { user, token }, version: 0 })
      )
    },
    { token, user }
  )
  await page.goto(BASE_URL)
  await page.waitForLoadState('domcontentloaded')
  return { token, user }
}

// First Student id of the given parent (for child drill-down routes).
// Reuses the cached parent session instead of logging in again.
export async function firstChildId(request, parentRoleKey) {
  const { token } = await getSession(request, parentRoleKey)
  const res = await request.get(`${API_URL}/api/parent/children`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok()) throw new Error(`children fetch failed: ${res.status()}`)
  const body = await res.json()
  const children = body.children || body
  const first = Array.isArray(children) ? children[0] : null
  if (!first?._id) throw new Error('parent has no children — run npm run seed first')
  return first._id
}

// A page fails the smoke walk if it renders the app's own error banner or a
// crash boundary. Empty states are legitimate and must NOT fail the run.
export const FAILURE_TEXT =
  /Failed to load|Something went wrong|Application error|Error Boundary|Internal server error/i
