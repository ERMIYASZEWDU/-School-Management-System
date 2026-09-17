import apiClient from '../utils/api'

// Get current user's profile
export const getProfile = async () => {
  const response = await apiClient.get('/api/profile')
  return response.data
}

// Update profile (name, phone)
export const updateProfile = async (data) => {
  const response = await apiClient.put('/api/profile', data)
  return response.data
}

// Upload profile photo with optional onProgress(percent) callback
export const uploadProfilePhoto = (file, onProgress) => {
  const formData = new FormData()
  formData.append('photo', file)

  return apiClient.post('/api/profile/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    }
  }).then((response) => response.data)
}

// Delete profile photo
export const deleteProfilePhoto = async () => {
  const response = await apiClient.delete('/api/profile/photo')
  return response.data
}

// Change password
export const changePassword = async (data) => {
  const response = await apiClient.put('/api/profile/password', data)
  return response.data
}
