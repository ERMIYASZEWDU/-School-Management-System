import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FileText, ArrowLeft, CheckCircle, Clock, AlertTriangle, Calendar, User } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { getChildAssignments, getChildDetails } from '../../services/parentApi'

export const ParentChildAssignments = () => {
  const { t } = useTranslation()
  const { studentId } = useParams()
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [child, setChild] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [studentId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [assignmentsData, childData] = await Promise.all([
        getChildAssignments(studentId),
        getChildDetails(studentId)
      ])
      setAssignments(assignmentsData)
      setChild(childData)
      setError('')
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(t('studentLabels.failedToLoadAssignments', 'Failed to load assignments'))
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (assignment) => {
    if (assignment.submission) {
      if (assignment.submission.grade) {
        return (
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold border-2 border-green-300 flex items-center gap-1">
            <CheckCircle size={14} />
            {t('studentLabels.graded', 'Graded')}: {assignment.submission.grade}
          </span>
        )
      }
      return (
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold border-2 border-blue-300 flex items-center gap-1">
          <CheckCircle size={14} />
          {t('studentLabels.submitted', 'Submitted')}
        </span>
      )
    }
    const isOverdue = new Date(assignment.dueDate) < new Date()
    if (isOverdue) {
      return (
        <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold border-2 border-red-300 flex items-center gap-1">
          <AlertTriangle size={14} />
          {t('studentLabels.overdue', 'Overdue')}
        </span>
      )
    }
    return (
      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-semibold border-2 border-yellow-300 flex items-center gap-1">
        <Clock size={14} />
        {t('dashboards.pending', 'Pending')}
      </span>
    )
  }

  const getDaysRemaining = (dueDate) => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return t('studentLabels.daysOverdue', '{{count}} days overdue', { count: Math.abs(diffDays) })
    if (diffDays === 0) return t('studentLabels.dueToday', 'Due today')
    if (diffDays === 1) return t('studentLabels.dueTomorrow', 'Due tomorrow')
    return t('studentLabels.daysRemaining', '{{count}} days remaining', { count: diffDays })
  }

  const submittedCount = assignments.filter(a => a.submission).length
  const pendingCount = assignments.filter(a => !a.submission && new Date(a.dueDate) >= new Date()).length
  const overdueCount = assignments.filter(a => !a.submission && new Date(a.dueDate) < new Date()).length
  const gradedCount = assignments.filter(a => a.submission?.grade).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pt-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{t('teacher.loadingAssignments', 'Loading assignments...')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-gray-900 via-purple-50 dark:via-purple-900/40 to-blue-50 dark:to-blue-900/40 p-6 pt-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/parent/children')}
          className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-6"
        >
          <ArrowLeft size={20} />
          {t('parent.backToChildren', 'Back to Children')}
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={36} className="text-purple-600 dark:text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {t('parent.childAssignments', "{{name}}'s Assignments", { name: child?.name || '' })}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{child?.grade} {child?.section} • {child?.enrollmentNumber}</p>
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
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">{t('teacher.total', 'Total')}</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{assignments.length}</p>
              </div>
              <FileText size={28} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">{t('studentLabels.submitted', 'Submitted')}</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{submittedCount}</p>
              </div>
              <CheckCircle size={28} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">{t('dashboards.pending', 'Pending')}</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</p>
              </div>
              <Clock size={28} className="text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">{t('studentLabels.graded', 'Graded')}</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{gradedCount}</p>
              </div>
              <CheckCircle size={28} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.length > 0 ? (
            assignments.map((assignment, index) => {
              const isOverdue = new Date(assignment.dueDate) < new Date() && !assignment.submission
              return (
                <motion.div
                  key={assignment._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                      <FileText size={24} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    {getStatusBadge(assignment)}
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">
                    {assignment.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                    {assignment.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <User size={16} className="text-blue-500" />
                      <span>{t('teacher.studentsPageTitle', 'Teacher')}: {assignment.teacherId?.name || t('studentLabels.unknown', 'Unknown')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Calendar size={16} className="text-purple-500" />
                      <span>{t('dashboards.due', 'Due')}: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock size={16} className={isOverdue ? 'text-red-500' : 'text-green-500'} />
                      <span className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                        {getDaysRemaining(assignment.dueDate)}
                      </span>
                    </div>
                  </div>

                  {assignment.submission && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold mb-1">
                          {t('studentLabels.submissionStatus', 'Submission Status')}: {String(t(`statusLabels.${assignment.submission.status}`, assignment.submission.status))}
                        </p>
                        {assignment.submission.grade && (
                          <>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {t('dashboards.grade', 'Grade')}: <span className="font-bold">{assignment.submission.grade}</span>
                            </p>
                            {assignment.submission.feedback && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                {t('studentLabels.feedback', 'Feedback')}: {assignment.submission.feedback}
                              </p>
                            )}
                          </>
                        )}
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {t('studentLabels.submitted', 'Submitted')}: {new Date(assignment.submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <FileText size={48} className="text-gray-300 dark:text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">{t('teacher.noAssignmentsYet', 'No assignments yet')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
