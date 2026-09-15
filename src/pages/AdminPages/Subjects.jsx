import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Edit, Trash2, Clock, GraduationCap } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { getSubjects, createSubject, updateSubject, deleteSubject, getTeachers } from '../../services/adminApi'
import { useTranslation } from 'react-i18next'

export const Subjects = () => {
  const { t } = useTranslation()
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    grade: '',
    teacherId: '',
    credits: 1,
    description: ''
  })

  useEffect(() => {
    fetchSubjects()
    fetchTeachers()
  }, [])

  const fetchSubjects = async () => {
    try {
      console.log('🔍 Fetching subjects...')
      setLoading(true)
      const data = await getSubjects()
      console.log('✅ Subjects fetched:', data)
      setSubjects(data)
      setError('')
    } catch (err) {
      console.error('❌ Error fetching subjects:', err)
      setError(t('admin.subjects.loadFailed', 'Failed to load subjects'))
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const data = await getTeachers()
      setTeachers(data)
    } catch (err) {
      console.error('Error fetching teachers:', err)
    }
  }

  const handleAdd = () => {
    setFormData({
      name: '',
      code: '',
      grade: '',
      teacherId: '',
      credits: 1,
      description: ''
    })
    setSelectedSubject(null)
    setShowAddModal(true)
  }

  const handleEdit = (subject) => {
    setSelectedSubject(subject)
    setFormData({
      name: subject.name,
      code: subject.code,
      grade: subject.grade,
      teacherId: typeof subject.teacherId === 'object' ? subject.teacherId?._id : subject.teacherId || '',
      credits: subject.credits || 1,
      description: subject.description || ''
    })
    setShowEditModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.subjects.deleteConfirm', 'Are you sure you want to delete this subject? This may affect grades and assignments.'))) {
      return
    }

    try {
      await deleteSubject(id)
      alert(t('admin.subjects.deleted', '✅ Subject deleted successfully!'))
      await fetchSubjects()
    } catch (err) {
      console.error('❌ Error deleting subject:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error'
      alert(`${t('admin.subjects.deleteFailed', 'Failed to delete subject')}: ${errorMsg}`)
    }
  }

  const handleSave = async () => {
    try {
      console.log('💾 Saving subject...', formData)
      
      if (showEditModal && selectedSubject) {
        await updateSubject(selectedSubject._id, formData)
        alert(t('admin.subjects.updated', '✅ Subject updated successfully!'))
      } else {
        await createSubject(formData)
        alert(t('admin.subjects.created', '✅ Subject created successfully!'))
      }

      await fetchSubjects()
      setShowAddModal(false)
      setShowEditModal(false)
    } catch (err) {
      console.error('❌ Error saving subject:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error'
      alert(`${t('admin.subjects.saveFailed', 'Failed to save subject')}: ${errorMsg}`)
    }
  }

  const getTeacherName = (teacherId) => {
    if (!teacherId) return t('admin.classes.noTeacherAssigned', 'No teacher assigned')
    
    if (typeof teacherId === 'object' && teacherId.name) {
      return teacherId.name
    }
    
    const teacher = teachers.find(x => x._id === teacherId)
    return teacher ? teacher.name : t('admin.classes.unknown', 'Unknown')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pt-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{t('admin.subjects.loading', 'Loading subjects...')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-gray-900 via-blue-50 dark:via-blue-900/40 to-purple-50 dark:to-purple-900/40 p-6 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <GraduationCap size={36} className="text-purple-600 dark:text-purple-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {t('admin.subjects.title', 'Subjects')}
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-2">{t('admin.subjects.subtitle', 'Manage curriculum and subjects')}</p>
          </div>
          <Button onClick={handleAdd} className="flex items-center gap-2">
            <Plus size={20} />
            {t('admin.subjects.addNew', 'Add New Subject')}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">{t('admin.subjects.totalSubjects', 'Total Subjects')}</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{subjects.length}</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                <BookOpen size={28} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">{t('statusLabels.active', 'Active')}</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {subjects.filter(s => s.isActive).length}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <BookOpen size={28} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">{t('admin.subjects.withTeachers', 'With Teachers')}</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {subjects.filter(s => s.teacherId).length}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
                <GraduationCap size={28} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">{t('admin.subjects.totalCredits', 'Total Credits')}</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {subjects.reduce((sum, s) => sum + (s.credits || 0), 0)}
                </p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                <Clock size={28} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 dark:from-purple-900/40 to-blue-50 dark:to-blue-900/40">
                <tr>
                  <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">{t('admin.subjects.code', 'Code')}</th>
                  <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">{t('teacher.name', 'Name')}</th>
                  <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">{t('admin.students.grade', 'Grade')}</th>
                  <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">{t('roles.teacher', 'Teacher')}</th>
                  <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">{t('admin.subjects.credits', 'Credits')}</th>
                  <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">{t('admin.classes.statusColumn', 'Status')}</th>
                  <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">{t('teacher.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length > 0 ? (
                  subjects.map((subject) => (
                    <tr key={subject._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-purple-50">
                      <td className="p-4 font-mono text-sm text-gray-600 dark:text-gray-300">{subject.code}</td>
                      <td className="p-4 font-semibold text-gray-800 dark:text-gray-100">{subject.name}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-200">{subject.grade}</td>
                      <td className="p-4 text-blue-600 dark:text-blue-400 text-sm">{getTeacherName(subject.teacherId)}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-200">{subject.credits || 1}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          subject.isActive ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                        }`}>
                          {subject.isActive ? t('statusLabels.active', 'Active') : t('statusLabels.inactive', 'Inactive')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(subject)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <Edit size={16} className="text-gray-600 dark:text-gray-300" />
                          </button>
                          <button onClick={() => handleDelete(subject._id)} className="p-2 hover:bg-red-50 rounded-lg">
                            <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-500 dark:text-gray-400">
                      <GraduationCap size={48} className="text-gray-300 dark:text-gray-400 mx-auto mb-4" />
                      <p className="text-lg">{t('admin.subjects.noSubjects', 'No subjects found')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {(showAddModal || showEditModal) && (
        <Modal
          isOpen={showAddModal || showEditModal}
          onClose={() => { setShowAddModal(false); setShowEditModal(false) }}
          title={showAddModal ? t('admin.subjects.addTitle', 'Add New Subject') : t('admin.subjects.editTitle', 'Edit Subject')}
        >
          <div className="space-y-4">
            <Input
              label={t('admin.subjects.subjectName', 'Subject Name *')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('teacher.subjectPlaceholder', 'e.g., Mathematics')}
              required
            />
            <Input
              label={t('admin.subjects.subjectCode', 'Subject Code *')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder={t('admin.subjects.codePlaceholder', 'e.g., MATH101')}
              required
            />
            <Input
              label={t('admin.students.grade', 'Grade *')}
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              placeholder={t('admin.subjects.gradePlaceholder', 'e.g., Grade 10')}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('admin.classes.assignTeacherLabel', 'Assign Teacher')}</label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800"
              >
                <option value="">{t('admin.classes.noTeacherAssigned', 'No teacher assigned')}</option>
                {teachers.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <Input
              label={t('admin.subjects.credits', 'Credits *')}
              type="number"
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 1 })}
              placeholder={t('admin.subjects.creditsPlaceholder', 'e.g., 3')}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('admin.subjects.description', 'Description')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('admin.subjects.descriptionPlaceholder', 'Brief description...')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} className="flex-1">
                {showAddModal ? t('admin.subjects.addSubject', 'Add Subject') : t('admin.subjects.saveChanges', 'Save Changes')}
              </Button>
              <Button
                onClick={() => { setShowAddModal(false); setShowEditModal(false) }}
                className="flex-1 bg-gray-500 hover:bg-gray-600"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
