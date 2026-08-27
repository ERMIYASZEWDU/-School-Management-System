/**
 * Enrollment CRUD Route Tests
 *
 * Tests all enrollment endpoints:
 * - POST /api/enrollment/enroll
 * - POST /api/enrollment/promote
 * - POST /api/enrollment/transfer
 * - GET /api/enrollment/student/:studentId/history
 * - GET /api/enrollment/student/:studentId/current
 * - GET /api/enrollment/class/:classId/students
 * - PUT /api/enrollment/:enrollmentId/status
 * - GET /api/enrollment/academic-year/:academicYearId/students
 */
import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import mongoose from 'mongoose'
import {
  setupDb,
  teardownDb,
  clearDb,
  buildTestApp,
  createUser,
  createStudent,
  createTeacher,
} from './setup.js'
import Student from '../models/Student.js'
import Parent from '../models/Parent.js'
import Class from '../models/Class.js'
import AcademicYear from '../models/AcademicYear.js'
import jwt from 'jsonwebtoken'

let app
let _classSeq = 0

// Helpers
function sign(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
}

function oid() {
  return new mongoose.Types.ObjectId()
}

async function createAcademicYear(overrides = {}) {
  return AcademicYear.create({
    name: `AY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    startDate: new Date('2025-09-01'),
    endDate: new Date('2026-06-30'),
    status: 'active',
    ...overrides,
  })
}

async function createClass(overrides = {}) {
  _classSeq++
  return Class.create({
    name: `Cls-${_classSeq}-${Math.random().toString(36).slice(2, 6)}`,
    grade: 'Grade 10',
    section: 'A',
    capacity: 40,
    ...overrides,
  })
}

async function createParentFor(studentIds = []) {
  const user = await createUser({ role: 'parent', name: 'Enroll Parent' })
  const parent = await Parent.create({
    userId: user._id,
    name: user.name,
    studentIds,
    phone: '+251999999999',
    email: `parent-enroll-${Date.now()}@test.com`,
  })
  return { user, parent }
}

// ─── Setup ──────────────────────────────────────────────────────────────────

before(async () => {
  await setupDb()
  app = await buildTestApp()
})

after(async () => {
  await teardownDb()
})

beforeEach(async () => {
  await clearDb()
  _classSeq = 0
})

// ─── RBAC Tests ─────────────────────────────────────────────────────────────

describe('Enrollment RBAC', () => {
  let adminToken, teacherToken, studentToken, studentObj

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'rbac-admin@test.com' })
    adminToken = sign(admin)

    const { user: tUser } = await createTeacher()
    teacherToken = sign(tUser)

    const { user: sUser, student } = await createStudent()
    studentToken = sign(sUser)
    studentObj = student
  })

  it('should reject requests with no token', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const res = await request(app)
      .post('/api/enrollment/enroll')
      .send({ studentId: studentObj._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })
    assert.equal(res.status, 401)
  })

  it('should reject teacher from enrolling', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const res = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: studentObj._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })
    assert.equal(res.status, 403)
  })

  it('should reject student from enrolling', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const res = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ studentId: studentObj._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })
    assert.equal(res.status, 403)
  })

  it('should allow admin to enroll', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const res = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: studentObj._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })
    assert.equal(res.status, 201)
  })
})

// ─── POST /api/enrollment/enroll ────────────────────────────────────────────

describe('POST /api/enrollment/enroll', () => {
  let adminToken

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'enroll-admin@test.com' })
    adminToken = sign(admin)
  })

  it('should enroll a student successfully', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const { student } = await createStudent()

    const res = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })

    assert.equal(res.status, 201)
    assert.ok(res.body.message.match(/enrolled successfully/i))
    assert.ok(res.body.enrollment)
    assert.equal(res.body.enrollment.status, 'active')
  })

  it('should return 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: oid() })

    assert.equal(res.status, 400)
  })

  it('should return 404 for non-existent student', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })

    const res = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: oid(), classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })

    assert.equal(res.status, 404)
  })

  it('should return 404 for non-existent class', async () => {
    const year = await createAcademicYear()
    const { student } = await createStudent()

    const res = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: oid(), academicYearId: year._id.toString(), rollNumber: 1 })

    assert.equal(res.status, 404)
  })

  it('should return 400 if student already enrolled in academic year', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const { student } = await createStudent()

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })

    const res = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 2 })

    assert.equal(res.status, 400)
    assert.ok(res.body.message.match(/already enrolled/i))
  })

  it('should return 400 if class does not belong to academic year', async () => {
    const year1 = await createAcademicYear({ name: 'AY-1' })
    const year2 = await createAcademicYear({ name: 'AY-2' })
    const cls = await createClass({ academicYearId: year1._id })
    const { student } = await createStudent()

    const res = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: cls._id, academicYearId: year2._id.toString(), rollNumber: 1 })

    assert.equal(res.status, 400)
    assert.ok(res.body.message.match(/does not belong/i))
  })

  it('should update student cache fields after enrollment', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id, grade: 'Grade 10', section: 'A' })
    const { student } = await createStudent()

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 5 })

    const updated = await Student.findById(student._id)
    assert.equal(updated.classId.toString(), cls._id.toString())
    assert.equal(updated.grade, 'Grade 10')
    assert.equal(updated.section, 'A')
    assert.equal(updated.rollNumber, 5)
    assert.equal(updated.status, 'active')
  })
})

// ─── GET /api/enrollment/student/:studentId/history ─────────────────────────

describe('GET /api/enrollment/student/:studentId/history', () => {
  let adminToken, studentUser, studentObj

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'hist-admin@test.com' })
    adminToken = sign(admin)
    const { user, student } = await createStudent()
    studentUser = user
    studentObj = student
  })

  it('should return enrollment history for admin', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: studentObj._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })

    const res = await request(app)
      .get(`/api/enrollment/student/${studentObj._id}/history`)
      .set('Authorization', `Bearer ${adminToken}`)

    assert.equal(res.status, 200)
    assert.ok(res.body.enrollmentHistory)
    assert.equal(res.body.count, 1)
  })

  it('should return empty history for student with no enrollments', async () => {
    const res = await request(app)
      .get(`/api/enrollment/student/${studentObj._id}/history`)
      .set('Authorization', `Bearer ${adminToken}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.count, 0)
  })

  it('should allow student to view own history', async () => {
    const res = await request(app)
      .get(`/api/enrollment/student/${studentObj._id}/history`)
      .set('Authorization', `Bearer ${sign(studentUser)}`)

    assert.equal(res.status, 200)
  })

  it('should reject student viewing other student history', async () => {
    const other = await createStudent({ name: 'Other Student' })
    const res = await request(app)
      .get(`/api/enrollment/student/${other.student._id}/history`)
      .set('Authorization', `Bearer ${sign(studentUser)}`)

    assert.equal(res.status, 403)
  })
})

