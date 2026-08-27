/**
 * Academic Year CRUD Routes Tests
 *
 * Tests:
 * - GET    /api/academic-years        (list all, RBAC)
 * - GET    /api/academic-years/active  (get active year)
 * - GET    /api/academic-years/:id     (get single with terms)
 * - POST   /api/academic-years        (create, date validation, isActive logic)
 * - PUT    /api/academic-years/:id     (update, deactivate protection)
 * - PATCH  /api/academic-years/:id/toggle-active
 * - PATCH  /api/academic-years/:id/archive
 * - PATCH  /api/academic-years/:id/unarchive
 * - DELETE /api/academic-years/:id     (delete, active protection, terms protection)
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
  const admin = await createUser({ email: 'admin-ay@test.com', password: 'pass', role: 'admin', name: 'Admin AY' })
  const teacher = await createUser({ email: 'teacher-ay@test.com', password: 'pass', role: 'teacher', name: 'Teacher AY' })

  const secret = process.env.JWT_SECRET
  adminToken = jwt.sign({ id: admin._id, email: admin.email, role: 'admin' }, secret, { expiresIn: '1h' })
  teacherToken = jwt.sign({ id: teacher._id, email: teacher.email, role: 'teacher' }, secret, { expiresIn: '1h' })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createYear(overrides = {}) {
  return AcademicYear.create({
    name: '2025/2026',
    startDate: new Date('2025-09-01'),
    endDate: new Date('2026-06-30'),
    isActive: false,
    ...overrides,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// RBAC
// ═══════════════════════════════════════════════════════════════════════════════

describe('Academic Year RBAC', () => {
  it('GET /api/academic-years → 401 without token', async () => {
    await request(app).get('/api/academic-years').expect(401)
  })

  it('GET /api/academic-years → 403 for teacher', async () => {
    await request(app).get('/api/academic-years')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(403)
  })

  it('GET /api/academic-years → 200 for admin', async () => {
    await request(app).get('/api/academic-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
  })

  it('POST /api/academic-years → 403 for teacher', async () => {
    await request(app).post('/api/academic-years')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'X', startDate: '2025-09-01', endDate: '2026-06-30' })
      .expect(403)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// LIST / GET
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/academic-years', () => {
  it('returns all academic years', async () => {
    await createYear({ name: '2024/2025' })
    await createYear({ name: '2025/2026', startDate: new Date('2025-09-01'), endDate: new Date('2026-06-30') })

    const res = await request(app).get('/api/academic-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.success, true)
    assert.ok(res.body.data.length >= 2)
  })

  it('returns empty array when none exist', async () => {
    const res = await request(app).get('/api/academic-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.data.length, 0)
  })
})

describe('GET /api/academic-years/active', () => {
  it('returns the active academic year', async () => {
    await createYear({ name: '2024/2025', isActive: false })
    await createYear({ name: '2025/2026', isActive: true })

    const res = await request(app).get('/api/academic-years/active')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.success, true)
    assert.equal(res.body.data.name, '2025/2026')
    assert.equal(res.body.data.isActive, true)
  })

  it('returns 404 when no active year exists', async () => {
    await request(app).get('/api/academic-years/active')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
  })
})

describe('GET /api/academic-years/:id', () => {
  it('returns a single academic year with terms', async () => {
    const year = await createYear()
    await Term.create({ name: 'Term 1', termNumber: 1, academicYearId: year._id, startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15') })

    const res = await request(app).get(`/api/academic-years/${year._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.success, true)
    assert.equal(res.body.data.name, '2025/2026')
    assert.ok(Array.isArray(res.body.data.terms))
    assert.equal(res.body.data.terms.length, 1)
  })

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).get(`/api/academic-years/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/academic-years', () => {
  it('creates a new academic year', async () => {
    const res = await request(app).post('/api/academic-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '2026/2027', startDate: '2026-09-01', endDate: '2027-06-30' })
      .expect(201)

    assert.equal(res.body.success, true)
    assert.equal(res.body.data.name, '2026/2027')
    assert.equal(res.body.data.isActive, false)
  })

  it('creates an active year and deactivates others', async () => {
    await createYear({ name: '2024/2025', isActive: true })

    const res = await request(app).post('/api/academic-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '2025/2026', startDate: '2025-09-01', endDate: '2026-06-30', isActive: true })
      .expect(201)

    assert.equal(res.body.data.isActive, true)

    // Previous year should be deactivated
    const previous = await AcademicYear.findOne({ name: '2024/2025' })
    assert.equal(previous.isActive, false)
  })

  it('rejects when end date is before start date', async () => {
    await request(app).post('/api/academic-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Dates', startDate: '2026-06-30', endDate: '2025-09-01' })
      .expect(400)
  })

  it('rejects when start date equals end date', async () => {
    await request(app).post('/api/academic-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Same Dates', startDate: '2025-09-01', endDate: '2025-09-01' })
      .expect(400)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

describe('PUT /api/academic-years/:id', () => {
  it('updates an academic year', async () => {
    const year = await createYear()

    const res = await request(app).put(`/api/academic-years/${year._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Year', description: 'Updated desc' })
      .expect(200)

    assert.equal(res.body.success, true)
    assert.equal(res.body.data.name, 'Updated Year')
    assert.equal(res.body.data.description, 'Updated desc')
  })

  it('activates a year and deactivates others', async () => {
    const old = await createYear({ name: 'Old', isActive: true })
    const fresh = await createYear({ name: 'New', isActive: false })

    await request(app).put(`/api/academic-years/${fresh._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true })
      .expect(200)

    const updatedOld = await AcademicYear.findById(old._id)
    assert.equal(updatedOld.isActive, false)
  })

  it('rejects if new dates are invalid', async () => {
    const year = await createYear()

    await request(app).put(`/api/academic-years/${year._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ startDate: '2026-06-30', endDate: '2025-09-01' })
      .expect(400)
  })

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).put(`/api/academic-years/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' })
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// TOGGLE ACTIVE
// ═══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/academic-years/:id/toggle-active', () => {
  it('activates an inactive year', async () => {
    const year = await createYear({ isActive: false })

    const res = await request(app).patch(`/api/academic-years/${year._id}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.data.isActive, true)
    assert.ok(res.body.message.includes('activated'))
  })

  it('deactivates an active year', async () => {
    const year = await createYear({ isActive: true })

    const res = await request(app).patch(`/api/academic-years/${year._id}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.data.isActive, false)
    assert.ok(res.body.message.includes('deactivated'))
  })

  it('deactivates other years when activating', async () => {
    const other = await createYear({ name: 'Other', isActive: true })
    const target = await createYear({ name: 'Target', isActive: false })

    await request(app).patch(`/api/academic-years/${target._id}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    const updatedOther = await AcademicYear.findById(other._id)
    assert.equal(updatedOther.isActive, false)
  })

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).patch(`/api/academic-years/${fakeId}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVE / UNARCHIVE
// ═══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/academic-years/:id/archive', () => {
  it('archives an inactive year', async () => {
    const year = await createYear({ isActive: false })

    const res = await request(app).patch(`/api/academic-years/${year._id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.data.isArchived, true)
  })

  it('rejects archiving the active year', async () => {
    const year = await createYear({ isActive: true })

    await request(app).patch(`/api/academic-years/${year._id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400)
  })

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).patch(`/api/academic-years/${fakeId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
  })
})

describe('PATCH /api/academic-years/:id/unarchive', () => {
  it('unarchives an archived year', async () => {
    const year = await AcademicYear.create({
      name: 'Archived', startDate: new Date('2023-09-01'), endDate: new Date('2024-06-30'),
      isActive: false, isArchived: true,
    })

    const res = await request(app).patch(`/api/academic-years/${year._id}/unarchive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    assert.equal(res.body.data.isArchived, false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/academic-years/:id', () => {
  it('deletes an inactive year without terms', async () => {
    const year = await createYear({ isActive: false })

    await request(app).delete(`/api/academic-years/${year._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    const found = await AcademicYear.findById(year._id)
    assert.equal(found, null)
  })

  it('rejects deleting the active year', async () => {
    const year = await createYear({ isActive: true })

    await request(app).delete(`/api/academic-years/${year._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400)
  })

  it('rejects deleting a year with associated terms', async () => {
    const year = await createYear({ isActive: false })
    await Term.create({ name: 'Term 1', termNumber: 1, academicYearId: year._id, startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15') })

    await request(app).delete(`/api/academic-years/${year._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400)
  })

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).delete(`/api/academic-years/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
  })
})
