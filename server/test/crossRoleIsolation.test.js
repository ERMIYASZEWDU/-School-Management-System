/**
 * Cross-Role Data Isolation Tests
 *
 * Verifies that users from one role cannot access routes belonging to other roles:
 * - Admin cannot access Student, Parent, or Teacher dashboard routes
 * - Student cannot access Admin, Parent, or Teacher routes
 * - Parent cannot access Admin, Student, or Teacher routes
 * - Teacher cannot access Admin, Student, or Parent dashboard routes
 */
import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import jwt from 'jsonwebtoken'

import { setupDb, teardownDb, clearDb, createUser, createStudent, createParent, createTeacher, buildTestApp } from './setup.js'

let app
let adminToken, teacherToken, studentToken, parentToken

// ─── Lifecycle ────────────────────────────────────────────────────────────────

before(async () => {
  await setupDb()
  process.env.JWT_SECRET = 'test-secret'
  app = await buildTestApp()
})

after(async () => { await teardownDb() })

beforeEach(async () => {
  await clearDb()

  const admin = await createUser({ email: 'admin-iso@test.com', password: 'pass', role: 'admin', name: 'Admin' })
  const teacher = await createUser({ email: 'teacher-iso@test.com', password: 'pass', role: 'teacher', name: 'Teacher' })
  const { user: studentUser, student } = await createStudent({ name: 'Student' })
  const { user: parentUser } = await createParent([student._id], { name: 'Parent' })

  const secret = process.env.JWT_SECRET
  adminToken = jwt.sign({ id: admin._id, email: admin.email, role: 'admin' }, secret, { expiresIn: '1h' })
  teacherToken = jwt.sign({ id: teacher._id, email: teacher.email, role: 'teacher' }, secret, { expiresIn: '1h' })
  studentToken = jwt.sign({ id: studentUser._id, email: studentUser.email, role: 'student' }, secret, { expiresIn: '1h' })
  parentToken = jwt.sign({ id: parentUser._id, email: parentUser.email, role: 'parent' }, secret, { expiresIn: '1h' })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Admin routes — only admin allowed
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin routes blocked for non-admin roles', () => {
  const adminEndpoints = [
    'GET /api/admin/students',
    'GET /api/admin/teachers',
    'GET /api/admin/parents',
    'GET /api/admin/classes',
    'GET /api/admin/dashboard',
    'GET /api/academic-years',
  ]

  for (const endpoint of adminEndpoints) {
    const [method, path] = endpoint.split(' ')

    it(`${endpoint} → 403 for teacher`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403)
    })

    it(`${endpoint} → 403 for student`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403)
    })

    it(`${endpoint} → 403 for parent`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// Student routes — only student allowed
// ═══════════════════════════════════════════════════════════════════════════════

describe('Student routes blocked for non-student roles', () => {
  const studentEndpoints = [
    'GET /api/student/dashboard',
    'GET /api/student/profile',
    'GET /api/student/grades',
    'GET /api/student/attendance',
    'GET /api/student/announcements',
    'GET /api/student/timetable',
    'GET /api/student/enrollment-history',
  ]

  for (const endpoint of studentEndpoints) {
    const [method, path] = endpoint.split(' ')

    it(`${endpoint} → 403 for admin`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it(`${endpoint} → 403 for teacher`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403)
    })

    it(`${endpoint} → 403 for parent`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// Parent routes — only parent allowed
// ═══════════════════════════════════════════════════════════════════════════════

describe('Parent routes blocked for non-parent roles', () => {
  const parentEndpoints = [
    'GET /api/parent/dashboard',
    'GET /api/parent/children',
    'GET /api/parent/announcements',
  ]

  for (const endpoint of parentEndpoints) {
    const [method, path] = endpoint.split(' ')

    it(`${endpoint} → 403 for admin`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it(`${endpoint} → 403 for teacher`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403)
    })

    it(`${endpoint} → 403 for student`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// Teacher routes — only teacher allowed
// ═══════════════════════════════════════════════════════════════════════════════

describe('Teacher routes blocked for non-teacher roles', () => {
  const teacherEndpoints = [
    'GET /api/teacher/classes',
    'GET /api/teacher/grades',
    'GET /api/teacher/attendance',
    'GET /api/teacher/assignments',
    'GET /api/teacher/dashboard',
  ]

  for (const endpoint of teacherEndpoints) {
    const [method, path] = endpoint.split(' ')

    it(`${endpoint} → 403 for admin`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it(`${endpoint} → 403 for student`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403)
    })

    it(`${endpoint} → 403 for parent`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// Unauthenticated requests — 401 for all protected routes
// ═══════════════════════════════════════════════════════════════════════════════

describe('Unauthenticated requests → 401 for all protected routes', () => {
  const allEndpoints = [
    'GET /api/admin/students',
    'GET /api/student/dashboard',
    'GET /api/parent/dashboard',
    'GET /api/teacher/classes',
    'GET /api/academic-years',
    'GET /api/terms',
    'GET /api/notifications',
    'GET /api/announcements',
  ]

  for (const endpoint of allEndpoints) {
    const [method, path] = endpoint.split(' ')

    it(`${endpoint} → 401 without token`, async () => {
      await request(app)[method.toLowerCase()](path)
        .expect(401)
    })
  }
})