// ─── GET /api/enrollment/student/:studentId/current ─────────────────────────

describe('GET /api/enrollment/student/:studentId/current', () => {
  let adminToken, studentUser, studentObj

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'curr-admin@test.com' })
    adminToken = sign(admin)
    const { user, student } = await createStudent()
    studentUser = user
    studentObj = student
  })

  it('should return current enrollment', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: studentObj._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })

    const res = await request(app)
      .get(`/api/enrollment/student/${studentObj._id}/current`)
      .set('Authorization', `Bearer ${adminToken}`)

    assert.equal(res.status, 200)
    assert.ok(res.body.enrollment)
    assert.equal(res.body.enrollment.status, 'active')
  })

  it('should return 404 when no active enrollment', async () => {
    const res = await request(app)
      .get(`/api/enrollment/student/${studentObj._id}/current`)
      .set('Authorization', `Bearer ${adminToken}`)

    assert.equal(res.status, 404)
  })

  it('should allow student to view own current enrollment', async () => {
    const res = await request(app)
      .get(`/api/enrollment/student/${studentObj._id}/current`)
      .set('Authorization', `Bearer ${sign(studentUser)}`)

    assert.notEqual(res.status, 403)
  })
})

// ─── PUT /api/enrollment/:enrollmentId/status ───────────────────────────────

