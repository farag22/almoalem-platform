import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Layers,
  CalendarCheck,
  Wallet,
  TrendingUp,
  ChevronLeft,
  UserCheck,
  UserX,
  Clock,
  QrCode,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Spinner } from '../App'
import { fmtDate } from '../lib/constants'

export default function Dashboard() {
  const { profile, user, teacherId } = useAuth()
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [groups, setGroups] = useState([])
  const [todayAttendance, setTodayAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)

    const { data: myStudentIds } = await supabase
      .from('students')
      .select('id')
      .eq('teacher_id', teacherId)

    const ids = myStudentIds?.map((s) => s.id) ?? []

    const [g, s, a, p, attToday] = await Promise.all([
      supabase
        .from('groups')
        .select('id, group_name, color_code')
        .eq('teacher_id', teacherId)
        .order('created_at'),
      supabase.from('students').select('id, group_id').eq('teacher_id', teacherId),
      ids.length
        ? supabase.from('attendance').select('student_id, session_date, status').in('student_id', ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase.from('payments').select('amount, notes').in('student_id', ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase
            .from('attendance')
            .select('status, student_id, session_date, students(student_name)')
            .eq('session_date', today)
            .in('student_id', ids)
        : Promise.resolve({ data: [] }),
    ])

    setGroups(g.data ?? [])
    const students = s.data ?? []
    const attendanceRecords = a.data ?? []
    const payments = p.data ?? []
    setTodayAttendance(attToday.data ?? [])

    const todayStatus = attToday.data ?? []

    setStats({
      students: students.length,
      groups: g.data?.length ?? 0,
      attendanceToday: todayStatus.length,
      present: todayStatus.filter((x) => x.status === 'present' || x.status === 'حاضر').length,
      absent: todayStatus.filter((x) => x.status === 'absent' || x.status === 'غائب').length,
      late: todayStatus.filter((x) => x.status === 'late' || x.status === 'متأخر').length,
      attendanceCoverage:
        students.length > 0 ? Math.round((todayStatus.length / students.length) * 100) : 0,
      totalCollected: payments.reduce((sum, x) => sum + (x.notes === 'تم الدفع' ? Number(x.amount || 0) : 0), 0),
      totalExpected: payments.reduce((sum, x) => sum + Number(x.amount || 0), 0),
      attendanceTotal: attendanceRecords.length,
    })
    setLoading(false)
  }

  useEffect(() => {
    if (teacherId) {
      load()
    }
  }, [teacherId])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const cards = [
    {
      title: 'إجمالي الطلاب',
      value: stats.students,
      icon: Users,
      color: 'bg-primary-50 text-primary-600',
      to: '/dashboard/students',
    },
    {
      title: 'المجاميع',
      value: stats.groups,
      icon: Layers,
      color: 'bg-violet-50 text-violet-600',
      to: '/dashboard/groups',
    },
    {
      title: 'حضور اليوم',
      value: `${stats.attendanceCoverage}%`,
      sub: `${stats.attendanceToday} / ${stats.students}`,
      icon: CalendarCheck,
      color: 'bg-emerald-50 text-emerald-600',
      to: '/dashboard/attendance',
    },
    {
      title: 'المحصّل من المصاريف',
      value: `${stats.totalCollected.toLocaleString('ar-EG')}`,
      sub: 'من أصل ' + stats.totalExpected.toLocaleString('ar-EG') + ' ج.م',
      icon: Wallet,
      color: 'bg-amber-50 text-amber-600',
      to: '/dashboard/payments',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="card flex flex-col gap-4 bg-gradient-to-l from-primary-700 to-indigo-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between shadow-lg">
        <div>
          <h1 className="text-2xl font-extrabold">
            مرحباً، {profile?.full_name || user?.email || 'أستاذي الفاضل'}
          </h1>
          <p className="mt-1 text-sm text-indigo-200">
            إليك ملخص منصتك لهذا اليوم — {fmtDate(new Date())}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Link
            to="/dashboard/sessions"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/25 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white backdrop-blur-md transition-all hover:bg-white/35 active:scale-95 shadow-sm"
          >
            <QrCode className="h-4 w-4 shrink-0" />
            <span>ماسح Qr</span>
          </Link>
          <Link
            to="/dashboard/attendance"
            className="flex items-center justify-center rounded-xl bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition-all active:scale-95"
          >
            تسجيل الحضور
          </Link>
          <Link
            to="/dashboard/students"
            className="flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-700 hover:bg-indigo-50 transition-all active:scale-95"
          >
            إضافة طالب
          </Link>
          <a
            href="https://apk.e-droid.net/apk/app4153335-qeh2f5.apk?v=1"
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>تنزيل التطبيق</span>
          </a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.title}
            to={c.to}
            className="card flex items-center gap-4 p-5 transition hover:shadow-md"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.color}`}
            >
              <c.icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">{c.title}</p>
              <p className="text-2xl font-extrabold text-slate-800">{c.value}</p>
              {c.sub && <p className="text-xs font-medium text-slate-400">{c.sub}</p>}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today attendance breakdown */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-extrabold text-slate-800">حضور اليوم</h2>
            </div>
            <Link
              to="/dashboard/attendance"
              className="inline-flex items-center text-sm font-bold text-primary-600 hover:underline"
            >
              التفاصيل
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Pill
              label="حاضر"
              value={stats.present}
              cls="bg-emerald-50 text-emerald-700"
              icon={<UserCheck className="h-4 w-4" />}
            />
            <Pill
              label="غائب"
              value={stats.absent}
              cls="bg-rose-50 text-rose-700"
              icon={<UserX className="h-4 w-4" />}
            />
            <Pill
              label="متأخر"
              value={stats.late}
              cls="bg-amber-50 text-amber-700"
              icon={<Clock className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Groups overview */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-violet-600" />
              <h2 className="text-lg font-extrabold text-slate-800">المجاميع</h2>
            </div>
            <Link
              to="/dashboard/groups"
              className="inline-flex items-center text-sm font-bold text-primary-600 hover:underline"
            >
              إدارتها
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
          {groups.length ? (
            <ul className="space-y-2">
              {groups.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: g.color_code }}
                    />
                    <span className="font-bold text-slate-700">{g.group_name}</span>
                  </div>
                  <Link
                    to="/dashboard/students"
                    className="text-xs font-bold text-primary-600 hover:underline"
                  >
                    عرض الطلاب
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link
              to="/dashboard/groups"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-8 text-sm font-bold text-slate-400 transition hover:border-primary-300 hover:text-primary-500"
            >
              + أنشئ مجموعة جديدة
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function Pill({ label, value, cls, icon }) {
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl py-4 ${cls}`}>
      <div className="flex items-center gap-1 text-sm font-bold">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  )
}
