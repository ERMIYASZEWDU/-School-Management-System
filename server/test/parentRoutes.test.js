/**
 * Parent Routes Tests
 *
 * Tests the parent-facing routes under /api/parent:
 * - GET /api/parent/dashboard     (RBAC, returns children + announcements)
 * - GET /api/parent/children      (RBAC, returns populated children)
 * - GET /api/parent/announcements (RBAC, returns published announcements)
 */
import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import jwt from 'jsonwebtoken'

import {
  setupDb, teardownDb, clearDb,
  createUser, createStudent, createParent,
  buildTestApp
} from './setup.js'
import Announcement from '../models/Announcement.js'

let app
let parentUser, parent, parentToken
let studentUser, student
let teacherUser, teacherToken
let adminUser, adminToken

// ─── Lifecycle ────────────────────────────────────────────────────────────────

before(async () => {
  await setupDb()
  process.env.JWT_SECRET = 'test-secret'
  app = await buildTestApp()
})

after(async () => { await teardownDb() })

beforeEach(async () => {
  await clearDb()

  // Create student
  const studentFixture = await createStudent({ name: 'Child Student' })
  studentUser = studentFixture.user
  student = studentFixture.student

  // Create parent linked to the student
  const parentFixture = await createParent([student._id], { name: 'Test Parent' })
  parentUser = parentFixture.user
  parent = parentFixture.parent

  // Create teacher
  teacherUser = await createUser({ email: 't-parent@test.com', password: 'pass', role: 'teacher', name: 'Teacher' })

  // Create admin
  adminUser = await createUser({ email: 'a-parent@test.com', password: 'pass', role: 'admin', name: 'Admin' })

  // Tokens
  const secret = process.env.JWT_SECRET
  parentToken = jwt.sign({ id: parentUser._id, email: parentUser.email, role: 'parent' }, secret, { expiresIn: '1h' })
  teacherToken = jwt.sign({ id: teacherUser._id, email: teacherUser.email, role: 'teacher' }, secret, { expiresIn: '1h' })
  adminToken = jwt.sign({ id: adminUser._id, email: adminUser.email, role: 'admin' }, secret, { expiresIn: '1h' })
})

// ═══════════════════════════════════════════════════════════════════════════════
// RBAC
// ═══════════════════════════════════════════════════════════════════════════════

