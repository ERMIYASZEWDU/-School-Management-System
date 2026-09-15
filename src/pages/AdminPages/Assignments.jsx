import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Plus, Edit, Trash2, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { getAdminAssignments, createAdminAssignment, updateAdminAssignment, deleteAdminAssignment, getClasses } from '../../services/adminApi'

export const Assignments = () => {
  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    classId: '',
    dueDate: '',
    maxScore: 100
  })

  const emptyForm = { title: '', description: '', subject: '', classId: '', dueDate: '', maxScore: 100 }

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      setError(null)
      const [assignmentsResponse, classesResponse] = await Promise.all([
        getAdminAssignments(),
        getClasses()
      ])
      const list = Array.isArray(assignmentsResponse)
        ? assignmentsResponse
        : (assignmentsResponse?.assignments || [])
      setAssignments(list)
      const classesList = Array.isArray(classesResponse)
        ? classesResponse
        : (classesResponse?.classes || [])
      setClasses(classesList)
    } catch (err) {
      console.error('Failed to load assignments:', err)
      setError(err?.response?.data?.message || 'Failed to load assignments. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignments()
  }, [])

  const handleAdd = () => {
    setFormData(emptyForm)
    setShowAddModal(true)
  }

  const handleEdit = (assignment) => {
    setSelectedAssignment(assignment)
    setFormData({
      title: assignment.title || '',
      description: assignment.description || '',
      subject: assignment.subject || '',
      classId: assignment.classId || '',
      dueDate: assignment.dueDate ? assignment.dueDate.split('T')[0] : '',
      maxScore: assignment.maxScore || 100
    })
    setShowEditModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        await deleteAdminAssignment(id)
        await fetchAssignments()
      } catch (err) {
        console.error('Failed to delete assignment:', err)
        alert(err?.response?.data?.message || 'Failed to delete assignment.')
      }
    }
  }

  const handleSave = async () => {
    if (!formData.title || !formData.subject || !formData.dueDate) {
      alert('Title, subject and due date are required.')
      return
    }
    try {
      setSaving(true)
      if (showAddModal) {
        await createAdminAssignment(formData)
      } else if (selectedAssignment) {
        await updateAdminAssignment(selectedAssignment.id, formData)
      }
      setShowAddModal(false)
      setShowEditModal(false)
      setSelectedAssignment(null)
      await fetchAssignments()
    } catch (err) {
      console.error('Failed to save assignment:', err)
      alert(err?.response?.data?.message || 'Failed to save assignment.')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300'
      case 'Overdue': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300'
      case 'Active': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
    }
  }

  const stats = {
    total: assignments.length,
    active: assignments.filter(a => a.status === 'Active').length,
    completed: assignments.filter(a => a.status === 'Completed').length,
    overdue: assignments.filter(a => a.status === 'Overdue').length,
    totalSubmitted: assignments.reduce((sum, a) => sum + (a.submitted || 0), 0),
    totalPending: assignments.reduce((sum, a) => sum + (a.pending || 0), 0)
  }

  const formatClassLabel = (assignment) => {
    if (assignment.classId && assignment.className) return assignment.className
    return assignment.grade || assignment.className || '—'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-gray-900 via-blue-50 dark:via-blue-900/40 to-purple-50 dark:to-purple-900/40 p-6 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <FileText size={36} className="text-purple-600 dark:text-purple-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Assignments
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Manage homework and assignments</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchAssignments} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button onClick={handleAdd} className="flex items-center gap-2">
              <Plus size={20} />
              Create Assignment
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Total Assignments</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.total}</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                <FileText size={28} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Active</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.active}</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <Clock size={28} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Submissions</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.totalSubmitted}</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
                <CheckCircle size={28} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Overdue</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-xl">
                <AlertCircle size={28} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Assignments Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden"
        >
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading assignments...</div>
            ) : error ? (
              <div className="p-12 text-center text-red-500">{error}</div>
            ) : assignments.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                No assignments yet. Click "Create Assignment" to add the first one.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-50 dark:from-purple-900/40 to-pink-50 dark:to-pink-900/40">
                  <tr>
                    <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">Assignment Title</th>
                    <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">Subject</th>
                    <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">Class</th>
                    <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">Due Date</th>
                    <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">Submitted</th>
                    <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">Pending</th>
                    <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">Status</th>
                    <th className="text-left p-4 font-bold text-gray-700 dark:text-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment, index) => (
                    <motion.tr
                      key={assignment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(0.6 + index * 0.05, 1) }}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-purple-50 transition-colors"
                    >
                      <td className="p-4 font-semibold text-gray-800 dark:text-gray-100">{assignment.title}</td>
                      <td className="p-4 text-purple-600 dark:text-purple-400 font-medium">{assignment.subject}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-200">{formatClassLabel(assignment)}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-200">{formatDate(assignment.dueDate)}</td>
                      <td className="p-4 text-green-600 dark:text-green-400 font-semibold">{assignment.submitted}</td>
                      <td className="p-4 text-orange-600 dark:text-orange-400 font-semibold">{assignment.pending}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(assignment.status)}`}>
                          {assignment.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(assignment)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={16} className="text-gray-600 dark:text-gray-300" />
                          </button>
                          <button
                            onClick={() => handleDelete(assignment.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <Modal
          isOpen={showAddModal || showEditModal}
          onClose={() => {
            setShowAddModal(false)
            setShowEditModal(false)
            setSelectedAssignment(null)
          }}
          title={showAddModal ? 'Create New Assignment' : 'Edit Assignment'}
        >
          <div className="space-y-4">
            <Input
              label="Assignment Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Math Homework - Chapter 5"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional instructions for students"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Mathematics"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Class</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No specific class</option>
                  {classes.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name || `${c.grade || ''} ${c.section || ''}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
              <Input
                label="Max Score"
                type="number"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 100 })}
                placeholder="100"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : (showAddModal ? 'Create Assignment' : 'Save Changes')}
              </Button>
              <Button
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                  setSelectedAssignment(null)
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