describe('PUT /api/enrollment/:enrollmentId/status', () => {
  let adminToken, studentObj

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'status-admin@test.com' })
    adminToken = sign(admin)
    const { student } = await createStudent()
    studentObj = student
  })

  async function enrollStudent() {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const res = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: studentObj._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })
    return res.body.enrollment._id
  }

  it('should update enrollment status to withdrawn', async () => {
    const enrollmentId = await enrollStudent()

    const res = await request(app)
      .put(`/api/enrollment/${enrollmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'withdrawn', reason: 'Family moved' })

    assert.equal(res.status, 200)
    assert.equal(res.body.enrollment.status, 'withdrawn')
  })

  it('should update enrollment status to graduated', async () => {
    const enrollmentId = await enrollStudent()

    const res = await request(app)
      .put(`/api/enrollment/${enrollmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'graduated' })

    assert.equal(res.status, 200)
    assert.equal(res.body.enrollment.status, 'graduated')
  })

  it('should return 400 for invalid status', async () => {
    const enrollmentId = await enrollStudent()

    const res = await request(app)
      .put(`/api/enrollment/${enrollmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'invalid_status' })

    assert.equal(res.status, 400)
  })

  it('should return 404 for non-existent enrollment', async () => {
    const res = await request(app)
      .put(`/api/enrollment/${oid()}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'withdrawn' })

    assert.equal(res.status, 404)
  })

  it('should update student status when withdrawn', async () => {
    const enrollmentId = await enrollStudent()

    await request(app)
      .put(`/api/enrollment/${enrollmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'withdrawn', reason: 'Left school' })

    const student = await Student.findById(studentObj._id)
    assert.equal(student.status, 'inactive')
  })
})

// ─── GET /api/enrollment/class/:classId/students ────────────────────────────

describe('GET /api/enrollment/class/:classId/students', () => {
  let adminToken

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'cls-admin@test.com' })
    adminToken = sign(admin)
  })

  it('should return students enrolled in a class', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const { student } = await createStudent()

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })

    const res = await request(app)
      .get(`/api/enrollment/class/${cls._id}/students`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ academicYearId: year._id.toString() })

    assert.equal(res.status, 200)
    assert.equal(res.body.count, 1)
    assert.equal(res.body.students.length, 1)
  })

  it('should return 404 for non-existent class', async () => {
    const res = await request(app)
      .get(`/api/enrollment/class/${oid()}/students`)
      .set('Authorization', `Bearer ${adminToken}`)

    assert.equal(res.status, 404)
  })

  it('should return empty list for class with no enrollments', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })

    const res = await request(app)
      .get(`/api/enrollment/class/${cls._id}/students`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ academicYearId: year._id.toString() })

    assert.equal(res.status, 200)
    assert.equal(res.body.count, 0)
  })
})

// ─── GET /api/enrollment/academic-year/:academicYearId/students ─────────────

describe('GET /api/enrollment/academic-year/:academicYearId/students', () => {
  let adminToken

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'ay-admin@test.com' })
    adminToken = sign(admin)
  })

  it('should return all enrollments for an academic year', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const { student } = await createStudent()

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })

    const res = await request(app)
      .get(`/api/enrollment/academic-year/${year._id}/students`)
      .set('Authorization', `Bearer ${adminToken}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.count, 1)
  })

  it('should filter by grade', async () => {
    const year = await createAcademicYear()
    const cls10 = await createClass({ academicYearId: year._id, grade: 'Grade 10', section: 'A' })
    const cls11 = await createClass({ academicYearId: year._id, grade: 'Grade 11', section: 'A', stream: 'Natural Science' })
    const s1 = (await createStudent({ grade: 'Grade 10', section: 'A' })).student
    const s2 = (await createStudent({ grade: 'Grade 11', section: 'A', stream: 'Natural Science' })).student

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: s1._id, classId: cls10._id, academicYearId: year._id.toString(), rollNumber: 1 })

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: s2._id, classId: cls11._id, academicYearId: year._id.toString(), rollNumber: 1 })

    const res = await request(app)
      .get(`/api/enrollment/academic-year/${year._id}/students`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ grade: 'Grade 10' })

    assert.equal(res.status, 200)
    assert.equal(res.body.count, 1)
  })
})

// ─── POST /api/enrollment/transfer ──────────────────────────────────────────

