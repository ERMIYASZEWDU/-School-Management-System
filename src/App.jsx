import React, { lazy, Suspense, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { Header } from './components/Layout/Header'
import { Sidebar } from './components/Layout/Sidebar'

// Route-level code splitting: every page is lazy-loaded, so opening /login
// no longer downloads and evaluates all ~40 page modules (which is what made
// the first login feel slow — the whole 1.4MB app was parsed up front).
// Login/landing stay eagerly available below via the shared Suspense fallback.
const LoginPageNew = lazy(() => import('./pages/LoginPageNew').then(m => ({ default: m.LoginPageNew })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })))
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })))
const StudentDashboard = lazy(() => import('./pages/dashboards/StudentDashboard').then(m => ({ default: m.StudentDashboard })))
const TeacherDashboard = lazy(() => import('./pages/dashboards/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })))
const ParentDashboard = lazy(() => import('./pages/dashboards/ParentDashboard').then(m => ({ default: m.ParentDashboard })))
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const UserManagement = lazy(() => import('./pages/AdminPages/UserManagement').then(m => ({ default: m.UserManagement })))
const Students = lazy(() => import('./pages/AdminPages/Students').then(m => ({ default: m.Students })))
const Teachers = lazy(() => import('./pages/AdminPages/Teachers').then(m => ({ default: m.Teachers })))
const Settings = lazy(() => import('./pages/AdminPages/Settings').then(m => ({ default: m.Settings })))
const Timetable = lazy(() => import('./pages/AdminPages/Timetable').then(m => ({ default: m.Timetable })))
const Classes = lazy(() => import('./pages/AdminPages/Classes').then(m => ({ default: m.Classes })))
const Subjects = lazy(() => import('./pages/AdminPages/Subjects').then(m => ({ default: m.Subjects })))
const Parents = lazy(() => import('./pages/AdminPages/Parents').then(m => ({ default: m.Parents })))
const Attendance = lazy(() => import('./pages/AdminPages/Attendance').then(m => ({ default: m.Attendance })))
const Examinations = lazy(() => import('./pages/AdminPages/Examinations').then(m => ({ default: m.Examinations })))
const Assignments = lazy(() => import('./pages/AdminPages/Assignments').then(m => ({ default: m.Assignments })))
const Results = lazy(() => import('./pages/AdminPages/Results').then(m => ({ default: m.Results })))
const Reports = lazy(() => import('./pages/AdminPages/Reports').then(m => ({ default: m.Reports })))
const EnrollmentManagement = lazy(() => import('./pages/AdminPages/EnrollmentManagement').then(m => ({ default: m.EnrollmentManagement })))
const AcademicYearManagement = lazy(() => import('./pages/AdminPages/AcademicYearManagement').then(m => ({ default: m.AcademicYearManagement })))
const TeacherStudents = lazy(() => import('./pages/TeacherPages/TeacherStudents').then(m => ({ default: m.TeacherStudents })))
const TeacherGrades = lazy(() => import('./pages/TeacherPages/TeacherGrades').then(m => ({ default: m.TeacherGrades })))
const TeacherAttendance = lazy(() => import('./pages/TeacherPages/TeacherAttendance').then(m => ({ default: m.TeacherAttendance })))
const TeacherAssignments = lazy(() => import('./pages/TeacherPages/TeacherAssignments').then(m => ({ default: m.TeacherAssignments })))
const TeacherTimetable = lazy(() => import('./pages/TeacherPages/TeacherTimetable').then(m => ({ default: m.TeacherTimetable })))
const StudentGrades = lazy(() => import('./pages/StudentPages/StudentGrades').then(m => ({ default: m.StudentGrades })))
const StudentAttendance = lazy(() => import('./pages/StudentPages/StudentAttendance').then(m => ({ default: m.StudentAttendance })))
const StudentAssignments = lazy(() => import('./pages/StudentPages/StudentAssignments').then(m => ({ default: m.StudentAssignments })))
const StudentTimetable = lazy(() => import('./pages/StudentPages/StudentTimetable').then(m => ({ default: m.StudentTimetable })))
const ParentChildren = lazy(() => import('./pages/ParentPages/ParentChildren').then(m => ({ default: m.ParentChildren })))
const ParentChildGrades = lazy(() => import('./pages/ParentPages/ParentChildGrades').then(m => ({ default: m.ParentChildGrades })))
const ParentChildAttendance = lazy(() => import('./pages/ParentPages/ParentChildAttendance').then(m => ({ default: m.ParentChildAttendance })))
const ParentChildAssignments = lazy(() => import('./pages/ParentPages/ParentChildAssignments').then(m => ({ default: m.ParentChildAssignments })))
const Announcements = lazy(() => import('./pages/Announcements').then(m => ({ default: m.Announcements })))


function ProtectedRoute({ children, role }) {
  const { isAuthenticated, role: userRole } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role && userRole !== role) {
    return <Navigate to={`/${userRole}`} replace />
  }

  return children
}

function DashboardLayout({ children, role, user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="flex bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Sidebar
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
        user={user}
      />
      <div className={`w-full transition-all duration-300 ${sidebarOpen && !isMobile ? 'lg:ml-64' : ''}`}>
        <Header
          user={user}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={onLogout}
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
        />
        <main className="pt-16 min-h-[calc(100dvh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}

// Shared suspense fallback for lazy-loaded routes.
const PageFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
  </div>
)

export default function App() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const restoreSession = useAuthStore((state) => state.restoreSession)

  // Re-validate token expiry on every app mount
  React.useEffect(() => {
    restoreSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Suspense fallback={<PageFallback />}><LandingPage /></Suspense>} />
        <Route path="/login" element={<Suspense fallback={<PageFallback />}><LoginPageNew /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<PageFallback />}><ForgotPassword /></Suspense>} />

        {/* ── STUDENT ── */}
        <Route path="/student" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="student"><DashboardLayout role="student" user={user} onLogout={logout}><StudentDashboard /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/student/profile" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="student"><DashboardLayout role="student" user={user} onLogout={logout}><Profile /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/student/grades" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="student"><DashboardLayout role="student" user={user} onLogout={logout}><StudentGrades /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/student/attendance" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="student"><DashboardLayout role="student" user={user} onLogout={logout}><StudentAttendance /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/student/assignments" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="student"><DashboardLayout role="student" user={user} onLogout={logout}><StudentAssignments /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/student/timetable" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="student"><DashboardLayout role="student" user={user} onLogout={logout}><StudentTimetable /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/student/announcements" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="student"><DashboardLayout role="student" user={user} onLogout={logout}><Announcements /></DashboardLayout></ProtectedRoute></Suspense>} />

        {/* ── TEACHER ── */}
        <Route path="/teacher" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="teacher"><DashboardLayout role="teacher" user={user} onLogout={logout}><TeacherDashboard /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/teacher/profile" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="teacher"><DashboardLayout role="teacher" user={user} onLogout={logout}><Profile /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/teacher/students" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="teacher"><DashboardLayout role="teacher" user={user} onLogout={logout}><TeacherStudents /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/teacher/grades" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="teacher"><DashboardLayout role="teacher" user={user} onLogout={logout}><TeacherGrades /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/teacher/attendance" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="teacher"><DashboardLayout role="teacher" user={user} onLogout={logout}><TeacherAttendance /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/teacher/assignments" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="teacher"><DashboardLayout role="teacher" user={user} onLogout={logout}><TeacherAssignments /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/teacher/timetable" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="teacher"><DashboardLayout role="teacher" user={user} onLogout={logout}><TeacherTimetable /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/teacher/announcements" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="teacher"><DashboardLayout role="teacher" user={user} onLogout={logout}><Announcements /></DashboardLayout></ProtectedRoute></Suspense>} />

        {/* ── PARENT ── */}
        <Route path="/parent" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="parent"><DashboardLayout role="parent" user={user} onLogout={logout}><ParentDashboard /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/parent/profile" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="parent"><DashboardLayout role="parent" user={user} onLogout={logout}><Profile /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/parent/children" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="parent"><DashboardLayout role="parent" user={user} onLogout={logout}><ParentChildren /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/parent/child/:studentId/grades" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="parent"><DashboardLayout role="parent" user={user} onLogout={logout}><ParentChildGrades /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/parent/child/:studentId/attendance" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="parent"><DashboardLayout role="parent" user={user} onLogout={logout}><ParentChildAttendance /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/parent/child/:studentId/assignments" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="parent"><DashboardLayout role="parent" user={user} onLogout={logout}><ParentChildAssignments /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/parent/announcements" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="parent"><DashboardLayout role="parent" user={user} onLogout={logout}><Announcements /></DashboardLayout></ProtectedRoute></Suspense>} />

        {/* ── ADMIN ── */}
        <Route path="/admin" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><AdminDashboard /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/profile" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Profile /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/students" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Students /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/teachers" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Teachers /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/parents" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Parents /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/classes" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Classes /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/subjects" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Subjects /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/timetable" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Timetable /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/attendance" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Attendance /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/examinations" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Examinations /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/assignments" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Assignments /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/results" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Results /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/reports" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Reports /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/enrollment" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><EnrollmentManagement /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/academic-years" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><AcademicYearManagement /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/settings" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Settings /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/users" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><UserManagement /></DashboardLayout></ProtectedRoute></Suspense>} />
        <Route path="/admin/announcements" element={<Suspense fallback={<PageFallback />}><ProtectedRoute role="admin"><DashboardLayout role="admin" user={user} onLogout={logout}><Announcements /></DashboardLayout></ProtectedRoute></Suspense>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
