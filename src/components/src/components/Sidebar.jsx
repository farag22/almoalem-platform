import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Layers,
  CalendarCheck,
  Wallet,
  QrCode,
  CalendarDays,
  FileSpreadsheet,
  BookOpen,
  MessageSquareText,
  UserCog,
  BarChart3,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/dashboard/students', label: 'الطلاب', icon: Users },
  { to: '/dashboard/groups', label: 'المجاميع', icon: Layers },
  { to: '/dashboard/attendance', label: 'الحضور', icon: CalendarCheck },
  { to: '/dashboard/payments', label: 'المصاريف', icon: Wallet },
  { to: '/dashboard/sessions', label: 'ماسح QR', icon: QrCode },
  { to: '/dashboard/timetable', label: 'الجدول والتقويم', icon: CalendarDays },
  { to: '/dashboard/quizzes', label: 'الاختبارات والواجبات', icon: FileSpreadsheet },
  { to: '/dashboard/question-bank', label: 'بنك الأسئلة', icon: BookOpen },
  { to: '/dashboard/broadcasts', label: 'الرسائل والمنشورات', icon: MessageSquareText },
  { to: '/dashboard/assistants', label: 'المساعدين والصلاحيات', icon: UserCog },
  { to: '/dashboard/reports', label: 'التقارير الشاملة', icon: BarChart3 },
]

export default function Sidebar({ onClose }) {
  return (
    <aside className="flex h-full flex-col bg-slate-900 text-slate-300 w-64">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white font-extrabold text-lg shadow-md">
          ت
        </div>
        <div>
          <h1 className="font-extrabold text-white text-base">منصة تعليم</h1>
          <p className="text-[11px] text-slate-400 font-medium">إدارة السنتر والمجاميع</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer / Version info */}
      <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-500 font-medium">
        منصة المعلم الذكية v2.0
      </div>
    </aside>
  )
}
