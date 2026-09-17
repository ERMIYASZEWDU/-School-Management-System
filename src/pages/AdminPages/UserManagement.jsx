import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit2, Search, Filter, MoreVertical, Power, Lock } from 'lucide-react'
import { getUsers, createUser, updateUser, toggleUserStatus, deleteUser, getStudents } from '../../services/adminApi'
import { useTranslation } from 'react-i18next'

export const UserManagement = () => {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'student',
    studentIds: []
  })
  const [students, setStudents] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [actionMenu, setActionMenu] = useState(null)

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      console.error('Error loading users:', err)
      setError(err.message || t('admin.users.loadFailed', 'Failed to load users'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Load the student roster for the parent child-linking picker
  useEffect(() => {
    if (isModalOpen && students.length === 0) {
      getStudents()
        .then((data) => setStudents(Array.isArray(data) ? data : data.students || []))
        .catch((err) => console.error('Error loading students:', err))
    }
  }, [isModalOpen])

  const handleOpenModal = (user = null) => {
    if (user) {
      setFormData({ name: user.name, email: user.email, password: '', phone: user.phone || '', role: user.role, studentIds: [] })
      setEditingId(user._id)
    } else {
      setFormData({ name: '', email: '', password: '', phone: '', role: 'student', studentIds: [] })
      setEditingId(null)
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingId) {
        await updateUser(editingId, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role
        })
      } else {
        await createUser({ ...formData, studentIds: formData.role === 'parent' ? formData.studentIds : [] })
      }
      await loadUsers()
    } catch (err) {
      alert(err.response?.data?.message || err.message || t('admin.users.saveFailed', 'Failed to save user'))
      return
    }

    setFormData({ name: '', email: '', password: '', phone: '', role: 'student', studentIds: [] })
    setEditingId(null)
    setIsModalOpen(false)
  }

  const toggleStudent = (studentId) => {
    setFormData((f) => ({
      ...f,
      studentIds: f.studentIds.includes(studentId)
        ? f.studentIds.filter((id) => id !== studentId)
        : [...f.studentIds, studentId]
    }))
  }

  const handleDelete = async (id) => {
    if (confirm(t('admin.users.deleteConfirm', 'Are you sure you want to delete this user? This action cannot be undone.'))) {
      try {
        await deleteUser(id)
        await loadUsers()
      } catch (err) {
        alert(err.response?.data?.message || err.message || t('admin.users.deleteFailed', 'Failed to delete user'))
      }
      setActionMenu(null)
    }
  }

  const handleToggleStatus = async (id) => {
    try {
      await toggleUserStatus(id)
      await loadUsers()
    } catch (err) {
      alert(err.response?.data?.message || err.message || t('admin.users.statusUpdateFailed', 'Failed to update user status'))
    }
    setActionMenu(null)
  }

  const filteredUsers = users.filter(user => {
    const name = (user.name || '').toLowerCase()
    const email = (user.email || '').toLowerCase()
    const matchesSearch = name.includes(searchTerm.toLowerCase()) ||
                         email.includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  const roleColors = {
    student: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    teacher: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    parent: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    admin: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
  }

  const statusColors = {
    active: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('admin.users.title', 'User Management')}</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{t('admin.users.subtitle', 'Manage all system users')}</p>
          </div>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            <Plus size={20} />
            {t('admin.users.addNew', 'Add New User')}
          </motion.button>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
              <input
                type="text"
                placeholder={t('admin.teachers.searchPlaceholder', 'Search by name or email...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-600 dark:text-gray-300" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
              >
                <option value="all">{t('admin.users.allRoles', 'All Roles')}</option>
                <option value="student">{t('roles.student', 'Student')}</option>
                <option value="teacher">{t('roles.teacher', 'Teacher')}</option>
                <option value="parent">{t('roles.parent', 'Parent')}</option>
                <option value="admin">{t('roles.admin', 'Admin')}</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">{t('teacher.name', 'Name')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">{t('profile.email', 'Email')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">{t('admin.teachers.phone', 'Phone')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">{t('admin.users.role', 'Role')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">{t('admin.classes.statusColumn', 'Status')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">{t('admin.users.created', 'Created')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">{t('teacher.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-lg">{t('admin.users.loading', 'Loading users...')}</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-lg text-red-600 dark:text-red-400">{error}</p>
                      <button
                        onClick={loadUsers}
                        className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t('admin.users.retry', 'Retry')}
                      </button>
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user, idx) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition relative"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{user.name}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{user.email}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{user.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 dark:bg-gray-800'}`}>
                          {String(t(`roles.${user.role}`, user.role))}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[user.status] || statusColors.active}`}>
                          {String(t(`statusLabels.${user.status || 'active'}`, user.status || 'Active'))}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleOpenModal(user)}
                            className="p-2 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-lg transition"
                            title={t('admin.users.editUser', 'Edit user')}
                          >
                            <Edit2 size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleToggleStatus(user._id)}
                            className={`p-2 rounded-lg transition ${
                              (user.status || 'active') === 'active'
                                ? 'hover:bg-yellow-100 text-yellow-600 dark:text-yellow-400'
                                : 'hover:bg-green-100 text-green-600 dark:text-green-400'
                            }`}
                            title={(user.status || 'active') === 'active' ? t('admin.users.deactivateUser', 'Deactivate user') : t('admin.users.activateUser', 'Activate user')}
                          >
                            <Power size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(user._id)}
                            className="p-2 hover:bg-red-100 text-red-600 dark:text-red-400 rounded-lg transition"
                            title={t('admin.users.deleteUser', 'Delete user')}
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-lg">{t('admin.users.noUsers', 'No users found')}</p>
                      <p className="text-sm mt-1">{t('admin.users.noUsersHint', 'Try adjusting your search or filter criteria')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Stats Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 grid md:grid-cols-4 gap-4"
        >
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{t('admin.users.totalUsers', 'Total Users')}</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{users.length}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900/50 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">{t('admin.users.activeUsers', 'Active Users')}</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{users.filter(u => (u.status || 'active') === 'active').length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t('admin.users.inactiveUsers', 'Inactive Users')}</p>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-200 mt-1">{users.filter(u => (u.status || 'active') === 'inactive').length}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-900/50 rounded-lg p-4">
            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">{t('admin.students.filteredResults', 'Filtered Results')}</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">{filteredUsers.length}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Modal */}
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              {t(editingId ? 'admin.users.editTitle' : 'admin.users.addTitle', editingId ? 'Edit User' : 'Add New User')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('profile.fullName', 'Full Name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('admin.users.enterFullName', 'Enter full name')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('profile.email', 'Email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('admin.users.enterEmail', 'Enter email')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('admin.teachers.phone', 'Phone')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('admin.users.enterPhone', 'Enter phone number')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('admin.users.role', 'Role')}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="student">{t('roles.student', 'Student')}</option>
                  <option value="teacher">{t('roles.teacher', 'Teacher')}</option>
                  <option value="parent">{t('roles.parent', 'Parent')}</option>
                  <option value="admin">{t('roles.admin', 'Admin')}</option>
                </select>
              </div>

              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('admin.students.password', 'Password')}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={t('admin.students.enterPassword', 'Enter password')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingId}
                  />
                </div>
              )}

              {formData.role === 'parent' && !editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('admin.users.linkChildren', 'Link Children (Students)')}
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    {students.length > 0 ? (
                      students.map((student) => (
                        <label
                          key={student._id}
                          className="flex items-center gap-2 py-2 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.studentIds.includes(student._id)}
                            onChange={() => toggleStudent(student._id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-200">
                            {student.name} — {student.grade} {student.section}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">
                        {t('admin.users.noStudentsForLink', 'No students available to link')}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('admin.users.linkHint', 'You can also link children later from the Parents page.')}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  {t(editingId ? 'admin.users.updateUser' : 'admin.users.createUser', editingId ? 'Update User' : 'Create User')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-semibold"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
