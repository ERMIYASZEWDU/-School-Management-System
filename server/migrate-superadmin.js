/**
 * Migration: Convert superadmin users to admin
 *
 * Run against any environment:
 *   node server/migrate-superadmin.js                    # uses .env MONGODB_URI
 *   MONGODB_URI="mongodb+srv://..." node server/migrate-superadmin.js   # override
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Load .env from the server directory
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management'

// Inline schema — avoids importing models that may have already removed 'superadmin' from enum
const userSchema = new mongoose.Schema({}, { strict: false })
const User = mongoose.model('User', userSchema)

async function migrate() {
  console.log(`\n🔄 Connecting to MongoDB...`)
  console.log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`)
  await mongoose.connect(MONGODB_URI)
  console.log(`   ✅ Connected\n`)

  // Count superadmin users before migration
  const superadmins = await User.countDocuments({ role: 'superadmin' })
  console.log(`📋 Found ${superadmins} user(s) with role "superadmin"`)

  if (superadmins === 0) {
    console.log(`\n✅ Nothing to migrate. All users already have valid roles.`)
    await mongoose.disconnect()
    process.exit(0)
  }

  // Show which users will be affected (without passwords)
  const users = await User.find({ role: 'superadmin' })
    .select('email name role createdAt')
    .lean()

  console.log(`\nUsers to migrate:\n`)
  for (const u of users) {
    console.log(`   • ${u.name} (${u.email}) — created ${u.createdAt}`)
  }

  // Perform migration
  const result = await User.updateMany(
    { role: 'superadmin' },
    { $set: { role: 'admin' } }
  )

  console.log(`\n✅ Migration complete. ${result.modifiedCount} user(s) updated from "superadmin" to "admin".`)

  await mongoose.disconnect()
  process.exit(0)
}

migrate().catch((err) => {
  console.error('\n❌ Migration failed:', err.message)
  process.exit(1)
})
