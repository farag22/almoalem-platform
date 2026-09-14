import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Wallet,
  Layers,
  LogOut,
  GraduationCap,
  Menu,
  X,
  Phone,
  Calendar,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ToastProvider } from '../ui/Toast'
import { Spinner } from '../../App'

const NAV = [
  { to: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/dashboard/groups', label: 'المجاميع', icon: Layers },
  { to: '/dashboard/students', label: 'الطلاب', icon: Users },
  { to: '/dashboard/attendance', label: 'الحضور', icon: CalendarCheck },
  { to: '/dashboard/payments', label: 'المصاريف', icon: Wallet },
  { to: '/dashboard/sessions', label: 'الحصص', icon: Calendar },
]

function SidebarContent({ onNavigate }) {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-lg font-extrabold text-white">منصة تعليم</p>
          <p className="text-xs text-indigo-200">لوحة المعلم</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-white/15 text-white shadow-inner'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-white/15 text-white shadow-inner'
                  : 'text-amber-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zM4.05 12a7.95 7.95 0 001.43 4.56 8 8 0 013.07-1.4A8 8 0 0012 13a8 8 0 003.45 2.16 8 8 0 013.07 1.4A7.95 7.95 0 0019.95 12a7.95 7.95 0 00-1.43-4.56 8 8 0 01-3.07 1.4A8 8 0 0012 6.84a8 8 0 01-3.45-2.16A8 8 0 014.05 12z"
              />
            </svg>
            لوحة الإدارة
          </NavLink>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white">
            {(profile?.full_name || 'م').charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {profile?.full_name || 'المعلم'}
            </p>
            <p className="truncate text-xs text-indigo-200">{profile?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut()
            navigate('/teacher/login')
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const { loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-100 pb-20 lg:pb-0">
        {/* Sidebar desktop */}
        <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 lg:block">
          <div className="h-full bg-gradient-to-b from-primary-700 to-primary-900">
            <SidebarContent />
          </div>
        </aside>

        {/* Sidebar mobile drawer (if opened from header) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 right-0 w-72">
              <div className="relative h-full bg-gradient-to-b from-primary-700 to-primary-900 shadow-2xl">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute top-4 left-4 rounded-lg bg-white/10 p-2 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </div>
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex min-h-screen flex-1 flex-col lg:mr-64">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-base font-extrabold text-slate-800 lg:hidden">منصة تعليم</h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="hidden sm:inline-flex">
                {new Date().toLocaleDateString('ar-EG', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <Phone className="h-3.5 w-3.5" />
                متصل
              </span>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8">
            <Outlet />
          </main>
        </div>

        {/* Bottom Navigation Bar for Mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 shadow-lg backdrop-blur lg:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-xl p-2 text-[11px] font-bold transition ${
                  isActive
                    ? 'text-primary-600 scale-105'
                    : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </ToastProvider>
  )
}
