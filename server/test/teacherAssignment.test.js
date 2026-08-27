/**
 * Teacher Assignment & Class Routes Tests
 *
 * Tests:
 * - GET  /api/teacher/classes     (RBAC, assigned classes via assignedClassIds and fallback)
 * - GET  /api/teacher/assignments (RBAC, lists teacher's assignments)
 * - POST /api/teacher/assignment  (RBAC, create with validation)
 * - PUT  /api/teacher/assignment/:id  (RBAC, update own only)
 * - DELETE /api/teacher/assignment/:id (RBAC, delete own only)
 * - GET  /api/teacher/dashboard   (RBAC, includes class/assignment stats)
 */
import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import {
  setupDb, teardownDb, clearDb,
  createUser, createStudent, createTeacher,
  buildTestApp
} from './setup.js'
import Teacher from '../models/Teacher.js'
import Class from '../models/Class.js'
import AcademicYear from '../models/AcademicYear.js'
import Assignment from '../models/Assignment.js'

let app
let teacherUser, teacherToken, teacherUserId
let otherTeacherUser, otherTeacherToken
let studentUser, studentToken
let adminUser, adminToken
let academicYear, testClass

// ─── Lifecycle ────────────────────────────────────────────────────────────────

before(async () => {
  await setupDb()
  process.env.JWT_SECRET = 'test-secret'
  app = await buildTestApp()
})

after(async () => { await teardownDb() })

