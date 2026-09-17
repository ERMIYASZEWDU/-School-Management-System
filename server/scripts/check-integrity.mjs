// Regression check: role Users and their role profiles must stay in sync,
// for every role that carries a profile collection.
//
// Catches the consistency bug family that made /admin/parents show an empty
// list, left parent logins with a 404-ing portal, and generally breaks
// portals while logins still work:
//   1. Users with a profile-carrying role but no profile
//      (parent → invisible in /admin/parents; student/teacher → portal 404s)
//   2. Profiles whose user is gone or whose role moved on (orphans)
//   3. Duplicate profiles for the same user
//   4. Required-field drift on profiles (missing/blank values)
//   5. Dangling cross-references:
//        students.parentIds → Parent profiles
//        parents.studentIds → Student profiles
//        teachers.assignedClassIds → Classes
//        students.classId → Classes
//
// Usage:
//   npm run check:integrity              # report only (CI gate)
//   npm run check:integrity -- --fix     # auto-repair what is safe, report the rest
//   npm run check:parents                # legacy alias — same script
//
// What --fix treats as SAFE (no information exists anywhere else in the DB
// that these operations discard, and they match what the app's own routes do):
//   - missing-profile (parent): create the profile from the User account
//     (name/email/phone) — only when the user has a phone (the model
//     requires it). Student/teacher profiles need business data
//     (enrollment number, employee ID, guardian, DOB…) that cannot be
//     invented → manual review.
//   - orphan-profile: delete the profile (its user is gone or changed role —
//     the same cleanup the role-switch/delete routes perform).
//   - dangling links/refs: remove the stale id (its target no longer exists).
//   - profile-missing-field: fill from the linked User when it has the value.
// What --fix NEVER touches (reported for manual review):
//   - duplicate profiles (which one to keep is a business decision)
//   - missing fields that no User record can supply
//
// Exit code 0 = consistent (or fully repaired); 1 = problems found or
// manual-review items remain. CI-ready either way.

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User.js'
import Parent from '../models/Parent.js'
import Student from '../models/Student.js'
import Teacher from '../models/Teacher.js'
import Class from '../models/Class.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load server/.env regardless of the caller's working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management'
const FIX = process.argv.includes('--fix')

// Per-role profile config: the model, the fields that must be non-blank, and
// any reference arrays that must point at existing documents.
const ROLE_CONFIG = {
  parent: {
    model: Parent,
    label: 'Parent',
    requiredFields: ['name', 'phone', 'email'],
    // Fields --fix may copy from the linked User when blank on the profile
    userFillable: ['name', 'email', 'phone'],
    refChecks: [] // parent↔student links are cross-checked below
  },
  student: {
    model: Student,
    label: 'Student',
    requiredFields: ['name', 'enrollmentNumber', 'grade', 'section', 'guardianName', 'guardianPhone', 'address'],
    userFillable: ['name'],
    refChecks: [
      { field: 'classId', ref: 'Class', label: 'class', many: false }
    ]
  },
  teacher: {
    model: Teacher,
    label: 'Teacher',
    requiredFields: ['name', 'employeeId', 'phone', 'email'],
    userFillable: ['name', 'email', 'phone'],
    refChecks: [
      { field: 'assignedClassIds', ref: 'Class', label: 'assigned class', many: true }
    ]
  }
}

const problems = [] // { kind, role?, detail, fixable, ...context }
const fixed = []

