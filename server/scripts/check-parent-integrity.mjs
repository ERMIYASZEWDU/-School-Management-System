// Regression check: parent Users and Parent profiles must stay in sync.
//
// Catches the consistency bugs that made /admin/parents show an empty list
// and left parent logins without a working parent portal:
//   1. Users with role 'parent' that have no Parent profile
//      (invisible in /admin/parents; portal 404s "Parent profile not found")
//   2. Parent profiles whose user is gone or no longer role 'parent' (orphans)
//   3. Duplicate Parent profiles for the same user
//   4. Dangling parentIds on students (pointing at deleted Parent profiles)
//   5. Parent profiles required-field drift (missing/blank name/phone/email)
//
// Usage:
//   node server/scripts/check-parent-integrity.mjs            # from smart-sms/
//   npm run check:parents                                     # from smart-sms/
//
// Exit code 0 = all consistent; 1 = problems found (CI-ready).

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User.js'
import Parent from '../models/Parent.js'
import Student from '../models/Student.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load server/.env regardless of the caller's working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management'

const problems = []
const add = (kind, detail) => problems.push({ kind, detail })

try {
  await mongoose.connect(MONGO)
  console.log(`Connected to ${mongoose.connection.name}`)

  const [users, profiles] = await Promise.all([
    User.find({ role: 'parent' }).select('_id email name').lean(),
    Parent.find({}).select('_id userId name phone email studentIds').lean()
  ])

  console.log(`parent Users: ${users.length} | Parent profiles: ${profiles.length}`)

  const byUser = new Map()
  for (const p of profiles) {
    if (!byUser.has(p.userId?.toString())) byUser.set(p.userId?.toString(), [])
    byUser.get(p.userId?.toString()).push(p)
  }

  // 1. parent User without a Parent profile
  for (const u of users) {
    if (!byUser.has(u._id.toString())) {
      add('missing-profile', `User ${u.email} (${u._id}) has role 'parent' but no Parent profile — invisible in /admin/parents, parent portal will 404`)
    }
  }

  // 2. orphan profiles + 3. duplicates
  const userIds = new Set(users.map((u) => u._id.toString()))
  for (const [uid, list] of byUser) {
    if (!userIds.has(uid)) {
      for (const p of list) {
        add('orphan-profile', `Parent profile ${p._id} (${p.email || 'no email'}) points at user ${uid} which does not exist or is not a parent`)
      }
    }
    if (list.length > 1) {
      for (const p of list) {
        add('duplicate-profile', `User ${uid} has ${list.length} Parent profiles (e.g. ${p._id})`)
      }
    }
  }

  // 4. dangling parentIds on students
  const profileIds = new Set(profiles.map((p) => p._id.toString()))
  const students = await Student.find({ parentIds: { $exists: true, $ne: [] } })
    .select('_id name parentIds')
    .lean()
  for (const s of students) {
    for (const pid of s.parentIds || []) {
      if (!profileIds.has(pid.toString())) {
        add('dangling-student-link', `Student ${s.name || s._id} references missing Parent profile ${pid}`)
      }
    }
  }

  // 5. required-field drift on profiles
  for (const p of profiles) {
    for (const field of ['name', 'phone', 'email']) {
      if (!p[field] || !String(p[field]).trim()) {
        add('profile-missing-field', `Parent profile ${p._id} (${p.email || p.name || 'unknown'}) is missing '${field}'`)
      }
    }
  }

  // Report
  if (problems.length === 0) {
    console.log('✅ Parent integrity OK — every parent User has exactly one Parent profile, no orphans, no dangling student links.')
  } else {
    console.error(`\n❌ Found ${problems.length} integrity problem(s):\n`)
    const byKind = {}
    for (const p of problems) (byKind[p.kind] ||= []).push(p.detail)
    for (const [kind, list] of Object.entries(byKind)) {
      console.error(`  ${kind} (${list.length}):`)
      for (const d of list) console.error(`    - ${d}`)
      console.error('')
    }
    console.error('Fix: for missing-profile, create the profile (or fix the user role); for orphan-profile, delete the profile or restore the user role.')
  }
} catch (err) {
  console.error('Check failed to run:', err.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}

if (problems.length > 0) process.exitCode = 1
