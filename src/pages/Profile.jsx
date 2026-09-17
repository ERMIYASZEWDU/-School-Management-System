import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { User, Camera, Crop, Lock, Save, X, Upload, Trash2 } from 'lucide-react'
import { getProfile, updateProfile, uploadProfilePhoto, deleteProfilePhoto, changePassword } from '../services/profileApi'
import { resolvePhotoUrl } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { processPhoto } from '../utils/image'
import { PhotoCropEditor } from '../components/PhotoCropEditor'
import { CameraCapture } from '../components/CameraCapture'

export const Profile = () => {
  const { t } = useTranslation()
  const { user, setUser } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Profile form
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  })
  
  // Photo upload
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [cropImage, setCropImage] = useState(null) // object URL of the freshly picked photo, shown in the crop editor
  const [showCamera, setShowCamera] = useState(false) // live camera capture overlay

  // Mirrors the latest staged-photo object URLs so the unmount cleanup can
  // revoke them (a plain closure would capture the first-render nulls)
  const photoUrlsRef = useRef({ preview: null, crop: null })
  photoUrlsRef.current = { preview: photoPreview, crop: cropImage }
  
  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    fetchProfile()
    // Revoke any staged photo object URLs when leaving the page
    return () => {
      const { preview, crop } = photoUrlsRef.current
      if (preview) URL.revokeObjectURL(preview)
      if (crop) URL.revokeObjectURL(crop)
    }
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const data = await getProfile()
      setProfile(data)
      setFormData({
        name: data.name || '',
        phone: data.phone || ''
      })
      setError('')
    } catch (err) {
      setError(t('profile.failedToLoad', 'Failed to load profile'))
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    try {
      setSaving(true)
      const updated = await updateProfile(formData)
      setProfile({ ...profile, ...updated })
      
      // Update auth store with new name
      if (user) {
        setUser({ ...user, name: updated.name })
      }
      
      setSuccess(t('profile.updatedSuccessfully', 'Profile updated successfully!'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || t('profile.failedToUpdate', 'Failed to update profile'))
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Clear any previously staged photo so a rejected file can't be uploaded later
    setPhotoFile(null)
    setPhotoPreview(null)

    try {
      // Validate type and downscale large photos in the browser, then open
      // the crop editor so the user can frame their face before upload
      const resized = await processPhoto(file)
      // Drop any editor URL from a previous pick (or re-edit) so re-picking
      // can't leak object URLs or show a stale image
      if (cropImage) URL.revokeObjectURL(cropImage)
      setCropImage(URL.createObjectURL(resized))
      setError('')
    } catch (err) {
      setError(err.message || t('profile.badImage', 'Could not read this image. Please choose another photo (JPG, PNG, or WEBP).'))
    }
  }

  const handleCropCancel = () => {
    if (cropImage) URL.revokeObjectURL(cropImage)
    setCropImage(null)
  }

  const handleCropApply = (croppedFile) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(croppedFile)
    setPhotoPreview(URL.createObjectURL(croppedFile))
    if (cropImage) URL.revokeObjectURL(cropImage)
    setCropImage(null)
  }

  // A camera capture is just another photo source: run it through the same
  // validation/downscale and open the crop editor, so everything downstream
  // (crop → stage → upload) behaves identically to a picked file.
  const handleCameraCapture = async (file) => {
    setShowCamera(false)
    try {
      const resized = await processPhoto(file)
      if (cropImage) URL.revokeObjectURL(cropImage)
      setCropImage(URL.createObjectURL(resized))
      setError('')
    } catch (err) {
      setError(err.message || t('profile.badImage', 'Could not read this image. Please choose another photo (JPG, PNG, or WEBP).'))
    }
  }

  const handleReEdit = () => {
    if (!photoFile) return
    if (cropImage) URL.revokeObjectURL(cropImage)
    setCropImage(URL.createObjectURL(photoFile))
  }

  const handlePhotoUpload = async () => {
    if (!photoFile) return

    try {
      setUploadingPhoto(true)
      setError('')
      const result = await uploadProfilePhoto(photoFile)
      
      // Update profile with new photo
      setProfile({ ...profile, profilePhoto: result.profilePhoto })
      
      // Update auth store
      if (user) {
        setUser({ ...user, profilePhoto: result.profilePhoto })
      }
      
      setSuccess(t('profile.photoUpdated', 'Profile photo updated!'))
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPhotoFile(null)
      setPhotoPreview(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || t('profile.failedToUploadPhoto', 'Failed to upload photo'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handlePhotoDelete = async () => {
    if (!confirm(t('profile.removePhotoConfirm', 'Are you sure you want to remove your profile photo?'))) return

    try {
      setUploadingPhoto(true)
      await deleteProfilePhoto()
      
      setProfile({ ...profile, profilePhoto: null })
      
      // Update auth store
      if (user) {
        setUser({ ...user, profilePhoto: null })
      }
      
      setSuccess(t('profile.photoRemoved', 'Profile photo removed'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(t('profile.failedToRemovePhoto', 'Failed to remove photo'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError('')

    // Validate
    if (passwordData.newPassword.length < 6) {
      setPasswordError(t('profile.passwordTooShort', 'New password must be at least 6 characters'))
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(t('profile.passwordsDoNotMatch', 'New passwords do not match'))
      return
    }

    try {
      setSaving(true)
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      
      setSuccess(t('profile.passwordChanged', 'Password changed successfully!'))
      setShowPasswordModal(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setPasswordError(err.response?.data?.message || t('profile.failedToChangePassword', 'Failed to change password'))
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
      teacher: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      student: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      parent: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
    }
    return colors[role] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pt-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{t('profile.loading', 'Loading profile...')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <User size={36} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('profile.myProfile', 'My Profile')}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{t('profile.manageInfo', 'Manage your personal information and settings')}</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900/50 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Photo & Role */}
          <div className="space-y-6">
            {/* Profile Photo Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('profile.profilePhoto', 'Profile Photo')}</h3>
              
              <div className="flex flex-col items-center">
                {/* Avatar */}
                <div className="relative mb-4">
                  {photoPreview || profile?.profilePhoto ? (
                    <img
                      src={photoPreview || resolvePhotoUrl(profile.profilePhoto)}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-gray-200 dark:border-gray-700">
                      <span className="text-white text-3xl font-bold">
                        {getInitials(profile?.name)}
                      </span>
                    </div>
                  )}
                  
                  <label
                    htmlFor="photo-upload"
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition shadow-lg"
                  >
                    <Camera size={20} />
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    className="hidden dark:bg-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="absolute bottom-0 right-12 bg-gray-700 text-white p-2 rounded-full cursor-pointer hover:bg-gray-800 transition shadow-lg"
                    aria-label={t('profile.cameraTitle', 'Camera')}
                  >
                    <Camera size={20} />
                  </button>
                </div>

                {/* Photo Actions */}
                {photoPreview && (
                  <div className="flex gap-2 mb-4 flex-wrap justify-center">
                    <button
                      onClick={handleReEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      <Crop size={16} />
                      {t('profile.editPhoto', 'Edit')}
                    </button>
                    <button
                      onClick={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
                    >
                      <Upload size={16} />
                      {uploadingPhoto ? t('profile.uploading', 'Uploading...') : t('profile.upload', 'Upload')}
                    </button>
                    <button
                      onClick={() => {
                        if (photoPreview) URL.revokeObjectURL(photoPreview)
                        setPhotoFile(null)
                        setPhotoPreview(null)
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                  </div>
                )}

                {profile?.profilePhoto && !photoPreview && (
                  <button
                    onClick={handlePhotoDelete}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 transition text-sm font-medium disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    {t('profile.removePhoto', 'Remove Photo')}
                  </button>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  {t('profile.photoRequirements', 'JPG, PNG or WEBP. Max 5MB. You can crop and position your face after selecting a photo.')}
                </p>
              </div>
            </div>

            {/* Role Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('profile.accountType', 'Account Type')}</h3>
              <div className="flex items-center justify-center">
                <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${getRoleBadgeColor(profile?.role)}`}>
                  {String(t(`roles.${profile?.role}`, profile?.role?.toUpperCase()))}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('profile.personalInfo', 'Personal Information')}</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('profile.fullName', 'Full Name')} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('profile.email', 'Email')}
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300"
                    disabled
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('profile.emailCannotChange', 'Email cannot be changed')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('profile.phoneNumber', 'Phone Number')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251-91-234-5678"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Role-specific read-only info */}
                {profile?.roleProfile && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('profile.additionalInfo', 'Additional Information')}</h4>
                    
                    {profile.role === 'student' && profile.roleProfile && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{t('teacher.enrollmentNo', 'Enrollment Number')}:</span>
                          <span className="font-medium">{profile.roleProfile.enrollmentNumber}</span>
                        </div>
                        {profile.roleProfile.classId && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">{t('dashboards.class', 'Class')}:</span>
                            <span className="font-medium">{profile.roleProfile.classId.name}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{t('dashboards.grade', 'Grade')}:</span>
                          <span className="font-medium">{profile.roleProfile.grade}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{t('profile.section', 'Section')}:</span>
                          <span className="font-medium">{profile.roleProfile.section}</span>
                        </div>
                        {profile.roleProfile.stream && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">{t('profile.stream', 'Stream')}:</span>
                            <span className="font-medium capitalize">{profile.roleProfile.stream}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                          {t('profile.academicManagedByAdmin', 'Academic information is managed by the school administration')}
                        </p>
                      </div>
                    )}

                    {profile.role === 'teacher' && profile.roleProfile && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{t('profile.employeeId', 'Employee ID')}:</span>
                          <span className="font-medium">{profile.roleProfile.employeeId}</span>
                        </div>
                        {profile.roleProfile.assignedClassIds?.length > 0 && (
                          <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-300">{t('profile.assignedClasses', 'Assigned Classes')}:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {profile.roleProfile.assignedClassIds.map(cls => (
                                <span key={cls._id} className="inline-flex px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  {cls.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {profile.role === 'parent' && profile.roleProfile?.studentIds?.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-600 dark:text-gray-300">{t('dashboards.children', 'Children')}:</span>
                        <div className="mt-1 space-y-1">
                          {profile.roleProfile.studentIds.map(student => (
                            <div key={student._id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                              <span className="font-medium">{student.name}</span>
                              <span className="text-xs text-gray-600 dark:text-gray-300">{student.grade} - {student.section}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                >
                  <Save size={20} />
                  {saving ? t('profile.saving', 'Saving...') : t('profile.saveChanges', 'Save Changes')}
                </button>
              </form>
            </div>

            {/* Security Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('profile.security', 'Security')}</h3>
              
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-semibold"
              >
                <Lock size={20} />
                {t('profile.changePassword', 'Change Password')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('profile.changePassword', 'Change Password')}</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordError('')
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{passwordError}</p>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {t('profile.currentPassword', 'Current Password')} *
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {t('profile.newPassword', 'New Password')} *
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('profile.atLeast6', 'At least 6 characters')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {t('profile.confirmNewPassword', 'Confirm New Password')} *
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                >
                  {saving ? t('profile.changing', 'Changing...') : t('profile.changePassword', 'Change Password')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordError('')
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-semibold"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}

      <PhotoCropEditor
        isOpen={!!cropImage}
        imageSrc={cropImage}
        onCancel={handleCropCancel}
        onApply={handleCropApply}
      />
    </div>
  )
}