describe('Parent Routes RBAC', () => {
  const endpoints = [
    { method: 'GET', path: '/api/parent/dashboard' },
    { method: 'GET', path: '/api/parent/children' },
    { method: 'GET', path: '/api/parent/announcements' },
  ]

  for (const { method, path } of endpoints) {
    it(`${method} ${path} → 401 without token`, async () => {
      await request(app)[method.toLowerCase()](path).expect(401)
    })

    it(`${method} ${path} → 403 for teacher`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403)
    })

    it(`${method} ${path} → 403 for admin`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it(`${method} ${path} → 200 for parent`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/parent/dashboard', () => {
  it('returns parent dashboard with children', async () => {
    const res = await request(app).get('/api/parent/dashboard')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200)

    assert.ok(res.body.parent)
    assert.equal(res.body.parent.name, 'Test Parent')
    assert.ok(Array.isArray(res.body.children))
    assert.equal(res.body.totalChildren, 1)
    assert.equal(res.body.children[0].name, 'Child Student')
  })

  it('returns 404 when parent profile does not exist', async () => {
    const orphan = await createUser({ email: 'orphan-parent@test.com', password: 'pass', role: 'parent' })
    const orphanToken = jwt.sign({ id: orphan._id, email: orphan.email, role: 'parent' }, process.env.JWT_SECRET, { expiresIn: '1h' })

    await request(app).get('/api/parent/dashboard')
      .set('Authorization', `Bearer ${orphanToken}`)
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CHILDREN
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/parent/children', () => {
  it('returns the list of children', async () => {
    const res = await request(app).get('/api/parent/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200)

    assert.ok(Array.isArray(res.body))
    assert.equal(res.body.length, 1)
    assert.equal(res.body[0].name, 'Child Student')
    assert.equal(res.body[0].grade, 'Grade 10')
  })

  it('returns 404 when parent profile does not exist', async () => {
    const orphan = await createUser({ email: 'orphan2@test.com', password: 'pass', role: 'parent' })
    const orphanToken = jwt.sign({ id: orphan._id, email: orphan.email, role: 'parent' }, process.env.JWT_SECRET, { expiresIn: '1h' })

    await request(app).get('/api/parent/children')
      .set('Authorization', `Bearer ${orphanToken}`)
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/parent/announcements', () => {
  it('returns published announcements for parents', async () => {
    await Announcement.create({
      title: 'Parent Meeting', message: 'Annual meeting', content: 'Details',
      targetRole: ['all'], priority: 'medium', isPublished: true, createdBy: adminUser._id,
    })

    const res = await request(app).get('/api/parent/announcements')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200)

    assert.ok(Array.isArray(res.body))
    assert.ok(res.body.length >= 1)
    assert.equal(res.body[0].title, 'Parent Meeting')
  })

  it('does not return unpublished announcements', async () => {
    await Announcement.create({
      title: 'Draft', message: 'Draft msg', content: 'Draft',
      targetRole: ['all'], priority: 'low', isPublished: false, createdBy: adminUser._id,
    })

    const res = await request(app).get('/api/parent/announcements')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200)

    assert.equal(res.body.length, 0)
  })

  it('returns empty when no announcements exist', async () => {
    const res = await request(app).get('/api/parent/announcements')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200)

    assert.equal(res.body.length, 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-PARENT ISOLATION
// Parent A must NOT be able to see Parent B's children or child data
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cross-parent data isolation', () => {
  let parentBUser, parentBToken, childB

  beforeEach(async () => {
    // Create a second student (Parent B's child)
    const fixtureB = await createStudent({ name: 'Child B' })
    childB = fixtureB.student

    // Create Parent B linked only to Child B
    const parentBFixture = await createParent([childB._id], { name: 'Parent B' })
    parentBUser = parentBFixture.user

    const secret = process.env.JWT_SECRET
    parentBToken = jwt.sign({ id: parentBUser._id, email: parentBUser.email, role: 'parent' }, secret, { expiresIn: '1h' })
  })

  it('GET /api/parent/children: Parent A only sees own children', async () => {
    const res = await request(app).get('/api/parent/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200)

    // Parent A should see only Child Student (not Child B)
    assert.equal(res.body.length, 1)
    assert.equal(res.body[0].name, 'Child Student')
    assert.ok(!res.body.some(c => c.name === 'Child B'))
  })

  it('GET /api/parent/children: Parent B only sees own children', async () => {
    const res = await request(app).get('/api/parent/children')
      .set('Authorization', `Bearer ${parentBToken}`)
      .expect(200)

    // Parent B should see only Child B (not Child Student)
    assert.equal(res.body.length, 1)
    assert.equal(res.body[0].name, 'Child B')
    assert.ok(!res.body.some(c => c.name === 'Child Student'))
  })

  it('GET /api/parent/child/:studentId: Parent A cannot access Parent B child', async () => {
    await request(app).get(`/api/parent/child/${childB._id}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403)
  })

  it('GET /api/parent/child/:studentId: Parent B can access own child', async () => {
    await request(app).get(`/api/parent/child/${childB._id}`)
      .set('Authorization', `Bearer ${parentBToken}`)
      .expect(200)
  })

  it('GET /api/parent/child/:studentId/grades: Parent A cannot see Parent B child grades', async () => {
    await request(app).get(`/api/parent/child/${childB._id}/grades`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403)
  })

  it('GET /api/parent/child/:studentId/attendance: Parent A cannot see Parent B child attendance', async () => {
    await request(app).get(`/api/parent/child/${childB._id}/attendance`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403)
  })

  it('GET /api/parent/child/:studentId/assignments: Parent A cannot see Parent B child assignments', async () => {
    await request(app).get(`/api/parent/child/${childB._id}/assignments`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403)
  })

  it('GET /api/parent/child/:studentId/enrollment-history: Parent A cannot see Parent B child enrollment', async () => {
    await request(app).get(`/api/parent/child/${childB._id}/enrollment-history`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403)
  })
})
