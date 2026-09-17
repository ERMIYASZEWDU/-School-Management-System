import express from 'express'
import multer from 'multer'
import User from '../models/User.js'
import Student from '../models/Student.js'
import Teacher from '../models/Teacher.js'
import Parent from '../models/Parent.js'
import { verifyToken } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

// Configure multer for profile photo uploads.
// Photos are stored in MongoDB as base64 data URLs so they survive
// redeploys (Render's filesystem is ephemeral) and are served directly
// from the API — no static file storage or /uploads mount required.
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.'), false)
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

// Get current user's profile
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.id
  
  // Get user basic info
  const user = await User.findById(userId).select('-password -otpHash -resetToken').lean()
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  
  // Get role-specific profile data
  let roleProfile = null
  
  switch (user.role) {
    case 'student':
      roleProfile = await Student.findOne({ userId })
        .populate('classId', 'name grade section stream')
        .lean()
      break
    case 'teacher':
      roleProfile = await Teacher.findOne({ userId })
        .populate('assignedClassIds', 'name grade section')
        .populate('assignedSubjectIds', 'name')
        .lean()
      break
    case 'parent':
      roleProfile = await Parent.findOne({ userId })
        .populate('studentIds', 'name grade section')
        .lean()
      break
  }
  
  res.json({
    ...user,
    roleProfile
  })
}))

// Update current user's profile
router.put('/', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { name, phone } = req.body
  
  // Only allow updating certain fields
  const updateData = {}
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) {
    updateData.phone = phone
    // Normalize phone for consistency
    if (phone) {
      updateData.phoneNormalized = phone.replace(/[^\d+]/g, '')
    }
  }
  updateData.updatedAt = Date.now()
  
  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true }
  ).select('-password -otpHash -resetToken')
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  
  res.json(user)
}))

// Sniff the file's magic bytes so we never trust the client-declared MIME
// type alone — a malicious `.jpg` payload with HTML/script content is rejected
// even if multer's fileFilter (which only sees the declared type) passes it.
const detectImageType = (buffer) => {
  if (!buffer || buffer.length < 12) return null
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png'
  // WEBP: 'RIFF' .... 'WEBP'
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'image/webp'
  return null
}

// Upload/Update profile photo
router.post('/photo', verifyToken, upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' })
  }

  // Validate the actual bytes, not the declared content type
  const sniffedType = detectImageType(req.file.buffer)
  if (!sniffedType) {
    return res.status(400).json({ message: 'Invalid image file. Only JPG, PNG, and WEBP images are allowed.' })
  }

  const userId = req.user.id
  
  const user = await User.findById(userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  
  // Store the photo inline as a base64 data URL — works on any host and
  // survives redeploys (no reliance on the server's filesystem). The MIME
  // type comes from our own byte sniffing, never from the client.
  const photoUrl = `data:${sniffedType};base64,${req.file.buffer.toString('base64')}`
  
  user.profilePhoto = photoUrl
  user.updatedAt = Date.now()
  await user.save()
  
  res.json({
    message: 'Profile photo uploaded successfully',
    profilePhoto: photoUrl
  })
}))

// Delete profile photo
router.delete('/photo', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.id
  
  const user = await User.findById(userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  
  if (user.profilePhoto) {
    user.profilePhoto = null
    user.updatedAt = Date.now()
    await user.save()
  }
  
  res.json({ message: 'Profile photo removed successfully' })
}))

// Change password
router.put('/password', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { currentPassword, newPassword } = req.body
  
  // Validate input
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' })
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' })
  }
  
  // Get user with password
  const user = await User.findById(userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  
  // Verify current password
  const isMatch = await user.comparePassword(currentPassword)
  if (!isMatch) {
    return res.status(400).json({ message: 'Current password is incorrect' })
  }
  
  // Update password (will be hashed by pre-save hook)
  user.password = newPassword
  user.updatedAt = Date.now()
  await user.save()
  
  res.json({ message: 'Password changed successfully' })
}))

export default router
