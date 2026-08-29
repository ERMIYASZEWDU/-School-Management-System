import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { Mail, Lock, Eye, EyeOff, BookOpen, Users, Calendar, FileText, BarChart3 } from 'lucide-react'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import apiClient from '../utils/api'

export const LoginPageNew = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await apiClient.post('/api/auth/login', { email, password })
      const { token, user } = response.data
      login(token, user)
      const roleRoutes = {
        admin: '/admin', teacher: '/teacher', student: '/student',
        parent: '/parent', superadmin: '/superadmin'
      }
      navigate(roleRoutes[user.role] || '/')
    } catch (err) {
      if (err.type === 'network_error' || err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please wait and try again.')
      } else if (err.message) {
        setError(err.message || 'Login failed. Please check your credentials.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col lg:flex-row">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center gap-3 px-4 py-4 bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">{t('auth.schoolManagement')}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('auth.signInToContinue')}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Left Side - School Info */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-blue-100 via-blue-50 to-white p-12 flex-col justify-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-6xl font-bold text-gray-800 mb-4 leading-tight">
            {t('auth.schoolManagement')}<br />
            <span className="text-blue-600">{t('auth.system')}</span>
          </h1>
          <p className="text-2xl text-gray-600 mb-12 font-light">{t('auth.completeSolution')}</p>
          <div className="grid grid-cols-2 gap-8">
            {[
              { icon: Users, title: t('auth.features.students'), subtitle: t('auth.features.management') },
              { icon: Calendar, title: t('auth.features.attendance'), subtitle: t('auth.features.management') },
              { icon: FileText, title: t('auth.features.examination'), subtitle: t('auth.features.management') },
              { icon: BarChart3, title: t('auth.features.reports'), subtitle: t('auth.features.analytics') }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white/70 rounded-xl backdrop-blur-sm shadow-sm">
                <f.icon size={28} className="text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-semibold text-gray-800 text-lg">{f.title}</p>
                  <p className="text-gray-600">{f.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-16">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center justify-center">
                <div className="text-white text-center">
                  <BookOpen size={64} className="mx-auto mb-4" />
                  <h3 className="text-2xl font-bold">{t('auth.welcomeToFuture')}</h3>
                  <h3 className="text-2xl font-bold">{t('auth.educationManagement')}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12 bg-white dark:bg-gray-900 flex-1">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="hidden lg:flex justify-end mb-4">
              <LanguageSwitcher />
            </div>
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
              <BookOpen size={40} className="text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white mb-2">{t('auth.loginTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">{t('auth.loginSubtitle')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-3">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-4 text-gray-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 sm:py-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all duration-300"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-3">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 sm:py-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all duration-300"
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300 font-medium">{t('auth.rememberMe')}</span>
              </label>
              <a href="/forgot-password" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                {t('auth.forgotPassword')}
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <span>{t('auth.loginButton')}</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-gray-600 dark:text-gray-400">
            <p className="text-sm">{t('auth.contactAdmin')}</p>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t('landing.footer')}</p>
        </div>
      </div>
    </div>
  )
}
