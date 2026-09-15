import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Settings as SettingsIcon, Lock, Bell, Mail, Globe, Database } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const Settings = () => {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState({
    schoolName: 'ABC School',
    schoolEmail: 'admin@school.com',
    schoolPhone: '+91 9876543210',
    schoolAddress: '123 Main Street, City',
    academicYear: '2024-2025',
    language: 'English',
    timezone: 'IST (UTC+5:30)',
    sessionStartDate: '2024-04-01',
    sessionEndDate: '2025-03-31',
    emailNotifications: true,
    smsNotifications: true,
    maintenanceMode: false,
    backupFrequency: 'Weekly',
  })

  const [savedMessage, setSavedMessage] = useState('')

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    setSavedMessage(t('admin.settings.saved', 'Settings saved successfully!'))
    setTimeout(() => setSavedMessage(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <SettingsIcon className="text-blue-600 dark:text-blue-400" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('admin.settings.title', 'Settings')}</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">{t('admin.settings.subtitle', 'Configure your school management system')}</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {savedMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-3"
          >
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            {savedMessage}
          </motion.div>
        )}

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* School Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Globe className="text-blue-600 dark:text-blue-400" size={24} />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('admin.settings.schoolInfo', 'School Information')}</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('admin.settings.schoolName', 'School Name')}</label>
                <input
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('profile.email', 'Email')}</label>
                <input
                  type="email"
                  value={settings.schoolEmail}
                  onChange={(e) => handleChange('schoolEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('admin.teachers.phone', 'Phone')}</label>
                <input
                  type="tel"
                  value={settings.schoolPhone}
                  onChange={(e) => handleChange('schoolPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('admin.students.address', 'Address')}</label>
                <input
                  type="text"
                  value={settings.schoolAddress}
                  onChange={(e) => handleChange('schoolAddress', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Academic Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">{t('admin.settings.academicSettings', 'Academic Settings')}</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('admin.students.academicYear', 'Academic Year')}</label>
                <input
                  type="text"
                  value={settings.academicYear}
                  onChange={(e) => handleChange('academicYear', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('admin.settings.academicYearPlaceholder', 'e.g., 2024-2025')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('admin.settings.sessionStart', 'Session Start Date')}</label>
                <input
                  type="date"
                  value={settings.sessionStartDate}
                  onChange={(e) => handleChange('sessionStartDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('admin.settings.sessionEnd', 'Session End Date')}</label>
                <input
                  type="date"
                  value={settings.sessionEndDate}
                  onChange={(e) => handleChange('sessionEndDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('admin.settings.timezone', 'Timezone')}</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>IST (UTC+5:30)</option>
                  <option>PST (UTC-8:00)</option>
                  <option>EST (UTC-5:00)</option>
                  <option>GMT (UTC+0:00)</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Notification Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Bell className="text-blue-600 dark:text-blue-400" size={24} />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('admin.settings.notifications', 'Notifications')}</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                  className="w-5 h-5 border border-gray-300 dark:border-gray-600 rounded accent-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-200 font-medium">{t('admin.settings.enableEmail', 'Enable Email Notifications')}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => handleChange('smsNotifications', e.target.checked)}
                  className="w-5 h-5 border border-gray-300 dark:border-gray-600 rounded accent-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-200 font-medium">{t('admin.settings.enableSms', 'Enable SMS Notifications')}</span>
              </label>
            </div>
          </motion.div>

          {/* System Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Database className="text-blue-600 dark:text-blue-400" size={24} />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('admin.settings.systemSettings', 'System Settings')}</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('admin.settings.language', 'Language')}</label>
                <select
                  value={i18n.language.startsWith('am') ? 'Amharic' : 'English'}
                  onChange={(e) => {
                    handleChange('language', e.target.value)
                    i18n.changeLanguage(e.target.value === 'Amharic' ? 'am' : 'en')
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>{t('admin.settings.english', 'English')}</option>
                  <option>{t('admin.settings.amharic', 'Amharic')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('admin.settings.backupFrequency', 'Backup Frequency')}</label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => handleChange('backupFrequency', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>{t('admin.settings.daily', 'Daily')}</option>
                  <option>{t('admin.settings.weekly', 'Weekly')}</option>
                  <option>{t('admin.settings.monthly', 'Monthly')}</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                  className="w-5 h-5 border border-gray-300 dark:border-gray-600 rounded accent-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-200 font-medium">{t('admin.settings.maintenanceMode', 'Maintenance Mode (System will be unavailable to users)')}</span>
              </label>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
            >
              <Save size={20} />
              {t('admin.timetable.saveSettings', 'Save Settings')}
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