beforeEach(async () => {
  await clearDb()

  // Create academic year
  academicYear = await AcademicYear.create({
    name: '2026/2027', startDate: new Date('2026-09-01'),
    endDate: new Date('2027-06-30'), isActive: true,
  })

  // Create a class linked to the academic year
  testClass = await Class.create({
    name: 'Grade 10-A', grade: 'Grade 10', section: 'A',
    academicYearId: academicYear._id, capacity: 40,
  })

  // Create teacher user
  teacherUser = await createUser({ email: 'tassign@test.com', password: 'pass', role: 'teacher', name: 'Assign Teacher' })
  teacherUserId = teacherUser._id

  // Create teacher profile with assigned class
  await Teacher.create({
    userId: teacherUserId, name: 'Assign Teacher',
    employeeId: `TCH-${Date.now()}`, phone: '0911111111',
    email: 'tassign@test.com', assignedClassIds: [testClass._id],
  })

  // Create another teacher (for isolation tests)
  otherTeacherUser = await createUser({ email: 'other-t@test.com', password: 'pass', role: 'teacher', name: 'Other Teacher' })
  await Teacher.create({
    userId: otherTeacherUser._id, name: 'Other Teacher',
    employeeId: `TCH-OTHER-${Date.now()}`, phone: '0922222222',
    email: 'other-t@test.com', assignedClassIds: [],
  })

  // Create student
  const fixture = await createStudent({ name: 'Assign Student' })
  studentUser = fixture.user

  // Create admin
  adminUser = await createUser({ email: 'admin-assign@test.com', password: 'pass', role: 'admin', name: 'Admin' })

  // Tokens
  const secret = process.env.JWT_SECRET
  teacherToken = jwt.sign({ id: teacherUserId, email: teacherUser.email, role: 'teacher' }, secret, { expiresIn: '1h' })
  otherTeacherToken = jwt.sign({ id: otherTeacherUser._id, email: otherTeacherUser.email, role: 'teacher' }, secret, { expiresIn: '1h' })
  studentToken = jwt.sign({ id: studentUser._id, email: studentUser.email, role: 'student' }, secret, { expiresIn: '1h' })
  adminToken = jwt.sign({ id: adminUser._id, email: adminUser.email, role: 'admin' }, secret, { expiresIn: '1h' })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAssignment(overrides = {}) {
  return {
    title: 'Homework 1',
    description: 'Complete exercises 1-10',
    subject: 'Mathematics',
    grade: 'Grade 10',
    dueDate: new Date('2026-12-01').toISOString(),
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RBAC — Shared checks across teacher-only endpoints
// ═══════════════════════════════════════════════════════════════════════════════

describe('Teacher Assignment Routes RBAC', () => {
  const endpoints = [
    { method: 'GET', path: '/api/teacher/classes' },
    { method: 'GET', path: '/api/teacher/assignments' },
    { method: 'GET', path: '/api/teacher/dashboard' },
  ]

  for (const { method, path } of endpoints) {
    it(`${method} ${path} → 401 without token`, async () => {
      await request(app)[method.toLowerCase()](path).expect(401)
    })

    it(`${method} ${path} → 403 for student`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403)
    })

    it(`${method} ${path} → 200 for teacher`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/teacher/classes
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/teacher/classes', () => {
  it('returns classes assigned via assignedClassIds', async () => {
    const res = await request(app).get('/api/teacher/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)

    assert.ok(Array.isArray(res.body))
    assert.ok(res.body.length >= 1)
    const found = res.body.find(c => c._id.toString() === testClass._id.toString())
    assert.ok(found, 'Should find the assigned class')
    assert.equal(found.name, 'Grade 10-A')
  })

  it('returns empty array when teacher has no assigned classes', async () => {
    const res = await request(app).get('/api/teacher/classes')
      .set('Authorization', `Bearer ${otherTeacherToken}`)
      .expect(200)

    assert.ok(Array.isArray(res.body))
    assert.equal(res.body.length, 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/teacher/assignment
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/teacher/assignment', () => {
  it('creates an assignment with valid data', async () => {
    const res = await request(app).post('/api/teacher/assignment')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(makeAssignment())
      .expect(201)

    assert.ok(res.body._id)
    assert.equal(res.body.title, 'Homework 1')
    assert.equal(res.body.subject, 'Mathematics')
    assert.equal(res.body.grade, 'Grade 10')
    assert.equal(res.body.teacherId.toString(), teacherUserId.toString())
  })

  it('creates an assignment with a classId', async () => {
    const res = await request(app).post('/api/teacher/assignment')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(makeAssignment({ classId: testClass._id.toString() }))
      .expect(201)

    assert.equal(res.body.classId.toString(), testClass._id.toString())
    // Grade should be resolved from class if not provided
    assert.equal(res.body.grade, 'Grade 10')
  })

  it('rejects when required fields are missing', async () => {
    await request(app).post('/api/teacher/assignment')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Missing fields' })
      .expect(500) // Mongoose validation error
  })

  it('403 for student role', async () => {
    await request(app).post('/api/teacher/assignment')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(makeAssignment())
      .expect(403)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/teacher/assignments
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/teacher/assignments', () => {
  it('returns only the teacher\'s own assignments', async () => {
    await Assignment.create({
      teacherId: teacherUserId, title: 'My HW', description: 'Do it',
      subject: 'Math', grade: 'Grade 10', dueDate: new Date('2026-12-01'),
    })
    await Assignment.create({
      teacherId: otherTeacherUser._id, title: 'Other HW', description: 'Other',
      subject: 'English', grade: 'Grade 10', dueDate: new Date('2026-12-01'),
    })

    const res = await request(app).get('/api/teacher/assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)

    assert.ok(Array.isArray(res.body))
    assert.equal(res.body.length, 1)
    assert.equal(res.body[0].title, 'My HW')
  })

  it('returns empty array when teacher has no assignments', async () => {
    const res = await request(app).get('/api/teacher/assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)

    assert.equal(res.body.length, 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/teacher/assignment/:id
// ═══════════════════════════════════════════════════════════════════════════════

describe('PUT /api/teacher/assignment/:id', () => {
  it('updates the teacher\'s own assignment', async () => {
    const assignment = await Assignment.create({
      teacherId: teacherUserId, title: 'Original', description: 'Orig desc',
      subject: 'Math', grade: 'Grade 10', dueDate: new Date('2026-12-01'),
    })

    const res = await request(app).put(`/api/teacher/assignment/${assignment._id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Updated Title', description: 'Updated desc' })
      .expect(200)

    assert.equal(res.body.title, 'Updated Title')
    assert.equal(res.body.description, 'Updated desc')
  })

  it('returns 404 when updating another teacher\'s assignment', async () => {
    const assignment = await Assignment.create({
      teacherId: otherTeacherUser._id, title: 'Not Mine', description: 'Other',
      subject: 'English', grade: 'Grade 10', dueDate: new Date('2026-12-01'),
    })

    await request(app).put(`/api/teacher/assignment/${assignment._id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Hacked' })
      .expect(404)
  })

  it('returns 404 for non-existent assignment', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).put(`/api/teacher/assignment/${fakeId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'X' })
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/teacher/assignment/:id
// ═══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/teacher/assignment/:id', () => {
  it('deletes the teacher\'s own assignment', async () => {
    const assignment = await Assignment.create({
      teacherId: teacherUserId, title: 'To Delete', description: 'Delete me',
      subject: 'Math', grade: 'Grade 10', dueDate: new Date('2026-12-01'),
    })

    await request(app).delete(`/api/teacher/assignment/${assignment._id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)

    const found = await Assignment.findById(assignment._id)
    assert.equal(found, null)
  })

  it('returns 404 when deleting another teacher\'s assignment', async () => {
    const assignment = await Assignment.create({
      teacherId: otherTeacherUser._id, title: 'Not Mine', description: 'Other',
      subject: 'English', grade: 'Grade 10', dueDate: new Date('2026-12-01'),
    })

    await request(app).delete(`/api/teacher/assignment/${assignment._id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404)

    // Verify it still exists
    const found = await Assignment.findById(assignment._id)
    assert.ok(found)
  })

  it('returns 404 for non-existent assignment', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).delete(`/api/teacher/assignment/${fakeId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/teacher/dashboard (assignment-related stats)
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/teacher/dashboard', () => {
  it('returns dashboard with assignment count and class count', async () => {
    await Assignment.create({
      teacherId: teacherUserId, title: 'HW 1', description: 'd',
      subject: 'Math', grade: 'Grade 10', dueDate: new Date('2026-12-01'),
    })

    const res = await request(app).get('/api/teacher/dashboard')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)

    assert.equal(typeof res.body.totalClasses, 'number')
    assert.ok(res.body.totalClasses >= 1)
    assert.equal(typeof res.body.assignmentsCount, 'number')
    assert.ok(res.body.assignmentsCount >= 1)
    assert.ok(Array.isArray(res.body.recentAssignments))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Assignment CRUD End-to-End Flow
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assignment CRUD end-to-end', () => {
  it('create → list → update → delete flow', async () => {
    // 1. Create
    const createRes = await request(app).post('/api/teacher/assignment')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(makeAssignment({ title: 'E2E Assignment' }))
      .expect(201)

    const assignmentId = createRes.body._id

    // 2. List — should appear
    const listRes = await request(app).get('/api/teacher/assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)

    assert.ok(listRes.body.some(a => a._id === assignmentId))

    // 3. Update
    const updateRes = await request(app).put(`/api/teacher/assignment/${assignmentId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Updated E2E' })
      .expect(200)

    assert.equal(updateRes.body.title, 'Updated E2E')

    // 4. Delete
    await request(app).delete(`/api/teacher/assignment/${assignmentId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)

    // 5. Verify gone
    const found = await Assignment.findById(assignmentId)
    assert.equal(found, null)
  })
})