try {
  await mongoose.connect(MONGO)
  console.log(`Connected to ${mongoose.connection.name}${FIX ? '  (--fix mode)' : ''}`)

  const users = await User.find({ role: { $in: Object.keys(ROLE_CONFIG) } })
    .select('_id email name role phone')
    .lean()
  const userById = new Map(users.map((u) => [u._id.toString(), u]))

  // Generic user↔profile sync per role
  const profileIdsByRole = {}
  for (const [role, cfg] of Object.entries(ROLE_CONFIG)) {
    const roleUsers = users.filter((u) => u.role === role)
    const profiles = await cfg.model.find({}).lean()
    profileIdsByRole[role] = new Set(profiles.map((p) => p._id.toString()))

    console.log(`${role} Users: ${roleUsers.length} | ${cfg.label} profiles: ${profiles.length}`)

    const byUser = new Map()
    for (const p of profiles) {
      const key = p.userId?.toString()
      if (!key) {
        problems.push({ kind: 'profile-no-user-ref', detail: `${cfg.label} profile ${p._id} has no userId at all`, fixable: false, role, profileId: p._id })
        continue
      }
      if (!byUser.has(key)) byUser.set(key, [])
      byUser.get(key).push(p)
    }

    // 1. user without a profile
    for (const u of roleUsers) {
      if (!byUser.has(u._id.toString())) {
        const canCreate = role === 'parent' && u.phone && String(u.phone).trim()
        problems.push({
          kind: 'missing-profile',
          detail: `User ${u.email} (${u._id}) has role '${role}' but no ${cfg.label} profile — their portal will 404`,
          fixable: canCreate,
          role,
          user: u,
          noDataReason: canCreate ? null : (role === 'parent' ? 'user has no phone (required by the Parent model)' : `${role} profiles need business data (enrollment/employee ID, dates, guardian) that cannot be derived from the User`)
        })
      }
    }

    // 2. orphans + 3. duplicates
    const roleUserIds = new Set(roleUsers.map((u) => u._id.toString()))
    for (const [uid, list] of byUser) {
      if (!roleUserIds.has(uid)) {
        for (const p of list) {
          problems.push({
            kind: 'orphan-profile',
            detail: `${cfg.label} profile ${p._id} (${p.name || p.email || 'no name'}) points at user ${uid} which does not exist or has a different role`,
            fixable: true,
            role,
            profileId: p._id
          })
        }
      }
      if (list.length > 1) {
        for (const p of list) {
          problems.push({
            kind: 'duplicate-profile',
            detail: `User ${uid} has ${list.length} ${cfg.label} profiles (e.g. ${p._id})`,
            fixable: false,
            role,
            userId: uid,
            hint: 'decide which profile to keep (usually the one with linked students/classes) and merge the rest'
          })
        }
      }
    }

    // 4. required-field drift
    for (const p of profiles) {
      for (const field of cfg.requiredFields) {
        if (p[field] === undefined || p[field] === null || !String(p[field]).trim()) {
          const u = userById.get(p.userId?.toString())
          const canFill = cfg.userFillable.includes(field) && u && u[field] && String(u[field]).trim()
          problems.push({
            kind: 'profile-missing-field',
            detail: `${cfg.label} profile ${p._id} (${p.name || p.email || 'unknown'}) is missing '${field}'`,
            fixable: canFill,
            role,
            profileId: p._id,
            field,
            value: canFill ? u[field] : null,
            noDataReason: canFill ? null : `no User record supplies '${field}'`
          })
        }
      }
    }

    // 5a. dangling single/array references on the profile
    for (const ref of cfg.refChecks) {
      const refModel = { Class }[ref.ref]
      for (const p of profiles) {
        const ids = ref.many ? (p[ref.field] || []) : (p[ref.field] ? [p[ref.field]] : [])
        for (const id of ids) {
          if (id && !(await refModel.exists({ _id: id }))) {
            problems.push({
              kind: 'dangling-profile-ref',
              detail: `${cfg.label} profile ${p._id} (${p.name || 'unknown'}) references missing ${ref.ref} ${id} in '${ref.field}'`,
              fixable: true,
              role,
              profileId: p._id,
              field: ref.field,
              staleId: id,
              many: ref.many
            })
          }
        }
      }
    }
  }

  // 5b. cross-role link checks (parent ↔ student)
  const students = await Student.find({}).select('_id name parentIds classId enrollmentNumber').lean()
  for (const s of students) {
    for (const pid of s.parentIds || []) {
      if (!profileIdsByRole.parent.has(pid.toString())) {
        problems.push({
          kind: 'dangling-student-link',
          detail: `Student ${s.name || s._id} references missing Parent profile ${pid}`,
          fixable: true,
          studentId: s._id,
          staleId: pid
        })
      }
    }
  }
  const parents = await Parent.find({}).select('_id name studentIds email').lean()
  for (const p of parents) {
    for (const sid of p.studentIds || []) {
      if (!profileIdsByRole.student.has(sid.toString())) {
        problems.push({
          kind: 'dangling-parent-link',
          detail: `Parent profile ${p._id} (${p.name || p.email || 'unknown'}) references missing Student profile ${sid}`,
          fixable: true,
          role: 'parent',
          profileId: p._id,
          staleId: sid
        })
      }
    }
  }

  // ── Fix phase ─────────────────────────────────────────────────────────────
  if (FIX) {
    for (const prob of problems) {
      if (!prob.fixable) continue
      try {
        switch (prob.kind) {
          case 'missing-profile': {
            const u = prob.user
            const created = await Parent.create({
              userId: u._id,
              name: u.name || u.email,
              email: u.email,
              phone: u.phone,
              studentIds: []
            })
            fixed.push(`created Parent profile ${created._id} for user ${u.email}`)
            break
          }
          case 'orphan-profile': {
            await ROLE_CONFIG[prob.role].model.findByIdAndDelete(prob.profileId)
            fixed.push(`deleted orphan ${ROLE_CONFIG[prob.role].label} profile ${prob.profileId}`)
            break
          }
          case 'profile-missing-field': {
            const update = { $set: { [prob.field]: prob.value } }
            await ROLE_CONFIG[prob.role].model.findByIdAndUpdate(prob.profileId, update)
            fixed.push(`filled '${prob.field}' on ${ROLE_CONFIG[prob.role].label} profile ${prob.profileId} from the User record`)
            break
          }
          case 'dangling-profile-ref': {
            const model = ROLE_CONFIG[prob.role].model
            if (prob.many) {
              await model.findByIdAndUpdate(prob.profileId, { $pull: { [prob.field]: prob.staleId } })
            } else {
              await model.findByIdAndUpdate(prob.profileId, { $set: { [prob.field]: null } })
            }
            fixed.push(`removed stale ${prob.field} reference ${prob.staleId} on ${ROLE_CONFIG[prob.role].label} profile ${prob.profileId}`)
            break
          }
          case 'dangling-student-link': {
            await Student.findByIdAndUpdate(prob.studentId, { $pull: { parentIds: prob.staleId } })
            fixed.push(`removed stale parentIds entry ${prob.staleId} on student ${prob.studentId}`)
            break
          }
          case 'dangling-parent-link': {
            await Parent.findByIdAndUpdate(prob.profileId, { $pull: { studentIds: prob.staleId } })
            fixed.push(`removed stale studentIds entry ${prob.staleId} on Parent profile ${prob.profileId}`)
            break
          }
        }
      } catch (err) {
        prob.fixable = false
        prob.noDataReason = `auto-fix failed: ${err.message}`
        prob.fixFailed = true
      }
    }
    const remaining = problems.filter((p) => !p.fixable || p.fixFailed)
    problems.length = 0
    problems.push(...remaining)
  }

  // ── Report ────────────────────────────────────────────────────────────────
  if (FIX && fixed.length > 0) {
    console.log(`\n🔧 Auto-fixed ${fixed.length} problem(s):`)
    for (const f of fixed) console.log(`  ✔ ${f}`)
  }

  if (problems.length === 0) {
    console.log(FIX
      ? '\n✅ Integrity OK after repair — nothing left requiring manual review.'
      : '✅ Integrity OK — every role User has exactly one profile, no orphans, no missing fields, no dangling references.')
  } else {
    const manual = problems.filter((p) => !p.fixable)
    console.error(`\n❌ ${problems.length} integrity problem(s) remaining:\n`)
    const byKind = {}
    for (const p of problems) (byKind[p.kind] ||= []).push(p)
    for (const [kind, list] of Object.entries(byKind)) {
      console.error(`  ${kind} (${list.length}):`)
      for (const p of list) {
        console.error(`    - ${p.detail}`)
        if (FIX && !p.fixable && p.noDataReason) console.error(`      → manual: ${p.noDataReason}`)
        if (p.hint) console.error(`      → ${p.hint}`)
      }
      console.error('')
    }
    if (!FIX) {
      console.error('Run with --fix to auto-repair the safe ones:  npm run check:integrity -- --fix')
    }
  }
} catch (err) {
  console.error('Check failed to run:', err.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}

if (problems.length > 0) process.exitCode = 1