describe('POST /api/enrollment/transfer', () => {
  let adminToken

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'xfer-admin@test.com' })
    adminToken = sign(admin)
  })

  it('should transfer student to a different class', async () => {
    const year = await createAcademicYear()
    const cls1 = await createClass({ academicYearId: year._id, section: 'A' })
    const cls2 = await createClass({ academicYearId: year._id, section: 'B' })
    const { student } = await createStudent()

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: cls1._id, academicYearId: year._id.toString(), rollNumber: 1 })

    const res = await request(app)
      .post('/api/enrollment/transfer')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id.toString(), targetClassId: cls2._id.toString(), reason: 'Better fit' })

    assert.equal(res.status, 200)
    assert.ok(res.body.message.match(/transferred successfully/i))
    assert.equal(res.body.enrollment.classId._id.toString(), cls2._id.toString())
  })

  it('should return 400 when transferring to same class', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const { student } = await createStudent()

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })

    const res = await request(app)
      .post('/api/enrollment/transfer')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id.toString(), targetClassId: cls._id.toString() })

    assert.equal(res.status, 400)
    assert.ok(res.body.message.match(/already enrolled/i))
  })

  it('should return 404 for student with no active enrollment', async () => {
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id })
    const { student } = await createStudent()

    const res = await request(app)
      .post('/api/enrollment/transfer')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id.toString(), targetClassId: cls._id.toString() })

    assert.equal(res.status, 404)
  })
})

// ─── POST /api/enrollment/promote ───────────────────────────────────────────

describe('POST /api/enrollment/promote', () => {
  let adminToken

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'promo-admin@test.com' })
    adminToken = sign(admin)
  })

  it('should promote students to next grade', async () => {
    const yearOld = await createAcademicYear({ name: 'Old Year' })
    const yearNew = await createAcademicYear({ name: 'New Year' })
    const clsOld = await createClass({ academicYearId: yearOld._id, grade: 'Grade 10', section: 'A' })
    const clsNew = await createClass({ academicYearId: yearNew._id, grade: 'Grade 11', section: 'A', stream: 'Natural Science' })
    const { student } = await createStudent()

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: clsOld._id, academicYearId: yearOld._id.toString(), rollNumber: 1 })

    const res = await request(app)
      .post('/api/enrollment/promote')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentIds: [student._id.toString()],
        targetClassId: clsNew._id.toString(),
        targetAcademicYearId: yearNew._id.toString(),
      })

    assert.equal(res.status, 200)
    assert.equal(res.body.promotedStudents.length, 1)
  })

  it('should return 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/enrollment/promote')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentIds: [] })

    assert.equal(res.status, 400)
  })

  it('should return 404 for non-existent target class', async () => {
    const year = await createAcademicYear()
    const { student } = await createStudent()

    const res = await request(app)
      .post('/api/enrollment/promote')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentIds: [student._id.toString()],
        targetClassId: oid().toString(),
        targetAcademicYearId: year._id.toString(),
      })

    assert.equal(res.status, 404)
  })
})

// ─── Enrollment End-to-End Flow ─────────────────────────────────────────────

