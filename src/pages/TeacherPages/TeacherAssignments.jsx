import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FileText, Plus, Edit, Trash2, X, ClipboardList } from 'lucide-react'
import { getAssignments, createAssignment, updateAssignment, deleteAssignment, getAssignmentSubmissions, gradeSubmission } from '../../services/teacherApi'
import apiClient from '../../utils/api'

export const TeacherAssignments = () => {
  const { t } = useTranslation()
  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade: '',
    classId: '',
    dueDate: ''
  })
  // Grading modal state
  const [grading, setGrading] = useState(null) // assignment whose submissions are open
  const [submissions, setSubmissions] = useState([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [gradeForm, setGradeForm] = useState({}) // submissionId -> { score, feedback }
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [assignData, classRes] = await Promise.all([
        getAssignments(),
        apiClient.get('/api/teacher/classes')
      ])
      setAssignments(assignData)
      setClasses(classRes.data)

      // Pre-select first class in form
      if (classRes.data.length > 0) {
        const first = classRes.data[0]
        setFormData(prev => ({ ...prev, grade: first.name, classId: first._id }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingAssignment(null)
    const first = classes[0]
    setFormData({
      title: '',
      description: '',
      subject: '',
      grade: first?.name || '',
      classId: first?._id || '',
      dueDate: ''
    })
    setShowModal(true)
  }

  const handleClassChange = (classId) => {
    const cls = classes.find(c => c._id === classId)
    setFormData(prev => ({ ...prev, classId, grade: cls?.name || '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAssignment) {
        await updateAssignment(editingAssignment._id, formData)
      } else {
        await createAssignment(formData)
      }
      setShowModal(false)
      setEditingAssignment(null)
      await fetchAll()
    } catch (error) {
      alert(error.response?.data?.message || t('teacher.failedToSaveAssignment', 'Failed to save assignment'))
    }
  }

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment)
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      subject: assignment.subject,
      grade: assignment.grade,
      classId: assignment.classId || '',
      dueDate: assignment.dueDate ? assignment.dueDate.split('T')[0] : ''
    })
    setShowModal(true)
  }

  const openGrading = async (assignment) => {
    setGrading(assignment)
    setSubmissions([])
    setGradeForm({})
    setSubmissionsLoading(true)
    try {
      const data = await getAssignmentSubmissions(assignment._id)
      setSubmissions(data.submissions || [])
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setSubmissionsLoading(false)
    }
  }

  const handleSaveGrade = async (submissionId) => {
    const form = gradeForm[submissionId] || {}
    const score = form.score === '' || form.score === undefined ? null : Number(form.score)
    if (score !== null && (Number.isNaN(score) || score < 0 || score > (grading?.maxScore || 100))) {
      alert(t('teacher.invalidScore', `Score must be between 0 and ${grading?.maxScore || 100}`))
      return
    }
    setSavingId(submissionId)
    try {
      const updated = await gradeSubmission(submissionId, { score, feedback: form.feedback ?? null })
      // Merge only the graded fields — the raw response's studentId is an
      // ObjectId string and must not clobber the populated student object.
      setSubmissions(prev => prev.map(s => (
        s._id === submissionId
          ? { ...s, score: updated.score, feedback: updated.feedback, status: updated.status, gradedBy: updated.gradedBy, gradedAt: updated.gradedAt }
          : s
      )))
    } catch (error) {
      alert(error.response?.data?.message || t('teacher.failedToSaveGrade', 'Failed to save grade'))
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('teacher.deleteAssignmentConfirm', 'Delete this assignment?'))) return
    try {
      await deleteAssignment(id)
      await fetchAll()
    } catch (error) {
      alert(t('teacher.failedToDeleteAssignment', 'Failed to delete assignment'))
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pt-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <FileText size={36} className="text-purple-600 dark:text-purple-400" />
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('dashboards.assignments', 'Assignments')}</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{t('teacher.createManageAssignments', 'Create and manage assignments for your classes')}</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            <Plus size={20} /> {t('dashboards.createAssignment', 'Create Assignment')}
          </button>
        </div>

        {/* No classes warning */}
        {!loading && classes.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 rounded-lg p-5 mb-6 text-yellow-800 text-sm">
            {t('teacher.noAssignedClassesWarning', 'You have no assigned classes. Ask your admin to assign you to a class before creating assignments.')}
          </div>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">{t('teacher.loadingAssignments', 'Loading assignments...')}</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300">{t('teacher.noAssignmentsYet', 'No assignments yet. Create your first assignment.')}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {assignments.map(a => (
              <motion.div
                key={a._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{a.title}</h3>
                    {a.description && <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{a.description}</p>}
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-medium">{a.subject}</span>
                      <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-medium">{a.grade}</span>
                      <span className="text-gray-500 dark:text-gray-400">{t('dashboards.due', 'Due')}: {formatDate(a.dueDate)}</span>
                      {(a.submissionCount > 0 || a.gradedCount > 0) && (
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full font-medium">
                          {t('teacher.submittedCount', `{{count}} submitted`, { count: a.submissionCount })}{a.gradedCount > 0 ? ` · ${a.gradedCount} ${t('teacher.gradedWord', 'graded')}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openGrading(a)}
                      title={t('teacher.gradeSubmissions', 'Grade submissions')}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40 rounded-lg transition"
                    >
                      <ClipboardList size={16} />
                      {a.submissionCount > 0 ? t('teacher.gradeSubmissions', 'Grade submissions') : t('teacher.viewSubmissions', 'View submissions')}
                    </button>
                    <button onClick={() => handleEdit(a)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(a._id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Grading modal */}
      {grading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{grading.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {t('teacher.submissionsFor', 'Submissions')} · {t('dashboards.due', 'Due')} {formatDate(grading.dueDate)} · {t('dashboards.maxScore', 'Max score')} {grading.maxScore || 100}
                </p>
              </div>
              <button onClick={() => setGrading(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} /></button>
            </div>
            {submissionsLoading ? (
              <div className="py-10 text-center text-gray-600 dark:text-gray-300">{t('common.loading', 'Loading...')}</div>
            ) : submissions.length === 0 ? (
              <div className="py-10 text-center text-gray-600 dark:text-gray-300">{t('teacher.noSubmissionsYet', 'No submissions yet.')}</div>
            ) : (
              <div className="space-y-4">
                {submissions.map(s => {
                  const student = s.studentId || {}
                  const graded = s.status === 'graded'
                  const form = gradeForm[s._id] || { score: s.score ?? '', feedback: s.feedback ?? '' }
                  return (
                    <div key={s._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100">{student.name || t('common.unknown', 'Unknown student')}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {student.grade ? `${student.grade}-${student.section}` : ''}{student.rollNumber ? ` · ${t('teacher.rollNo', 'Roll')} ${student.rollNumber}` : ''} · {new Date(s.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {s.status === 'late' && <span className="ml-2 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded text-xs font-semibold">{t('studentLabels.late', 'Late')}</span>}
                          </p>
                        </div>
                        {graded && (
                          <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                            {t('studentLabels.graded', 'Graded')}: {s.score} / {grading.maxScore || 100}
                          </span>
                        )}
                      </div>
                      {s.content && <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded p-2 mb-3 whitespace-pre-wrap">{s.content}</p>}
                      {!graded && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="number"
                            min="0"
                            max={grading.maxScore || 100}
                            value={form.score}
                            onChange={e => setGradeForm(prev => ({ ...prev, [s._id]: { ...form, score: e.target.value } }))}
                            placeholder={`${t('teacher.scoreLabel', 'Score')} (0–${grading.maxScore || 100})`}
                            className="w-full sm:w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                          />
                          <input
                            type="text"
                            value={form.feedback}
                            onChange={e => setGradeForm(prev => ({ ...prev, [s._id]: { ...form, feedback: e.target.value } }))}
                            placeholder={t('teacher.feedbackLabel', 'Feedback')}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                          />
                          <button
                            onClick={() => handleSaveGrade(s._id)}
                            disabled={savingId === s._id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm disabled:opacity-50 whitespace-nowrap"
                          >
                            {savingId === s._id ? t('common.saving', 'Saving...') : t('teacher.saveGrade', 'Save Grade')}
                          </button>
                        </div>
                      )}
                      {graded && s.feedback && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2"><span className="font-semibold">{t('teacher.feedbackLabel', 'Feedback')}:</span> {s.feedback}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{editingAssignment ? t('teacher.editAssignment', 'Edit Assignment') : t('dashboards.createAssignment', 'Create Assignment')}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('teacher.titleLabel', 'Title')} *</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required placeholder={t('teacher.assignmentTitlePlaceholder', 'Assignment title')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('teacher.description', 'Description')}</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} placeholder={t('teacher.instructionsPlaceholder', 'Instructions for students...')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('teacher.subjectLabel', 'Subject')} *</label>
                <input type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} required placeholder={t('teacher.subjectPlaceholder', 'e.g., Mathematics')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('dashboards.class', 'Class')} *</label>
                {classes.length > 0 ? (
                  <select
                    value={formData.classId}
                    onChange={e => handleClassChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="">{t('teacher.selectClass', 'Select a class')}</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">
                    {t('teacher.noClassesAssignedModal', 'No classes assigned. Ask admin to assign you to a class first.')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('teacher.dueDate', 'Due Date')} *</label>
                <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={classes.length === 0} className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm disabled:opacity-50">
                  {editingAssignment ? t('common.update', 'Update') : t('common.create', 'Create')} {t('dashboards.assignments', 'Assignments')}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-semibold text-sm">
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
