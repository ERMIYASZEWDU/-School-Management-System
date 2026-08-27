/**
 * Term CRUD Routes Tests
 *
 * Tests:
 * - GET    /api/terms              (list all, filter by academicYearId, RBAC)
 * - GET    /api/terms/active       (get active term)
 * - GET    /api/terms/:id          (get single term)
 * - POST   /api/terms             (create, date validation, academic year check)
 * - PUT    /api/terms/:id          (update, date validation)
 * - PATCH  /api/terms/:id/toggle-active
 * - DELETE /api/terms/:id          (delete, active protection)
 */
import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import { setupDb, teardownDb, clearDb, createUser, buildTestApp } from './setup.js'
import AcademicYear from '../models/AcademicYear.js'
import Term from '../models/Term.js'

let app, adminToken, teacherToken

// ─── Lifecycle ────────────────────────────────────────────────────────────────

before(async () => {
  await setupDb()
  process.env.JWT_SECRET = 'test-secret'
  app = await buildTestApp()
})

after(async () => { await teardownDb() })

beforeEach(async () => {
  await clearDb()
  const admin = await createUser({ email: 'admin-term@test.com', password: 'pass', role: 'admin', name: 'Admin Term' })
  const teacher = await createUser({ email: 'teacher-term@test.com', password: 'pass', role: 'teacher', name: 'Teacher Term' })

  const secret = process.env.JWT_SECRET
  adminToken = jwt.sign({ id: admin._id, email: admin.email, role: 'admin' }, secret, { expiresIn: '1h' })
  teacherToken = jwt.sign({ id: teacher._id, email: teacher.email, role: 'teacher' }, secret, { expiresIn: '1h' })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createYear(overrides = {}) {
  return AcademicYear.create({
    name: '2025/2026', startDate: new Date('2025-09-01'),
    endDate: new Date('2026-06-30'), isActive: true,
    ...overrides,
  })
}

async function createTerm(year, overrides = {}) {
  return Term.create({
    name: 'Term 1', academicYearId: year._id,
    startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15'),
    termNumber: 1, isActive: false,
    ...overrides,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// RBAC
// ═══════════════════════════════════════════════════════════════════════════════

describe('Term RBAC', () => {
  it('GET /api/terms → 401 without token', async () => {
    await request(app).get('/api/terms').expect(401)
  })

  it('GET /api/terms → 403 for teacher', async () => {
    await request(app).get('/api/terms')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(403)
  })

  it('GET /api/terms → 200 for admin', async () => {
    await request(app).get('/api/terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
  })

  it('POST /api/terms → 403 for teacher', async () => {
    const year = await createYear()
    await request(app).post('/api/terms')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'X', academicYearId: year._id, startDate: '2025-09-01', endDate: '2025-12-15', termNumber: 1 })
      .expect(403)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// LIST / GET
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/terms', () => {
  it('returns all terms', async () => {
    const year = await createYear()
    await createTerm(year, { name: 'Term 1' })
    await createTerm(year, { name: 'Term 2', startDate: new Date('2026-01-05'), endDate: new Date('2026-03-31'), termNumber: 2 })

    const res = await request(app).get('/api/terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.success, true)
    assert.ok(res.body.data.length >= 2)
  })

  it('filters by academicYearId', async () => {
    const year1 = await createYear({ name: '2024/2025', startDate: new Date('2024-09-01'), endDate: new Date('2025-06-30') })
    const year2 = await createYear({ name: '2025/2026', startDate: new Date('2025-09-01'), endDate: new Date('2026-06-30') })
    await createTerm(year1, { name: 'Old Term' })
    await createTerm(year2, { name: 'New Term' })

    const res = await request(app).get(`/api/terms?academicYearId=${year1._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.data.length, 1)
    assert.equal(res.body.data[0].name, 'Old Term')
  })
})

describe('GET /api/terms/active', () => {
  it('returns the active term', async () => {
    const year = await createYear()
    await createTerm(year, { name: 'Term 1', isActive: false })
    await createTerm(year, { name: 'Term 2', startDate: new Date('2026-01-05'), endDate: new Date('2026-03-31'), termNumber: 2, isActive: true })

    const res = await request(app).get('/api/terms/active')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.success, true)
    assert.equal(res.body.data.name, 'Term 2')
    assert.equal(res.body.data.isActive, true)
  })

  it('returns 404 when no active term exists', async () => {
    await request(app).get('/api/terms/active')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
  })
})

describe('GET /api/terms/:id', () => {
  it('returns a single term', async () => {
    const year = await createYear()
    const term = await createTerm(year)

    const res = await request(app).get(`/api/terms/${term._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.success, true)
    assert.equal(res.body.data.name, 'Term 1')
  })

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).get(`/api/terms/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/terms', () => {
  it('creates a new term', async () => {
    const year = await createYear()

    const res = await request(app).post('/api/terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Term 1', academicYearId: year._id, startDate: '2025-09-01', endDate: '2025-12-15', termNumber: 1 })
      .expect(201)

    assert.equal(res.body.success, true)
    assert.equal(res.body.data.name, 'Term 1')
  })

  it('creates an active term and deactivates others in same year', async () => {
    const year = await createYear()
    await createTerm(year, { name: 'Term 1', isActive: true })

    const res = await request(app).post('/api/terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Term 2', academicYearId: year._id, startDate: '2026-01-05', endDate: '2026-03-31', termNumber: 2, isActive: true })
      .expect(201)

    assert.equal(res.body.data.isActive, true)

    const previous = await Term.findOne({ name: 'Term 1' })
    assert.equal(previous.isActive, false)
  })

  it('rejects when end date is before start date', async () => {
    const year = await createYear()
    await request(app).post('/api/terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad', academicYearId: year._id, startDate: '2026-03-31', endDate: '2025-09-01', termNumber: 1 })
      .expect(400)
  })

  it('rejects when term dates are outside academic year', async () => {
    const year = await createYear() // 2025-09-01 to 2026-06-30
    await request(app).post('/api/terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Too Early', academicYearId: year._id, startDate: '2025-06-01', endDate: '2025-08-31', termNumber: 1 })
      .expect(400)
  })

  it('rejects when end date exceeds academic year', async () => {
    const year = await createYear() // 2025-09-01 to 2026-06-30
    await request(app).post('/api/terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Too Late', academicYearId: year._id, startDate: '2026-05-01', endDate: '2026-08-31', termNumber: 1 })
      .expect(400)
  })

  it('rejects for non-existent academic year', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).post('/api/terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost', academicYearId: fakeId, startDate: '2025-09-01', endDate: '2025-12-15', termNumber: 1 })
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

describe('PUT /api/terms/:id', () => {
  it('updates a term', async () => {
    const year = await createYear()
    const term = await createTerm(year)

    const res = await request(app).put(`/api/terms/${term._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Term' })
      .expect(200)

    assert.equal(res.body.success, true)
    assert.equal(res.body.data.name, 'Updated Term')
  })

  it('rejects if new dates are invalid', async () => {
    const year = await createYear()
    const term = await createTerm(year)

    await request(app).put(`/api/terms/${term._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ startDate: '2026-03-31', endDate: '2025-09-01' })
      .expect(400)
  })

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).put(`/api/terms/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' })
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// TOGGLE ACTIVE
// ═══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/terms/:id/toggle-active', () => {
  it('activates an inactive term', async () => {
    const year = await createYear()
    const term = await createTerm(year, { isActive: false })

    const res = await request(app).patch(`/api/terms/${term._id}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.data.isActive, true)
    assert.ok(res.body.message.includes('activated'))
  })

  it('deactivates an active term', async () => {
    const year = await createYear()
    const term = await createTerm(year, { isActive: true })

    const res = await request(app).patch(`/api/terms/${term._id}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.data.isActive, false)
    assert.ok(res.body.message.includes('deactivated'))
  })

  it('deactivates other terms in same year when activating', async () => {
    const year = await createYear()
    const other = await createTerm(year, { name: 'Term 1', isActive: true })
    const target = await createTerm(year, { name: 'Term 2', startDate: new Date('2026-01-05'), endDate: new Date('2026-03-31'), termNumber: 2, isActive: false })

    await request(app).patch(`/api/terms/${target._id}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    const updatedOther = await Term.findById(other._id)
    assert.equal(updatedOther.isActive, false)
  })

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).patch(`/api/terms/${fakeId}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/terms/:id', () => {
  it('deletes an inactive term', async () => {
    const year = await createYear()
    const term = await createTerm(year, { isActive: false })

    await request(app).delete(`/api/terms/${term._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    const found = await Term.findById(term._id)
    assert.equal(found, null)
  })

  it('rejects deleting the active term', async () => {
    const year = await createYear()
    const term = await createTerm(year, { isActive: true })

    await request(app).delete(`/api/terms/${term._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400)
  })

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).delete(`/api/terms/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
  })
})
