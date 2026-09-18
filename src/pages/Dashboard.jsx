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
  MessageCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../App'
import { fmtDate } from '../lib/constants'

export default function Dashboard() {
  const { profile, user, teacherId } = useAuth()
  const [currentProfile, setCurrentProfile] = useState(profile)
  const [stats, setStats] = useState(null)
  const [groups, setGroups] = useState([])
  const [todayAttendance, setTodayAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  // حساب الأيام المتبقية للتجربة
  const calculateDaysLeft = () => {
    const profileData = currentProfile || profile
    if (!profileData?.created_at) return 30
    const created = new Date(profileData.created_at)
    const expiry = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000)
    const diffTime = expiry - new Date()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const daysLeft = calculateDaysLeft()

  useEffect(() => {
    async function fetchLatestProfile() {
      const targetId = user?.id || teacherId
      if (!targetId) {
        if (profile) setCurrentProfile(profile)
        return
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .maybeSingle()

      if (data) {
        setCurrentProfile({ ...profile, ...data })
      } else if (profile) {
        setCurrentProfile(profile)
      }
    }
    fetchLatestProfile()
  }, [user, teacherId, profile])

  const load = async () => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)

    const targetTeacherId = currentProfile?.id || teacherId || user?.id

    const { data: myStudentIds } = await supabase
      .from('students')
      .select('id')
      .eq('teacher_id', targetTeacherId)

    const ids = myStudentIds?.map((s) => s.id) ?? []

    const [g, s, a, p, attToday] = await Promise.all([
      supabase
        .from('groups')
        .select('id, group_name, color_code')
        .eq('teacher_id', targetTeacherId)
        .order('created_at'),
      supabase.from('students').select('id, group_id').eq('teacher_id', targetTeacherId),
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
    if (teacherId || currentProfile?.id || user?.id) {
      load()
    }
  }, [teacherId, currentProfile?.id, user?.id])

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
      value: stats?.students || 0,
      icon: Users,
      color: 'bg-primary-50 text-primary-600',
      to: '/dashboard/students',
    },
    {
      title: 'المجاميع',
      value: stats?.groups || 0,
      icon: Layers,
      color: 'bg-violet-50 text-violet-600',
      to: '/dashboard/groups',
    },
    {
      title: 'حضور اليوم',
      value: `${stats?.attendanceCoverage || 0}%`,
      sub: `${stats?.attendanceToday || 0} / ${stats?.students || 0}`,
      icon: CalendarCheck,
      color: 'bg-emerald-50 text-emerald-600',
      to: '/dashboard/attendance',
    },
    {
      title: 'المحصّل من المصاريف',
      value: `${(stats?.totalCollected || 0).toLocaleString('ar-EG')}`,
      sub: 'من أصل ' + (stats?.totalExpected || 0).toLocaleString('ar-EG') + ' ج.م',
      icon: Wallet,
      color: 'bg-amber-50 text-amber-600',
      to: '/dashboard/payments',
    },
  ]

  const activeProfile = currentProfile || profile

  const displayName = profile?.full_name?.trim() || activeProfile?.full_name?.trim() || 'فرج أبو رحيم';
  const displayAvatar = profile?.avatar_url || activeProfile?.avatar_url;

  const isSubscriptionActive = activeProfile?.subscription_status === 'active' || profile?.subscription_status === 'active';

  return (
    <div className="space-y-6">
      {/* شريط تنبيه صلاحية التجربة */}
      {!isSubscriptionActive && (
        <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border shadow-sm ${
          daysLeft <= 5 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${daysLeft <= 5 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm">
                {daysLeft > 0 ? `فترة التجربة نشطة: متبقي ${daysLeft} يوماً على انتهاء اشتراكك` : `انتهت فترة التجربة المجانية`}
              </h2>
              <p className="text-xs opacity-80 mt-0.5">
                قيمة تجديد الاشتراك الشهري 100 جنيه. لتفادي توقف المنصة تواصل معنا عبر الواتساب لتفعيل الحساب.
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/201115413154?text=السلام%20عليكم،%20أرغب%20في%20تجديد%20اشتراك%20منصة%20السنتر%20(100%20جنيه)"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 shadow-sm flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>تفعيل عبر الواتساب (01115413154)</span>
          </a>
        </div>
      )}

      {/* Welcome Card */}
      <div className="card flex flex-col gap-4 bg-gradient-to-l from-primary-700 to-indigo-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between shadow-lg">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-bold text-white overflow-hidden border-2 border-white/20 shadow-inner">
            {displayAvatar ? (
              <img src={displayAvatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold truncate">
              مرحباً، {displayName}
            </h1>
            <p className="mt-1 text-sm text-indigo-200">
              إليك ملخص منصتك لهذا اليوم — {fmtDate(new Date())}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center shrink-0">
          <Link
            to="/dashboard/sessions"
            className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white shadow-md transition-all hover:bg-emerald-600 active:scale-95"
          >
            <QrCode className="h-5 w-5 shrink-0" />
            <span>ماسح Qr السريع</span>
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
          {/* زر تنزيل التطبيق المباشر بالرابط الجديد */}
          <a
            href="https://files.manuscdn.com/user_upload_by_module/session_file/310519663881195004/pjzDWkNjMgdgdkJr.apk"
            target="_blank"
            rel="noopener noreferrer"
            download
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
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
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.title}
            to={c.to}
            className="card flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 transition hover:shadow-md"
          >
            <div
              className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl ${c.color}`}
            >
              <c.icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500">{c.title}</p>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-800">{c.value}</p>
              {c.sub && <p className="text-[10px] sm:text-xs font-medium text-slate-400">{c.sub}</p>}
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
              value={stats?.present || 0}
              cls="bg-emerald-50 text-emerald-700"
              icon={<UserCheck className="h-4 w-4" />}
            />
            <Pill
              label="غائب"
              value={stats?.absent || 0}
              cls="bg-rose-50 text-rose-700"
              icon={<UserX className="h-4 w-4" />}
            />
            <Pill
              label="متأخر"
              value={stats?.late || 0}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: g.color_code }}
                    />
                    <span className="font-bold text-slate-700 text-sm truncate max-w-[110px]">{g.group_name}</span>
                  </div>
                  <Link
                    to="/dashboard/students"
                    className="text-[11px] font-bold text-primary-600 hover:underline shrink-0"
                  >
                    الطلاب
                  </Link>
                </div>
              ))}
            </div>
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
