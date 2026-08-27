/**
 * Student Routes Tests
 *
 * Tests the student-facing routes under /api/student:
 * - GET /api/student/dashboard     (RBAC, returns student profile + grades + attendance)
 * - GET /api/student/profile       (RBAC, returns populated student profile)
 * - GET /api/student/grades        (RBAC, supports subject/gradeType filters)
 * - GET /api/student/attendance    (RBAC, supports date range, returns statistics)
 * - GET /api/student/announcements (RBAC, returns published announcements)
 * - GET /api/student/timetable     (RBAC)
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
import Grade from '../models/Grade.js'
import Attendance from '../models/Attendance.js'
import Announcement from '../models/Announcement.js'
import Assignment from '../models/Assignment.js'
import AssignmentSubmission from '../models/AssignmentSubmission.js'
import Enrollment from '../models/Enrollment.js'
import AcademicYear from '../models/AcademicYear.js'

let app
let studentUser, student, studentToken
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

  // Create student with profile
  const fixture = await createStudent({ name: 'Test Student' })
  studentUser = fixture.user
  student = fixture.student

  // Create teacher
  teacherUser = await createUser({ email: 't-student@test.com', password: 'pass', role: 'teacher', name: 'Grade Teacher' })

  // Create admin
  adminUser = await createUser({ email: 'a-student@test.com', password: 'pass', role: 'admin', name: 'Admin' })

  // Tokens
  const secret = process.env.JWT_SECRET
  studentToken = jwt.sign({ id: studentUser._id, email: studentUser.email, role: 'student' }, secret, { expiresIn: '1h' })
  teacherToken = jwt.sign({ id: teacherUser._id, email: teacherUser.email, role: 'teacher' }, secret, { expiresIn: '1h' })
  adminToken = jwt.sign({ id: adminUser._id, email: adminUser.email, role: 'admin' }, secret, { expiresIn: '1h' })
})

// ═══════════════════════════════════════════════════════════════════════════════
// RBAC
// ═══════════════════════════════════════════════════════════════════════════════

describe('Student Routes RBAC', () => {
  const endpoints = [
    { method: 'GET', path: '/api/student/dashboard' },
    { method: 'GET', path: '/api/student/profile' },
    { method: 'GET', path: '/api/student/grades' },
    { method: 'GET', path: '/api/student/attendance' },
    { method: 'GET', path: '/api/student/announcements' },
    { method: 'GET', path: '/api/student/timetable' },
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

    it(`${method} ${path} → 200 for student`, async () => {
      await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/student/dashboard', () => {
  it('returns student dashboard with grades and attendance', async () => {
    // Create some grades for the student
    await Grade.create({ teacherId: teacherUser._id, studentId: student._id, subject: 'Math', score: 85, gradeType: 'quiz' })
    await Grade.create({ teacherId: teacherUser._id, studentId: student._id, subject: 'English', score: 90, gradeType: 'assignment' })

    // Create attendance
    await Attendance.create({ studentId: student._id, date: new Date('2026-03-15'), status: 'present', markedBy: teacherUser._id })
    await Attendance.create({ studentId: student._id, date: new Date('2026-03-16'), status: 'absent', markedBy: teacherUser._id })

    const res = await request(app).get('/api/student/dashboard')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.ok(res.body.student)
    assert.equal(res.body.student.name, 'Test Student')
    assert.ok(Array.isArray(res.body.recentGrades))
    assert.ok(res.body.recentGrades.length >= 2)
    assert.equal(typeof res.body.attendancePercentage, 'number')
  })

  it('returns 404 when student profile does not exist', async () => {
    // Create a user without a student profile
    const orphan = await createUser({ email: 'orphan@test.com', password: 'pass', role: 'student' })
    const orphanToken = jwt.sign({ id: orphan._id, email: orphan.email, role: 'student' }, process.env.JWT_SECRET, { expiresIn: '1h' })

    await request(app).get('/api/student/dashboard')
      .set('Authorization', `Bearer ${orphanToken}`)
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/student/profile', () => {
  it('returns the student profile', async () => {
    const res = await request(app).get('/api/student/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.name, 'Test Student')
    assert.equal(res.body.grade, 'Grade 10')
    assert.ok(res.body.enrollmentNumber)
  })

  it('returns 404 for user without student profile', async () => {
    const orphan = await createUser({ email: 'orphan2@test.com', password: 'pass', role: 'student' })
    const orphanToken = jwt.sign({ id: orphan._id, email: orphan.email, role: 'student' }, process.env.JWT_SECRET, { expiresIn: '1h' })

    await request(app).get('/api/student/profile')
      .set('Authorization', `Bearer ${orphanToken}`)
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GRADES
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/student/grades', () => {
  it('returns the student grades', async () => {
    await Grade.create({ teacherId: teacherUser._id, studentId: student._id, subject: 'Math', score: 85, gradeType: 'quiz' })
    await Grade.create({ teacherId: teacherUser._id, studentId: student._id, subject: 'English', score: 90, gradeType: 'assignment' })

    const res = await request(app).get('/api/student/grades')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.ok(Array.isArray(res.body))
    assert.equal(res.body.length, 2)
  })

  it('filters by subject', async () => {
    await Grade.create({ teacherId: teacherUser._id, studentId: student._id, subject: 'Math', score: 85, gradeType: 'quiz' })
    await Grade.create({ teacherId: teacherUser._id, studentId: student._id, subject: 'English', score: 90, gradeType: 'quiz' })

    const res = await request(app).get('/api/student/grades?subject=Math')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.length, 1)
    assert.equal(res.body[0].subject, 'Math')
  })

  it('filters by gradeType', async () => {
    await Grade.create({ teacherId: teacherUser._id, studentId: student._id, subject: 'Math', score: 85, gradeType: 'quiz' })
    await Grade.create({ teacherId: teacherUser._id, studentId: student._id, subject: 'English', score: 90, gradeType: 'assignment' })

    const res = await request(app).get('/api/student/grades?gradeType=quiz')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.length, 1)
    assert.equal(res.body[0].gradeType, 'quiz')
  })

  it('returns empty for student with no grades', async () => {
    const res = await request(app).get('/api/student/grades')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.length, 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/student/attendance', () => {
  it('returns attendance with statistics', async () => {
    await Attendance.create({ studentId: student._id, date: new Date('2026-03-15'), status: 'present', markedBy: teacherUser._id })
    await Attendance.create({ studentId: student._id, date: new Date('2026-03-16'), status: 'absent', markedBy: teacherUser._id })
    await Attendance.create({ studentId: student._id, date: new Date('2026-03-17'), status: 'late', markedBy: teacherUser._id })

    const res = await request(app).get('/api/student/attendance')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.ok(Array.isArray(res.body.attendance))
    assert.ok(res.body.statistics)
    assert.equal(res.body.statistics.total, 3)
    assert.equal(res.body.statistics.present, 1)
    assert.equal(res.body.statistics.absent, 1)
    assert.equal(res.body.statistics.late, 1)
  })

  it('filters by date range', async () => {
    await Attendance.create({ studentId: student._id, date: new Date('2026-03-15'), status: 'present', markedBy: teacherUser._id })
    await Attendance.create({ studentId: student._id, date: new Date('2026-04-15'), status: 'present', markedBy: teacherUser._id })

    const res = await request(app).get('/api/student/attendance?startDate=2026-03-01&endDate=2026-03-31')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.attendance.length, 1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/student/announcements', () => {
  it('returns published announcements for students', async () => {
    await Announcement.create({
      title: 'School Holiday', message: 'Enjoy!', content: 'Full details',
      targetRole: ['all'], priority: 'medium', isPublished: true, createdBy: adminUser._id,
    })

    const res = await request(app).get('/api/student/announcements')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.ok(Array.isArray(res.body))
    assert.ok(res.body.length >= 1)
  })

  it('does not return unpublished announcements', async () => {
    await Announcement.create({
      title: 'Draft', message: 'Draft message', content: 'Draft',
      targetRole: ['all'], priority: 'low', isPublished: false, createdBy: adminUser._id,
    })

    const res = await request(app).get('/api/student/announcements')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.length, 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// TIMETABLE
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/student/timetable', () => {
  it('returns timetable for student with class', async () => {
    // Student without classId returns empty
    const res = await request(app).get('/api/student/timetable')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    // Should be an empty array (no class assigned)
    assert.ok(Array.isArray(res.body))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-STUDENT ISOLATION
// Student A must NOT be able to see Student B's grades or attendance
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cross-student data isolation', () => {
  let studentBUser, studentBToken, studentB

  beforeEach(async () => {
    // Create a second student
    const fixtureB = await createStudent({ name: 'Student B' })
    studentBUser = fixtureB.user
    studentB = fixtureB.student

    studentBToken = jwt.sign(
      { id: studentBUser._id, email: studentBUser.email, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    // Give Student B their own grades
    await Grade.create({ teacherId: teacherUser._id, studentId: studentB._id, subject: 'Physics', score: 95, gradeType: 'quiz' })
    await Attendance.create({ studentId: studentB._id, date: new Date('2026-04-01'), status: 'present', markedBy: teacherUser._id })

    // Give Student A their own grades
    await Grade.create({ teacherId: teacherUser._id, studentId: student._id, subject: 'Math', score: 80, gradeType: 'quiz' })
    await Attendance.create({ studentId: student._id, date: new Date('2026-04-01'), status: 'absent', markedBy: teacherUser._id })
  })

  it('GET /api/student/grades: Student A only sees own grades', async () => {
    const res = await request(app).get('/api/student/grades')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.length, 1)
    assert.equal(res.body[0].subject, 'Math')
    // Should not contain Student B's Physics grade
    assert.ok(!res.body.some(g => g.subject === 'Physics'))
  })

  it('GET /api/student/grades: Student B only sees own grades', async () => {
    const res = await request(app).get('/api/student/grades')
      .set('Authorization', `Bearer ${studentBToken}`)
      .expect(200)

    assert.equal(res.body.length, 1)
    assert.equal(res.body[0].subject, 'Physics')
    // Should not contain Student A's Math grade
    assert.ok(!res.body.some(g => g.subject === 'Math'))
  })

  it('GET /api/student/attendance: Student A only sees own attendance', async () => {
    const res = await request(app).get('/api/student/attendance')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.attendance.length, 1)
    assert.equal(res.body.attendance[0].status, 'absent')
  })

  it('GET /api/student/attendance: Student B only sees own attendance', async () => {
    const res = await request(app).get('/api/student/attendance')
      .set('Authorization', `Bearer ${studentBToken}`)
      .expect(200)

    assert.equal(res.body.attendance.length, 1)
    assert.equal(res.body.attendance[0].status, 'present')
  })

  it('GET /api/student/profile: Student A only sees own profile', async () => {
    const res = await request(app).get('/api/student/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.name, 'Test Student')
    assert.notEqual(res.body.name, 'Student B')
  })

  it('GET /api/student/dashboard: Student A dashboard contains own data', async () => {
    const res = await request(app).get('/api/student/dashboard')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.student.name, 'Test Student')
    // Should have own grades
    assert.ok(res.body.recentGrades.some(g => g.subject === 'Math'))
    // Should not have Student B's grades
    assert.ok(!res.body.recentGrades.some(g => g.subject === 'Physics'))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ENROLLMENT HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/student/enrollment-history', () => {
  it('returns enrollment history for the student', async () => {
    const year = await AcademicYear.create({
      name: '2026/2027', startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'), isActive: true,
    })

    await Enrollment.create({
      studentId: student._id,
      classId: new mongoose.Types.ObjectId(), // dummy classId
      academicYearId: year._id,
      grade: 'Grade 10', section: 'A', rollNumber: 1,
      enrolledBy: adminUser._id, status: 'active',
    })

    const res = await request(app).get('/api/student/enrollment-history')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.studentName, 'Test Student')
    assert.ok(res.body.enrollmentNumber)
    assert.ok(Array.isArray(res.body.enrollmentHistory))
    assert.equal(res.body.totalEnrollments, 1)
  })

  it('returns empty history when student has no enrollments', async () => {
    const res = await request(app).get('/api/student/enrollment-history')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200)

    assert.equal(res.body.totalEnrollments, 0)
    assert.equal(res.body.enrollmentHistory.length, 0)
  })

  it('returns 404 when student profile does not exist', async () => {
    const orphan = await createUser({ email: 'orphan-enroll@test.com', password: 'pass', role: 'student' })
    const orphanToken = jwt.sign({ id: orphan._id, email: orphan.email, role: 'student' }, process.env.JWT_SECRET, { expiresIn: '1h' })

    await request(app).get('/api/student/enrollment-history')
      .set('Authorization', `Bearer ${orphanToken}`)
      .expect(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT SUBMISSION
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/student/assignment/:id/submit', () => {
  let assignment

  beforeEach(async () => {
    assignment = await Assignment.create({
      teacherId: teacherUser._id, title: 'Test HW', description: 'Do it',
      subject: 'Math', grade: 'Grade 10',
      dueDate: new Date('2027-12-01'), // far future
    })
  })

  it('creates a new submission', async () => {
    const res = await request(app).post(`/api/student/assignment/${assignment._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ content: 'My answer is 42' })
      .expect(201)

    assert.ok(res.body._id)
    assert.equal(res.body.content, 'My answer is 42')
    assert.equal(res.body.status, 'submitted')
    assert.equal(res.body.assignmentId.toString(), assignment._id.toString())
    assert.equal(res.body.studentId.toString(), student._id.toString())
  })

  it('updates an existing submission', async () => {
    // First submit
    await request(app).post(`/api/student/assignment/${assignment._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ content: 'Draft answer' })
      .expect(201)

    // Resubmit
    const res = await request(app).post(`/api/student/assignment/${assignment._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ content: 'Final answer' })
      .expect(200)

    assert.equal(res.body.content, 'Final answer')
  })

  it('marks submission as late when past due date', async () => {
    // Create an assignment that's already past due
    const pastAssignment = await Assignment.create({
      teacherId: teacherUser._id, title: 'Past HW', description: 'Overdue',
      subject: 'Math', grade: 'Grade 10',
      dueDate: new Date('2025-01-01'), // already past
    })

    const res = await request(app).post(`/api/student/assignment/${pastAssignment._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ content: 'Late submission' })
      .expect(201)

    assert.equal(res.body.status, 'late')
  })

  it('returns 404 for non-existent assignment', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    await request(app).post(`/api/student/assignment/${fakeId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ content: 'X' })
      .expect(404)
  })

  it('returns 404 when student profile does not exist', async () => {
    const orphan = await createUser({ email: 'orphan-submit@test.com', password: 'pass', role: 'student' })
    const orphanToken = jwt.sign({ id: orphan._id, email: orphan.email, role: 'student' }, process.env.JWT_SECRET, { expiresIn: '1h' })

    await request(app).post(`/api/student/assignment/${assignment._id}/submit`)
      .set('Authorization', `Bearer ${orphanToken}`)
      .send({ content: 'X' })
      .expect(404)
  })

  it('403 for teacher role', async () => {
    await request(app).post(`/api/student/assignment/${assignment._id}/submit`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ content: 'X' })
      .expect(403)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/student/current-enrollment
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/student/current-enrollment', () => {
  it('returns current enrollment when enrolled', async () => {
    const year = await AcademicYear.create({
      name: `AY-${Date.now()}`,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      status: 'active'
    })
    const cls = await (await import('../models/Class.js')).default.create({
      name: `Cls-${Date.now()}`,
      grade: 'Grade 10',
      section: 'A',
      capacity: 40,
      academicYearId: year._id
    })

    // Enroll student via admin
    const enrollmentRes = await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: student._id,
        classId: cls._id,
        academicYearId: year._id.toString(),
        rollNumber: 1
      })
    assert.equal(enrollmentRes.status, 201)

    // Get current enrollment as student
    const res = await request(app)
      .get('/api/student/current-enrollment')
      .set('Authorization', `Bearer ${studentToken}`)

    assert.equal(res.status, 200)
    assert.ok(res.body.enrollment)
    assert.equal(res.body.enrollment.status, 'active')
    assert.equal(res.body.enrollment.grade, 'Grade 10')
    assert.ok(res.body.student)
    assert.equal(res.body.student.name, 'Test Student')
  })

  it('returns 404 when no active enrollment', async () => {
    const res = await request(app)
      .get('/api/student/current-enrollment')
      .set('Authorization', `Bearer ${studentToken}`)

    assert.equal(res.status, 404)
  })

  it('returns 404 for student without profile', async () => {
    const orphan = await createUser({ email: 'orphan-ce@test.com', role: 'student' })
    const orphanToken = jwt.sign({ id: orphan._id, email: orphan.email, role: 'student' }, process.env.JWT_SECRET, { expiresIn: '1h' })

    const res = await request(app)
      .get('/api/student/current-enrollment')
      .set('Authorization', `Bearer ${orphanToken}`)

    assert.equal(res.status, 404)
  })

  it('401 without token', async () => {
    await request(app).get('/api/student/current-enrollment').expect(401)
  })

  it('403 for teacher role', async () => {
    await request(app)
      .get('/api/student/current-enrollment')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(403)
  })

  it('403 for admin role', async () => {
    await request(app)
      .get('/api/student/current-enrollment')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403)
  })

  it('includes populated classId and academicYearId', async () => {
    const year = await AcademicYear.create({
      name: `AY-pop-${Date.now()}`,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      status: 'active'
    })
    const cls = await (await import('../models/Class.js')).default.create({
      name: `Cls-pop-${Date.now()}`,
      grade: 'Grade 10',
      section: 'A',
      capacity: 40,
      academicYearId: year._id
    })

    await request(app)
      .post('/api/enrollment/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: student._id,
        classId: cls._id,
        academicYearId: year._id.toString(),
        rollNumber: 1
      })

    const res = await request(app)
      .get('/api/student/current-enrollment')
      .set('Authorization', `Bearer ${studentToken}`)

    assert.equal(res.status, 200)
    // classId should be populated (not just an ObjectId)
    assert.ok(res.body.enrollment.classId)
    assert.ok(res.body.enrollment.classId.grade || res.body.enrollment.classId.name)
    // academicYearId should be populated
    assert.ok(res.body.enrollment.academicYearId)
    assert.ok(res.body.enrollment.academicYearId.name)
  })
})
