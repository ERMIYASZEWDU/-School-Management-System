import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Users,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Layers,
  LineChart,
  Sparkles,
  Menu,
  X,
  ChevronDown,
  Presentation,
  HeartHandshake,
  ShieldCheck,
  Star,
  Award
} from 'lucide-react'
import { LanguageSwitcher } from '../components/LanguageSwitcher'

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' }
}

const navLinks = [
  { href: '#portals', key: 'landing.portalsTitle' },
  { href: '#how', key: 'landing.howTitle' },
  { href: '#faq', key: 'landing.faqTitle' }
]


export const LandingPage = () => {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)

  const steps = [
    { icon: Layers, title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { icon: Users, title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { icon: LineChart, title: t('landing.step3Title'), desc: t('landing.step3Desc') }
  ]

  const portals = [
    { icon: BookOpen, title: t('landing.portalStudent'), desc: t('landing.portalStudentDesc'), accent: 'from-sky-500 to-blue-600', light: 'bg-sky-50 dark:bg-sky-900/30' },
    { icon: Presentation, title: t('landing.portalTeacher'), desc: t('landing.portalTeacherDesc'), accent: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { icon: HeartHandshake, title: t('landing.portalParent'), desc: t('landing.portalParentDesc'), accent: 'from-violet-500 to-purple-600', light: 'bg-violet-50 dark:bg-violet-900/30' },
    { icon: ShieldCheck, title: t('landing.portalAdmin'), desc: t('landing.portalAdminDesc'), accent: 'from-amber-500 to-orange-600', light: 'bg-amber-50 dark:bg-amber-900/30' }
  ]

  const faqs = [
    { q: t('landing.faq1q'), a: t('landing.faq1a') },
    { q: t('landing.faq2q'), a: t('landing.faq2a') },
    { q: t('landing.faq3q'), a: t('landing.faq3a') },
    { q: t('landing.faq4q'), a: t('landing.faq4a') },
    { q: t('landing.faq5q'), a: t('landing.faq5a') }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-50 border-b border-gray-200/80 dark:border-gray-700/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Aykel School</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden xs:block">{t('landing.subtitle')}</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {t(link.key)}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold text-sm sm:text-base shadow-sm hover:shadow-md shrink-0"
            >
              {t('auth.login')}
              <ArrowRight size={16} />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition shrink-0"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-gray-200/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
            >
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition"
                  >
                    {t(link.key)}
                  </a>
                ))}
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                >
                  {t('auth.login')} <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 sm:pt-36 pb-14 sm:pb-20 px-4 sm:px-6">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-20 -left-20 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-gradient-to-br from-blue-400/30 to-indigo-400/30 dark:from-blue-600/25 dark:to-indigo-600/25 blur-3xl animate-drift" />
          <div className="absolute top-1/4 -right-24 w-80 h-80 sm:w-[26rem] sm:h-[26rem] rounded-full bg-gradient-to-br from-violet-400/25 to-sky-400/25 dark:from-violet-600/20 dark:to-sky-600/20 blur-3xl animate-drift" style={{ animationDelay: '-6s', animationDuration: '19s' }} />
          <div className="absolute -bottom-16 left-1/4 w-72 h-72 rounded-full bg-gradient-to-br from-cyan-300/25 to-blue-500/25 dark:from-cyan-500/15 dark:to-blue-700/15 blur-3xl animate-drift" style={{ animationDelay: '-11s', animationDuration: '22s' }} />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-medium mb-6"
              >
                <Sparkles size={14} />
                {t('landing.tagline')}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-5 sm:mb-6 text-gray-900 dark:text-white leading-tight tracking-tight"
              >
                {t('welcome')}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0"
              >
                {t('landing.description')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start items-center mb-10"
              >
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold shadow-lg hover:shadow-xl text-base"
                >
                  {t('landing.getStarted')} <ArrowRight size={18} />
                </Link>
              </motion.div>

          </div>
        </div>
      </section>
      {/* ── Portals ── */}
      <section id="portals" className="py-14 sm:py-20 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-semibold mb-4">
              <Award size={12} /> {t('landing.portalsTitle')}
            </span>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 text-gray-900 dark:text-white">
              {t('landing.portalsDesc')}
            </h3>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {portals.map((portal, idx) => {
              const Icon = portal.icon
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: idx * 0.08 }}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${portal.accent} flex items-center justify-center shadow-md mb-4`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{portal.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1 leading-relaxed">{portal.desc}</p>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:gap-2.5 transition-all"
                  >
                    {t('landing.explore')} <ArrowRight size={15} />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-14 sm:py-20 px-4 sm:px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-4">
              <Sparkles size={12} /> {t('landing.howTitle')}
            </span>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {t('landing.howTitle')}
            </h3>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((step, idx) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative text-center"
                >
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg mb-5">
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-[calc(50%+2.75rem)] hidden md:flex items-center">
                    {idx < steps.length - 1 && (
                      <ArrowRight size={20} className="text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                    {String(idx + 1).padStart(2, '0')}
                  </p>
                  <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{step.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs mx-auto">{step.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-14 sm:py-20 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold mb-4">
              <BookOpen size={12} /> {t('landing.faqTitle')}
            </span>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 text-gray-900 dark:text-white">
              {t('landing.faqTitle')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('landing.faqDesc')}
            </p>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left"
                  >
                    <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 sm:px-5 pb-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-20">
        <motion.div
          {...fadeUp}
          className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 sm:p-14 text-center shadow-xl relative overflow-hidden"
        >
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -left-16 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
          <div className="relative">
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white mb-3 sm:mb-4">
              {t('landing.ctaTitle')}
            </h3>
            <p className="text-blue-100 text-sm sm:text-lg mb-8 max-w-xl mx-auto">
              {t('landing.ctaDesc')}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition font-semibold shadow-lg hover:shadow-xl"
            >
              {t('landing.getStarted')} <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-300 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Aykel School</p>
              <p className="text-xs text-gray-400">{t('landing.subtitle')}</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-white transition-colors">
                {t(link.key)}
              </a>
            ))}
            <Link to="/login" className="hover:text-white transition-colors">{t('auth.login')}</Link>
          </nav>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-400">{t('landing.footer')}</p>
        </div>
      </footer>
    </div>
  )
}
