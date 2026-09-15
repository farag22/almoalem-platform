import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import TeacherLogin from './pages/TeacherLogin'
import ParentView from './pages/ParentView'
import DashboardLayout from './components/layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import GroupsPage from './pages/GroupsPage'
import StudentsPage from './pages/StudentsPage'
import AttendancePage from './pages/AttendancePage'
import PaymentsPage from './pages/PaymentsPage'
import SessionsPage from './pages/SessionsPage'
import AdminDashboard from './pages/AdminDashboard'
import LandingPage from './pages/LandingPage'
import ProfilePage from './pages/ProfilePage'

// استيراد صفحات الإدارة الشاملة (بدون صفحة المساعدين)
import TimetablePage from './pages/TimetablePage'
import QuizzesPage from './pages/QuizzesPage'
import QuestionBankPage from './pages/QuestionBankPage'
import BroadcastsPage from './pages/BroadcastsPage'
import ReportsPage from './pages/ReportsPage'

export function Spinner({ size = 'h-8 w-8' }) {
  return (
    <div
      className={`${size} animate-spin rounded-full border-4 border-primary-200 border-t-primary-600`}
    />
  )
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/teacher/login" replace />
  if (profile?.role === 'disabled') return <Navigate to="/disabled" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/teacher/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function DisabledScreen() {
  const { signOut } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-500">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-extrabold text-slate-800">تم تعطيل حسابك</h1>
      <p className="max-w-md text-sm leading-6 text-slate-500">
        حسابك الحالي غير مفعّل. يرجى التواصل مع إدارة المنصة لإعادة تفعيله.
      </p>
      <button
        onClick={async () => {
          await signOut()
          window.location.href = '/teacher/login'
        }}
        className="btn-outline"
      >
        تسجيل الدخول بحساب آخر
      </button>
    </div>
  )
}

function HomeGate({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenSpinner />
  if (user) {
    if (profile?.role === 'disabled') return <Navigate to="/disabled" replace />
    if (profile?.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/teacher/login" element={<TeacherLogin />} />
      <Route path="/parent" element={<ParentView />} />
      <Route path="/parent/:code" element={<ParentView />} />
      <Route path="/student" element={<ParentView />} />
      <Route path="/student/:code" element={<ParentView />} />
      <Route path="/disabled" element={<DisabledScreen />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        
        {/* مسارات الأقسام الشاملة */}
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="quizzes" element={<QuizzesPage />} />
        <Route path="question-bank" element={<QuestionBankPage />} />
        <Route path="broadcasts" element={<BroadcastsPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
      <Route
        path="/"
        element={
          <HomeGate>
            <LandingPage />
          </HomeGate>
        }
      />
      <Route
        path="*"
        element={
          <HomeGate>
            <LandingPage />
          </HomeGate>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
