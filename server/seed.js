import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { pathToFileURL } from 'url'
import User from './models/User.js'
import Student from './models/Student.js'
import Teacher from './models/Teacher.js'
import Parent from './models/Parent.js'
import Class from './models/Class.js'
import Subject from './models/Subject.js'
import AcademicYear from './models/AcademicYear.js'
import Enrollment from './models/Enrollment.js'
import Term from './models/Term.js'
import Grade from './models/Grade.js'
import Attendance from './models/Attendance.js'
import Assignment from './models/Assignment.js'
import AssignmentSubmission from './models/AssignmentSubmission.js'
import Announcement from './models/Announcement.js'
import Notification from './models/Notification.js'
import AuditLog from './models/AuditLog.js'
import Timetable from './models/Timetable.js'
import Promotion from './models/Promotion.js'
import Transfer from './models/Transfer.js'
import ReportCard from './models/ReportCard.js'

dotenv.config()

export const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management')
    console.log('✅ Connected to MongoDB')

    console.log('🗑️  Clearing existing data...')
    // Clear existing data for clean start
    await User.deleteMany({})
    await Student.deleteMany({})
    await Teacher.deleteMany({})
    await Parent.deleteMany({})
    await Class.deleteMany({})
    await Subject.deleteMany({})
    await AcademicYear.deleteMany({})
    await Term.deleteMany({})
    await Enrollment.deleteMany({})
    await Grade.deleteMany({})
    await Attendance.deleteMany({})
    await Assignment.deleteMany({})
    await AssignmentSubmission.deleteMany({})
    await Announcement.deleteMany({})
    await Notification.deleteMany({})
    await AuditLog.deleteMany({})
    await Timetable.deleteMany({})
    await Promotion.deleteMany({})
    await Transfer.deleteMany({})
    await ReportCard.deleteMany({})
    console.log('✅ Existing data cleared')

    // Step 1: Create the active academic year (Class now requires academicYearId)
    console.log('\n📅 Creating Academic Year...')
    const academicYearDoc = new AcademicYear({
      name: '2025-2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-30'),
      isActive: true,
      description: '2025-2026 Academic Year'
    })
    await academicYearDoc.save()
    console.log('✅ Created Academic Year: 2025-2026 (active)')

    // Step 2: Create Admin
    console.log('\n👤 Creating Admin...')
    const adminUser = new User({
      email: 'admin@smartsms.et',
      password: 'Admin@123',
      name: 'System Administrator',
      role: 'admin'
    })
    await adminUser.save()
    console.log('✅ Created Admin: admin@smartsms.et / Admin@123')

    // Step 2: Create Classes
    console.log('\n🏫 Creating Classes...')
    const classesData = [
      { name: 'Grade 10-A', grade: 'Grade 10', section: 'A', capacity: 40, room: '101' },
      { name: 'Grade 10-B', grade: 'Grade 10', section: 'B', capacity: 40, room: '102' },
      { name: 'Grade 11-A', grade: 'Grade 11', section: 'A', capacity: 40, room: '201' },
      { name: 'Grade 11-B', grade: 'Grade 11', section: 'B', capacity: 40, room: '202' },
      { name: 'Grade 12-A', grade: 'Grade 12', section: 'A', capacity: 40, room: '301' }
    ]

    const createdClasses = []
    for (const classData of classesData) {
      const newClass = new Class({
        ...classData,
        academicYearId: academicYearDoc._id,
        isActive: true
      })
      await newClass.save()
      createdClasses.push(newClass)
      console.log(`✅ Created: ${classData.name}`)
    }

    // Step 3: Create Subjects
    console.log('\n📚 Creating Subjects...')
    const subjectsData = [
      { name: 'Mathematics', code: 'MATH101', grade: 'Grade 10', credits: 4 },
      { name: 'English', code: 'ENG101', grade: 'Grade 10', credits: 3 },
      { name: 'Physics', code: 'PHY101', grade: 'Grade 11', credits: 4 },
      { name: 'Chemistry', code: 'CHEM101', grade: 'Grade 11', credits: 4 },
      { name: 'Biology', code: 'BIO101', grade: 'Grade 12', credits: 4 }
    ]

    const createdSubjects = []
    for (const subjectData of subjectsData) {
      const newSubject = new Subject({
        ...subjectData,
        isActive: true
      })
      await newSubject.save()
      createdSubjects.push(newSubject)
      console.log(`✅ Created: ${subjectData.name} (${subjectData.code})`)
    }

    // Step 4: Create Teachers
    console.log('\n👨‍🏫 Creating Teachers...')
    
    // Teacher 1 - Grade 10 (A&B)
    const teacher1User = new User({
      email: 'teacher1@smartsms.et',
      password: 'Teacher@123',
      name: 'Ato Mulugeta Haile',
      role: 'teacher',
      phone: '+251-91-111-2222'
    })
    await teacher1User.save()

    const teacher1Profile = new Teacher({
      userId: teacher1User._id,
      name: 'Ato Mulugeta Haile',
      employeeId: 'TEA001',
      phone: '+251-91-111-2222',
      email: 'teacher1@smartsms.et',
      department: 'Mathematics',
      qualification: 'M.Sc. in Mathematics',
      assignedClassIds: [createdClasses[0]._id, createdClasses[1]._id], // Grade 10-A, 10-B
      assignedSubjectIds: [createdSubjects[0]._id], // Mathematics
      status: 'active'
    })
    await teacher1Profile.save()

    // Update classes with teacher
    await Class.findByIdAndUpdate(createdClasses[0]._id, { teacherId: teacher1User._id })
    await Class.findByIdAndUpdate(createdClasses[1]._id, { teacherId: teacher1User._id })
    
    console.log('✅ Created: Ato Mulugeta Haile (Grade 10-A, 10-B - Mathematics)')

    // Teacher 2 - Grade 11 (A&B)
    const teacher2User = new User({
      email: 'teacher2@smartsms.et',
      password: 'Teacher@123',
      name: 'W/ro Almaz Tadesse',
      role: 'teacher',
      phone: '+251-92-222-3333'
    })
    await teacher2User.save()

    const teacher2Profile = new Teacher({
      userId: teacher2User._id,
      name: 'W/ro Almaz Tadesse',
      employeeId: 'TEA002',
      phone: '+251-92-222-3333',
      email: 'teacher2@smartsms.et',
      department: 'Science',
      qualification: 'M.Sc. in Physics',
      assignedClassIds: [createdClasses[2]._id, createdClasses[3]._id], // Grade 11-A, 11-B
      assignedSubjectIds: [createdSubjects[2]._id, createdSubjects[3]._id], // Physics, Chemistry
      status: 'active'
    })
    await teacher2Profile.save()

    await Class.findByIdAndUpdate(createdClasses[2]._id, { teacherId: teacher2User._id })
    await Class.findByIdAndUpdate(createdClasses[3]._id, { teacherId: teacher2User._id })

    console.log('✅ Created: W/ro Almaz Tadesse (Grade 11-A, 11-B - Physics, Chemistry)')

    // Step 5: Create Students
    console.log('\n👨‍🎓 Creating Students...')
    // Step 5: Create Students
    console.log('\n👨‍🎓 Creating Students...')
    
    const students = [
      { name: 'Abebe Kebede', enrollmentNumber: 'ST-2026-001', email: 'student1@smartsms.et', grade: 'Grade 10', section: 'A', rollNumber: 1, classId: createdClasses[0]._id, guardianName: 'Ato Kebede Worku', guardianPhone: '+251-91-123-4567', dateOfBirth: new Date('2010-03-15'), gpa: 3.8, attendance: 95 },
      { name: 'Tigist Worku', enrollmentNumber: 'ST-2026-002', email: 'student2@smartsms.et', grade: 'Grade 10', section: 'A', rollNumber: 2, classId: createdClasses[0]._id, guardianName: 'Ato Worku Tesfaye', guardianPhone: '+251-92-234-5678', dateOfBirth: new Date('2010-05-20'), gpa: 3.9, attendance: 97 },
      { name: 'Dawit Haile', enrollmentNumber: 'ST-2026-003', email: 'student3@smartsms.et', grade: 'Grade 10', section: 'B', rollNumber: 3, classId: createdClasses[1]._id, guardianName: 'W/ro Almaz Haile', guardianPhone: '+251-93-345-6789', dateOfBirth: new Date('2010-07-10'), gpa: 3.6, attendance: 92 },
      { name: 'Marta Gebreyesus', enrollmentNumber: 'ST-2026-004', email: 'student4@smartsms.et', grade: 'Grade 11', section: 'A', rollNumber: 4, classId: createdClasses[2]._id, guardianName: 'W/ro Worknesh Tadesse', guardianPhone: '+251-94-456-7890', dateOfBirth: new Date('2009-02-14'), gpa: 3.95, attendance: 98 },
      { name: 'Yohannes Tesfaye', enrollmentNumber: 'ST-2026-005', email: 'student5@smartsms.et', grade: 'Grade 11', section: 'A', rollNumber: 5, classId: createdClasses[2]._id, guardianName: 'Ato Tesfaye Solomon', guardianPhone: '+251-95-567-8901', dateOfBirth: new Date('2009-11-25'), gpa: 3.7, attendance: 94 }
    ]

    const createdStudents = []
    for (const studentData of students) {
      // Create user account
      const studentUser = new User({
        email: studentData.email,
        password: 'Student@123',
        name: studentData.name,
        role: 'student'
      })
      await studentUser.save()

      // Create student profile
      const student = new Student({
        userId: studentUser._id,
        name: studentData.name,
        enrollmentNumber: studentData.enrollmentNumber,
        grade: studentData.grade,
        section: studentData.section,
        rollNumber: studentData.rollNumber,
        classId: studentData.classId,
        dateOfBirth: studentData.dateOfBirth,
        guardianName: studentData.guardianName,
        guardianPhone: studentData.guardianPhone,
        address: 'Addis Ababa, Ethiopia',
        gpa: studentData.gpa,
        attendance: studentData.attendance,
        status: 'active'
      })
      await student.save()
      createdStudents.push(student)
      console.log(`✅ Created: ${studentData.name} (${studentData.grade}-${studentData.section})`)
    }

    // Step 5b: Create Enrollment records
    console.log('\n📋 Creating Enrollment records...')
    for (let i = 0; i < createdStudents.length; i++) {
      const studentData = students[i]
      const student = createdStudents[i]
      
      const enrollment = new Enrollment({
        studentId: student._id,
        classId: studentData.classId,
        academicYearId: academicYearDoc._id,
        grade: studentData.grade,
        section: studentData.section,
        stream: parseInt(studentData.grade.replace('Grade ', '')) >= 11 ? 'Natural Science' : null,
        enrollmentDate: new Date('2025-09-01'),
        enrollmentNumber: studentData.enrollmentNumber,
        rollNumber: studentData.rollNumber,
        status: 'active',
        enrolledBy: adminUser._id
      })
      await enrollment.save()
      console.log(`✅ Enrolled: ${studentData.name} → ${studentData.grade}-${studentData.section}`)
    }

    // Step 6: Create Parents
    console.log('\n👨‍👩‍👧‍👦 Creating Parents...')
    
    // Parent 1 - linked to students 1 and 2
    const parent1User = new User({
      email: 'parent1@smartsms.et',
      password: 'Parent@123',
      name: 'Ato Kebede Worku',
      role: 'parent',
      phone: '+251-91-111-0000'
    })
    await parent1User.save()

    const parent1 = new Parent({
      userId: parent1User._id,
      name: 'Ato Kebede Worku',
      email: 'parent1@smartsms.et',
      phone: '+251-91-111-0000',
      studentIds: [createdStudents[0]._id, createdStudents[1]._id],
      occupation: 'Business Owner',
      relationship: 'father'
    })
    await parent1.save()

    // Update students with parent
    await Student.findByIdAndUpdate(createdStudents[0]._id, { $push: { parentIds: parent1._id } })
    await Student.findByIdAndUpdate(createdStudents[1]._id, { $push: { parentIds: parent1._id } })

    console.log('✅ Created: Ato Kebede Worku (linked to Abebe and Tigist)')

    // Parent 2 - linked to student 4
    const parent2User = new User({
      email: 'parent2@smartsms.et',
      password: 'Parent@123',
      name: 'W/ro Worknesh Tadesse',
      role: 'parent',
      phone: '+251-92-222-0000'
    })
    await parent2User.save()

    const parent2 = new Parent({
      userId: parent2User._id,
      name: 'W/ro Worknesh Tadesse',
      email: 'parent2@smartsms.et',
      phone: '+251-92-222-0000',
      studentIds: [createdStudents[3]._id],
      occupation: 'Teacher',
      relationship: 'mother'
    })
    await parent2.save()

    await Student.findByIdAndUpdate(createdStudents[3]._id, { $push: { parentIds: parent2._id } })

    console.log('✅ Created: W/ro Worknesh Tadesse (linked to Marta)')

    // Step 7: Create Assignments so teacher/student/parent lists are populated.
    // classId set → only that class sees it; classId null + grade set → every
    // student with that grade string sees it (the student route matches either).
    console.log('\n📝 Creating Assignments...')
    const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    const assignmentsData = [
      // teacher1 — Mathematics for their assigned classes (Grade 10-A, 10-B)
      { teacher: teacher1User, title: 'Math Homework – Chapter 5: Algebraic Expressions', description: 'Solve exercises 5.1 to 5.15 from the textbook and show every step.', subject: 'Mathematics', grade: 'Grade 10', classId: createdClasses[0]._id, dueInDays: 7, maxScore: 20 },
      { teacher: teacher1User, title: 'Math Homework – Chapter 6: Linear Equations', description: 'Complete the word problems on linear equations (pages 88–90).', subject: 'Mathematics', grade: 'Grade 10', classId: createdClasses[0]._id, dueInDays: 10, maxScore: 20 },
      { teacher: teacher1User, title: 'Math Quiz 1 – Geometry Basics', description: 'Open-book quiz covering angles, triangles, and quadrilaterals.', subject: 'Mathematics', grade: 'Grade 10', classId: null, dueInDays: 5, maxScore: 15 },
      { teacher: teacher1User, title: 'Worksheet: Fractions Review', description: 'Review worksheet on fractions — the due date has passed; submit late work.', subject: 'Mathematics', grade: 'Grade 10', classId: null, dueInDays: -3, maxScore: 10 },
      { teacher: teacher1User, title: 'Math Project: Statistics in Daily Life', description: 'Collect data at home and present the mean, median, and mode with charts.', subject: 'Mathematics', grade: 'Grade 10', classId: createdClasses[0]._id, dueInDays: 21, maxScore: 30 },
      // teacher2 — Physics, so their lists are populated too
      { teacher: teacher2User, title: 'Physics Lab Report: Motion', description: 'Write the lab report for the motion experiment using the class template.', subject: 'Physics', grade: 'Grade 11', classId: createdClasses[2]._id, dueInDays: 9, maxScore: 25 },
      { teacher: teacher2User, title: 'Physics Problem Set: Forces', description: 'Solve problems 1–12 on Newton\'s laws at the end of chapter 3.', subject: 'Physics', grade: 'Grade 11', classId: null, dueInDays: 4, maxScore: 20 }
    ]

    const createdAssignments = []
    for (const a of assignmentsData) {
      const assignment = new Assignment({
        teacherId: a.teacher._id,
        title: a.title,
        description: a.description,
        subject: a.subject,
        grade: a.grade,
        classId: a.classId,
        academicYearId: academicYearDoc._id,
        dueDate: daysFromNow(a.dueInDays),
        maxScore: a.maxScore,
        isPublished: true
      })
      await assignment.save()
      createdAssignments.push(assignment)
      console.log(`✅ Assignment: ${a.title} (${a.subject}, ${a.grade})`)
    }

    // Step 8: Create assignment submissions so Submitted counts, student/parent
    // submission status, and the teacher grading view have realistic data.
    // teacher1's 5 Mathematics assignments (createdAssignments[0..4]):
    //   0: Ch5 Algebraic Expressions (10-A) — 2/3 submitted, 1 graded
    //   1: Ch6 Linear Equations (10-A)      — 2/3 submitted
    //   2: Math Quiz 1 (all Grade 10)       — 3/3 submitted, all graded
    //   3: Fractions Review (all Grade 10)  — 2/3 late submissions, 1 graded
    //   4: Statistics Project (10-A)        — none yet (future due date)
    // teacher2's Physics assignments (createdAssignments[5..6]):
    //   5: Physics Lab Report (11-A)        — 2/2 submitted, 1 graded
    //   6: Physics Problem Set (all Grade 11) — 2/2 submitted
    console.log('\n📥 Creating Assignment Submissions...')
    const submissionsData = [
      { assignment: createdAssignments[0], student: createdStudents[0], daysAgo: 3, content: 'Exercises 5.1–5.15 completed with step-by-step working.' },
      { assignment: createdAssignments[0], student: createdStudents[1], daysAgo: 4, content: 'All exercises solved; included extra practice on factorisation.' },
      { assignment: createdAssignments[1], student: createdStudents[0], daysAgo: 2, content: 'Word problems pages 88–90, both methods shown.' },
      { assignment: createdAssignments[1], student: createdStudents[2], daysAgo: 1, content: 'Pages 88–90 done; question 7 needs checking.' },
      { assignment: createdAssignments[2], student: createdStudents[0], daysAgo: 2, content: 'Quiz answers with angle diagrams.' },
      { assignment: createdAssignments[2], student: createdStudents[1], daysAgo: 2, content: 'Quiz complete — quadrilaterals section strongest.' },
      { assignment: createdAssignments[2], student: createdStudents[2], daysAgo: 1, content: 'Quiz answers attached.' },
      { assignment: createdAssignments[3], student: createdStudents[0], daysAgo: 1, content: 'Late submission — worksheet finished.', status: 'late' },
      { assignment: createdAssignments[3], student: createdStudents[1], daysAgo: 1, content: 'Fractions worksheet completed.', status: 'late' },
      { assignment: createdAssignments[5], student: createdStudents[3], daysAgo: 4, content: 'Motion lab report using the class template.' },
      { assignment: createdAssignments[5], student: createdStudents[4], daysAgo: 3, content: 'Lab report with graphs and error analysis.' },
      { assignment: createdAssignments[6], student: createdStudents[3], daysAgo: 2, content: 'Problems 1–12 solved.' },
      { assignment: createdAssignments[6], student: createdStudents[4], daysAgo: 2, content: 'Problems 1–12 done; used the textbook method.' }
    ]

    for (const s of submissionsData) {
      const submission = new AssignmentSubmission({
        assignmentId: s.assignment._id,
        studentId: s.student._id,
        submittedAt: daysFromNow(-s.daysAgo),
        content: s.content,
        status: s.status || 'submitted'
      })
      await submission.save()
      console.log(`✅ Submission: ${s.student.name} → ${s.assignment.title}`)
    }

    // Pre-grade several submissions so the Graded status appears for the
    // student, parent, and teacher without any manual action after seeding.
    const gradedData = [
      { assignment: createdAssignments[0], student: createdStudents[0], score: 18, feedback: 'Excellent working. Watch your signs in Q12.' },
      { assignment: createdAssignments[2], student: createdStudents[0], score: 14, feedback: 'Strong quiz. Review triangle properties.' },
      { assignment: createdAssignments[2], student: createdStudents[1], score: 15, feedback: 'Perfect score — great work!' },
      { assignment: createdAssignments[2], student: createdStudents[2], score: 11, feedback: 'Good effort. Revise quadrilaterals.' },
      { assignment: createdAssignments[3], student: createdStudents[1], score: 9, feedback: 'Late but complete and accurate.' },
      { assignment: createdAssignments[5], student: createdStudents[3], score: 23, feedback: 'Well-structured lab report.' }
    ]

    for (const g of gradedData) {
      const doc = await AssignmentSubmission.findOne({ assignmentId: g.assignment._id, studentId: g.student._id })
      if (!doc) continue
      doc.status = 'graded'
      doc.score = g.score
      doc.feedback = g.feedback
      doc.gradedBy = g.assignment.teacherId
      doc.gradedAt = daysFromNow(-1)
      await doc.save()
      console.log(`✅ Graded: ${g.student.name} scored ${g.score} on ${g.assignment.title}`)
    }

    // Step 9: Recent grades + attendance records so dashboards show real
    // trends instead of zeros. Deterministic patterns (no randomness) so
    // every re-seed produces the same demo story:
    //   - teacher1: ~85% avg in Mathematics for the 3 Grade 10 students,
    //     per-student arcs (Abebe strong, Dawit improving from weak)
    //   - teacher2: Physics grades for the 2 Grade 11 students
    //   - ~22 school days of attendance per student (~90% present),
    //     marked by each class's teacher so the teacher dashboard's
    //     monthly attendance chart has data
    console.log('\n📊 Creating Recent Grades & Attendance...')
    const daysAgoDate = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const gradesData = [
      // Abebe Kebede (Grade 10-A) — strong and improving
      { t: teacher1User, s: createdStudents[0], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'quiz', score: 12, max: 15, ago: 63, remarks: 'Good start; revise quadrilaterals.' },
      { t: teacher1User, s: createdStudents[0], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'classwork', score: 8, max: 10, ago: 56 },
      { t: teacher1User, s: createdStudents[0], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'assignment', score: 17, max: 20, ago: 49 },
      { t: teacher1User, s: createdStudents[0], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'quiz', score: 13, max: 15, ago: 42 },
      { t: teacher1User, s: createdStudents[0], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'classwork', score: 9, max: 10, ago: 35 },
      { t: teacher1User, s: createdStudents[0], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'midterm', score: 78, max: 100, ago: 28, remarks: 'Strong improvement this term.' },
      { t: teacher1User, s: createdStudents[0], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'quiz', score: 14, max: 15, ago: 14 },
      { t: teacher1User, s: createdStudents[0], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'classwork', score: 10, max: 10, ago: 7 },
      // Tigist Worku (Grade 10-A) — top of the class
      { t: teacher1User, s: createdStudents[1], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'quiz', score: 14, max: 15, ago: 63 },
      { t: teacher1User, s: createdStudents[1], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'classwork', score: 9, max: 10, ago: 49 },
      { t: teacher1User, s: createdStudents[1], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'midterm', score: 88, max: 100, ago: 28, remarks: 'Excellent, consistent work.' },
      { t: teacher1User, s: createdStudents[1], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'assignment', score: 19, max: 20, ago: 21 },
      { t: teacher1User, s: createdStudents[1], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'quiz', score: 15, max: 15, ago: 14, remarks: 'Perfect score.' },
      { t: teacher1User, s: createdStudents[1], subject: 'Mathematics', classId: createdClasses[0]._id, type: 'classwork', score: 10, max: 10, ago: 5 },
      // Dawit Haile (Grade 10-B) — improving from a weak start
      { t: teacher1User, s: createdStudents[2], subject: 'Mathematics', classId: createdClasses[1]._id, type: 'quiz', score: 10, max: 15, ago: 63 },
      { t: teacher1User, s: createdStudents[2], subject: 'Mathematics', classId: createdClasses[1]._id, type: 'classwork', score: 6, max: 10, ago: 49 },
      { t: teacher1User, s: createdStudents[2], subject: 'Mathematics', classId: createdClasses[1]._id, type: 'midterm', score: 65, max: 100, ago: 28, remarks: 'Show your working step by step.' },
      { t: teacher1User, s: createdStudents[2], subject: 'Mathematics', classId: createdClasses[1]._id, type: 'quiz', score: 11, max: 15, ago: 14 },
      { t: teacher1User, s: createdStudents[2], subject: 'Mathematics', classId: createdClasses[1]._id, type: 'classwork', score: 8, max: 10, ago: 7 },
      { t: teacher1User, s: createdStudents[2], subject: 'Mathematics', classId: createdClasses[1]._id, type: 'assignment', score: 16, max: 20, ago: 3, remarks: 'Clear progress since the midterm.' },
      // Marta Gebreyesus (Grade 11-A) — Physics, top student
      { t: teacher2User, s: createdStudents[3], subject: 'Physics', classId: createdClasses[2]._id, type: 'quiz', score: 22, max: 25, ago: 58 },
      { t: teacher2User, s: createdStudents[3], subject: 'Physics', classId: createdClasses[2]._id, type: 'classwork', score: 9, max: 10, ago: 44 },
      { t: teacher2User, s: createdStudents[3], subject: 'Physics', classId: createdClasses[2]._id, type: 'midterm', score: 91, max: 100, ago: 30, remarks: 'Outstanding understanding of mechanics.' },
      { t: teacher2User, s: createdStudents[3], subject: 'Physics', classId: createdClasses[2]._id, type: 'quiz', score: 24, max: 25, ago: 12 },
      { t: teacher2User, s: createdStudents[3], subject: 'Physics', classId: createdClasses[2]._id, type: 'classwork', score: 10, max: 10, ago: 5 },
      { t: teacher2User, s: createdStudents[3], subject: 'Physics', classId: createdClasses[2]._id, type: 'assignment', score: 28, max: 30, ago: 2 },
      // Yohannes Tesfaye (Grade 11-A) — Physics, solid but careless
      { t: teacher2User, s: createdStudents[4], subject: 'Physics', classId: createdClasses[2]._id, type: 'quiz', score: 18, max: 25, ago: 58 },
      { t: teacher2User, s: createdStudents[4], subject: 'Physics', classId: createdClasses[2]._id, type: 'classwork', score: 7, max: 10, ago: 44 },
      { t: teacher2User, s: createdStudents[4], subject: 'Physics', classId: createdClasses[2]._id, type: 'midterm', score: 72, max: 100, ago: 30, remarks: 'Understands concepts; avoid careless errors.' },
      { t: teacher2User, s: createdStudents[4], subject: 'Physics', classId: createdClasses[2]._id, type: 'quiz', score: 20, max: 25, ago: 12 },
      { t: teacher2User, s: createdStudents[4], subject: 'Physics', classId: createdClasses[2]._id, type: 'classwork', score: 8, max: 10, ago: 5 }
    ]

    for (const g of gradesData) {
      const grade = new Grade({
        studentId: g.s._id,
        teacherId: g.t._id,
        classId: g.classId,
        subject: g.subject,
        score: g.score,
        maxScore: g.max,
        gradeType: g.type,
        academicYearId: academicYearDoc._id,
        remarks: g.remarks || null,
        date: daysAgoDate(g.ago)
      })
      await grade.save()
    }
    console.log(`✅ Grades: ${gradesData.length} records across Mathematics and Physics`)

    // Attendance: the 22 most recent school days (Mon–Fri), one record per
    // student per day, marked by the class's teacher. Deterministic misses:
    // roughly 90% present with a few late/absent/excused per student.
    const schoolDays = []
    for (let d = 0; schoolDays.length < 22 && d < 40; d++) {
      const dt = daysAgoDate(d)
      const wd = dt.getDay()
      if (wd !== 0 && wd !== 6) schoolDays.push(dt)
    }

    const attendanceGroups = [
      { students: [createdStudents[0], createdStudents[1]], classId: createdClasses[0]._id, marker: teacher1User },
      { students: [createdStudents[2]], classId: createdClasses[1]._id, marker: teacher1User },
      { students: [createdStudents[3], createdStudents[4]], classId: createdClasses[2]._id, marker: teacher2User }
    ]

    const statusFor = (si, di) => {
      if ((di * 7 + si * 3) % 29 === 0) return 'absent'
      if ((di * 5 + si * 11) % 23 === 0) return 'late'
      if ((di + si) % 31 === 0) return 'excused'
      return 'present'
    }

    let attendanceCount = 0
    for (const group of attendanceGroups) {
      for (const student of group.students) {
        const si = group.students.indexOf(student)
        for (let di = 0; di < schoolDays.length; di++) {
          const attendance = new Attendance({
            studentId: student._id,
            classId: group.classId,
            date: schoolDays[di],
            status: statusFor(si, di),
            academicYearId: academicYearDoc._id,
            markedBy: group.marker._id
          })
          await attendance.save()
          attendanceCount++
        }
      }
    }
    console.log(`✅ Attendance: ${attendanceCount} records over the last 22 school days`)

    console.log('\n' + '='.repeat(60))
    console.log('🎉 SEED COMPLETED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log('\n📝 LOGIN CREDENTIALS:')
    console.log('\n👤 ADMIN:')
    console.log('   Email: admin@smartsms.et')
    console.log('   Password: Admin@123')
    console.log('   Access: Full system control')
    
    console.log('\n👨‍🏫 TEACHERS:')
    console.log('   Email: teacher1@smartsms.et')
    console.log('   Password: Teacher@123')
    console.log('   Assigned: Grade 10-A, 10-B (Mathematics)')
    console.log('   Should see: 3 students')
    
    console.log('\n   Email: teacher2@smartsms.et')
    console.log('   Password: Teacher@123')
    console.log('   Assigned: Grade 11-A, 11-B (Physics, Chemistry)')
    console.log('   Should see: 2 students')
    
    console.log('\n👨‍🎓 STUDENTS:')
    students.forEach((s, i) => {
      console.log(`   ${s.email} / Student@123 (${s.grade}-${s.section})`)
    })
    
    console.log('\n👨‍👩‍👧‍👦 PARENTS:')
    console.log('   parent1@smartsms.et / Parent@123 (2 children)')
    console.log('   parent2@smartsms.et / Parent@123 (1 child)')
    
    console.log('\n📊 SUMMARY:')
    console.log(`   Classes: ${createdClasses.length}`)
    console.log(`   Subjects: ${createdSubjects.length}`)
    console.log(`   Teachers: 2`)
    console.log(`   Students: ${createdStudents.length}`)
    console.log(`   Parents: 2`)
    
    console.log('\n✅ Next Steps:')
    console.log('   1. Start backend: cd server && npm start')
    console.log('   2. Start frontend: npm run dev')
    console.log('   3. Visit: http://localhost:5173')
    console.log('   4. Login and test the integration!')
    console.log('\n' + '='.repeat(60))
    
    return true
  } catch (error) {
    console.error('❌ Seed error:', error)
    throw error
  }
}

// Allow running directly: `node seed.js`
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) {
  seedUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
