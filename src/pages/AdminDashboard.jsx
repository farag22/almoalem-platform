import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Layers,
  Wallet,
  ShieldCheck,
  UserCheck,
  UserX,
  GraduationCap,
  LogOut,
  LayoutDashboard,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Spinner } from '../App'
import { fmtDate } from '../lib/constants'

const ROLE_META = {
  admin: { label: 'مدير النظام', cls: 'bg-violet-100 text-violet-700' },
  teacher: { label: 'معلم', cls: 'bg-emerald-100 text-emerald-700' },
  disabled: { label: 'معطّل', cls: 'bg-rose-100 text-rose-700' },
}

export default function AdminDashboard() {
  const toast = useToast()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [tRes, sRes, gRes, pRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('students').select('id'),
      supabase.from('groups').select('id'),
      supabase.from('payments').select('amount, notes'),
    ])
    const profilesList = tRes.data ?? []
    setTeachers(profilesList)

    const students = sRes.data ?? []
    const groups = gRes.data ?? []
    const payments = pRes.data ?? []

    const totalCollected = payments.reduce((sum, x) => sum + (x.notes === 'تم الدفع' ? Number(x.amount || 0) : 0), 0)

    setStats({
      teachers: profilesList.length,
      activeTeachers: profilesList.filter((t) => t.role !== 'disabled' && t.subscription_status === 'active').length,
      admins: profilesList.filter((t) => t.role === 'admin').length,
      disabled: profilesList.filter((t) => t.role === 'disabled').length,
      students: students.length,
      groups: groups.length,
      collected: totalCollected,
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // دالة تغيير الصلاحية أو تعطيل/تفعيل الحساب
  const setRole = async (teacher, role) => {
    if (!window.confirm(`تأكيد تغيير حالة الحساب لـ «${teacher.full_name || teacher.email}»؟`)) return
    setBusyId(teacher.id)
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', teacher.id)
    if (error) toast('تعذر تحديث الحساب: ' + error.message, 'error')
    else {
      toast('تم تحديث الحساب بنجاح')
      load()
    }
    setBusyId(null)
  }

  // دالة تفعيل الاشتراك الشهري (30 يوماً / 100 ج.م)
  const handleActivateSubscription = async (teacherId) => {
    setBusyId(teacherId)
    const newExpiry = new Date()
    newExpiry.setDate(newExpiry.getDate() + 30)

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_end_date: newExpiry.toISOString(),
        role: 'teacher',
      })
      .eq('id', teacherId)

    if (error) {
      toast('تعذر تفعيل الاشتراك: ' + error.message, 'error')
    } else {
      toast('تم تفعيل الاشتراك بنجاح لمدة 30 يوماً!')
      load()
    }
    setBusyId(null)
  }

  const cards = useMemo(
    () => [
      { label: 'إجمالي المعلمين', value: stats?.teachers ?? 0, icon: Users, cls: 'bg-primary-50 text-primary-600' },
      { label: 'الطلاب', value: stats?.students ?? 0, icon: GraduationCap, cls: 'bg-emerald-50 text-emerald-600' },
      { label: 'المجاميع', value: stats?.groups ?? 0, icon: Layers, cls: 'bg-violet-50 text-violet-600' },
      { label: 'المحصّل (ج.م)', value: (stats?.collected ?? 0).toLocaleString('ar-EG'), icon: Wallet, cls: 'bg-amber-50 text-amber-600' },
    ],
    [stats],
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-l from-slate-800 to-slate-900 px-4 py-5 text-white lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">لوحة تحكم السوبر أدمن</h1>
              <p className="text-xs text-slate-300">إدارة المعلمين، الاشتراكات (100 ج.م)، والصلاحيات</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
            >
              <LayoutDashboard className="h-4 w-4" />
              التبديل لواجهة المعلم
            </button>
            <button
              onClick={async () => {
                await signOut()
                navigate('/teacher/login')
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8">
        {/* Welcome strip */}
        <div className="card flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-semibold text-slate-500">مرحباً،</p>
            <p className="text-xl font-extrabold text-slate-800">{profile?.full_name || 'المدير'}</p>
          </div>
          <p className="hidden text-sm text-slate-400 sm:block">{fmtDate(new Date())}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="card flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.cls}`}>
                <c.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">{c.label}</p>
                <p className="text-2xl font-extrabold text-slate-800">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Role breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-extrabold text-violet-700">{stats?.admins ?? 0}</p>
            <p className="text-xs font-bold text-slate-500">مديري نظام</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-700">{stats?.activeTeachers ?? 0}</p>
            <p className="text-xs font-bold text-slate-500">معلمين مشتركين (نشطين)</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-extrabold text-rose-700">{stats?.disabled ?? 0}</p>
            <p className="text-xs font-bold text-slate-500">حسابات معطّلة</p>
          </div>
        </div>

        {/* Teachers table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">إدارة المعلمين والاشتراكات</h2>
              <p className="text-xs text-slate-400">تفعيل الاشتراكات (100 ج.م) أو تعطيل الحسابات</p>
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>
          </div>

          {teachers.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">لا يوجد معلمون مسجلون بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="th">المعلم</th>
                    <th className="th">البريد الإلكتروني</th>
                    <th className="th">حالة الاشتراك</th>
                    <th className="th">تاريخ التسجيل</th>
                    <th className="th text-center">إجراءات التفعيل والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {teachers.map((t) => {
                    const meta = ROLE_META[t.role] || ROLE_META.teacher
                    const isSelf = t.id === profile?.id
                    const isActiveSub = t.subscription_status === 'active'

                    return (
                      <tr key={t.id} className="transition hover:bg-slate-50/60">
                        <td className="td">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-600">
                              {(t.full_name || 'م').charAt(0)}
                            </span>
                            <span className="font-bold">
                              {t.full_name || 'معلم جديد'}
                              {isSelf && (
                                <span className="mr-2 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-600">
                                  أنت
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="td" dir="ltr">
                          {t.email || '—'}
                        </td>
                        <td className="td">
                          {isActiveSub ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              مشترك نشط
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-700">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              تجريبي / منتهي
                            </span>
                          )}
                        </td>
                        <td className="td text-xs text-slate-500">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('ar-EG') : '—'}
                        </td>
                        <td className="td">
                          <div className="flex justify-center gap-2 items-center">
                            {/* زر تفعيل الاشتراك بعد دفع 100 جنيه */}
                            <button
                              onClick={() => handleActivateSubscription(t.id)}
                              disabled={busyId === t.id}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                              title="تفعيل الاشتراك لمدة 30 يوماً"
                            >
                              تفعيل (100 ج.م)
                            </button>

                            {/* ترقية لمدير */}
                            {t.role !== 'admin' && (
                              <button
                                onClick={() => setRole(t, 'admin')}
                                disabled={busyId === t.id}
                                className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
                              >
                                ترقية لأدمن
                              </button>
                            )}

                            {/* زر التعطيل / التفعيل */}
                            {t.role === 'disabled' ? (
                              <button
                                onClick={() => setRole(t, 'teacher')}
                                disabled={busyId === t.id}
                                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                إلغاء التعطيل
                              </button>
                            ) : (
                              <button
                                onClick={() => setRole(t, 'disabled')}
                                disabled={busyId === t.id || t.role === 'admin'}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                  t.role === 'admin'
                                    ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                }`}
                                title={t.role === 'admin' ? 'لا يمكن تعطيل مدير النظام' : 'تعطيل الحساب'}
                              >
                                تعطيل
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