describe('Enrollment E2E flow', () => {
  let adminToken

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'e2e-admin@test.com' })
    adminToken = sign(admin)
  })

  it('enroll → check history → check current → transfer → withdraw', async () => {
    const year = await createAcademicYear()
    const cls1 = await createClass({ academicYearId: year._id, section: 'A' })
    const cls2 = await createClass({ academicYearId: year._id, section: 'B' })
    const { student } = await createStudent()

    // 1. Enroll
    const enrollRes = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id, classId: cls1._id, academicYearId: year._id.toString(), rollNumber: 1 })
    assert.equal(enrollRes.status, 201)

    // 2. Check history
    const histRes = await request(app)
      .get(`/api/enrollment/student/${student._id}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(histRes.status, 200)
    assert.equal(histRes.body.count, 1)

    // 3. Check current
    const currRes = await request(app)
      .get(`/api/enrollment/student/${student._id}/current`)
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(currRes.status, 200)
    assert.equal(currRes.body.enrollment.status, 'active')

    // 4. Transfer
    const xferRes = await request(app)
      .post('/api/enrollment/transfer')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student._id.toString(), targetClassId: cls2._id.toString(), reason: 'Schedule conflict' })
    assert.equal(xferRes.status, 200)

    // 5. History should now have 2 records
    const hist2 = await request(app)
      .get(`/api/enrollment/student/${student._id}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(hist2.body.count, 2)

    // 6. Withdraw from new enrollment
    const newEnrollmentId = xferRes.body.enrollment._id
    const wdRes = await request(app)
      .put(`/api/enrollment/${newEnrollmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'withdrawn', reason: 'Moved' })
    assert.equal(wdRes.status, 200)
    assert.equal(wdRes.body.enrollment.status, 'withdrawn')
  })
})

// ─── Parent Enrollment Isolation Tests ──────────────────────────────────────

describe('Parent enrollment isolation', () => {
  let adminToken, parentAUser, parentBUser, studentAUser, studentAObj, studentBObj

  beforeEach(async () => {
    const admin = await createUser({ role: 'admin', email: 'iso-admin@test.com' })
    adminToken = sign(admin)

    // Create two students
    const { user: sUserA, student: sA } = await createStudent({ name: 'Student A' })
    const { user: sUserB, student: sB } = await createStudent({ name: 'Student B' })
    studentAUser = sUserA
    studentAObj = sA
    studentBObj = sB

    // Create Parent A linked only to Student A
    const { user: pUserA } = await createParentFor([sA._id])
    parentAUser = pUserA

    // Create Parent B linked only to Student B
    const { user: pUserB } = await createParentFor([sB._id])
    parentBUser = pUserB

    // Enroll both students
    const year = await createAcademicYear()
    const cls = await createClass({ academicYearId: year._id, section: 'A' })

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: sA._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 1 })

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: sB._id, classId: cls._id, academicYearId: year._id.toString(), rollNumber: 2 })
  })

  it('Parent A can see own child enrollment history', async () => {
    const res = await request(app)
      .get(`/api/parent/child/${studentAObj._id}/enrollment-history`)
      .set('Authorization', `Bearer ${sign(parentAUser)}`)

    assert.equal(res.status, 200)
    assert.ok(res.body.enrollmentHistory)
    assert.ok(res.body.totalEnrollments >= 1)
  })

  it('Parent A cannot see Parent B child enrollment history', async () => {
    const res = await request(app)
      .get(`/api/parent/child/${studentBObj._id}/enrollment-history`)
      .set('Authorization', `Bearer ${sign(parentAUser)}`)

    assert.equal(res.status, 403)
  })

  it('Parent B cannot see Parent A child enrollment history', async () => {
    const res = await request(app)
      .get(`/api/parent/child/${studentAObj._id}/enrollment-history`)
      .set('Authorization', `Bearer ${sign(parentBUser)}`)

    assert.equal(res.status, 403)
  })

  it('Student A can see own enrollment history via student route', async () => {
    const res = await request(app)
      .get(`/api/enrollment/student/${studentAObj._id}/history`)
      .set('Authorization', `Bearer ${sign(studentAUser)}`)

    assert.equal(res.status, 200)
  })

  it('Student A cannot see Student B enrollment history', async () => {
    const { user: sUserA } = await createStudent({ name: 'Isolated A' })
    const res = await request(app)
      .get(`/api/enrollment/student/${studentBObj._id}/history`)
      .set('Authorization', `Bearer ${sign(sUserA)}`)

    assert.equal(res.status, 403)
  })

  it('Admin can see any student enrollment history', async () => {
    const resA = await request(app)
      .get(`/api/enrollment/student/${studentAObj._id}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
    const resB = await request(app)
      .get(`/api/enrollment/student/${studentBObj._id}/history`)
      .set('Authorization', `Bearer ${adminToken}`)

    assert.equal(resA.status, 200)
    assert.equal(resB.status, 200)
  })

  it('Parent A can see own child current enrollment', async () => {
    const res = await request(app)
      .get(`/api/parent/child/${studentAObj._id}`)
      .set('Authorization', `Bearer ${sign(parentAUser)}`)

    assert.equal(res.status, 200)
  })

  it('Parent A cannot see Parent B child details', async () => {
    const res = await request(app)
      .get(`/api/parent/child/${studentBObj._id}`)
      .set('Authorization', `Bearer ${sign(parentAUser)}`)

    assert.equal(res.status, 403)
  })

  it('Teacher cannot access parent enrollment history routes', async () => {
    const { user: teacherUser } = await createTeacher()
    const res = await request(app)
      .get(`/api/parent/child/${studentAObj._id}/enrollment-history`)
      .set('Authorization', `Bearer ${sign(teacherUser)}`)

    assert.equal(res.status, 403)
  })

  it('Student cannot access parent enrollment history routes', async () => {
    const res = await request(app)
      .get(`/api/parent/child/${studentAObj._id}/enrollment-history`)
      .set('Authorization', `Bearer ${sign(studentAUser)}`)

    assert.equal(res.status, 403)
  })
})
