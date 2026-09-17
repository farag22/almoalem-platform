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

  const setRole = async (teacher, role) => {
    if (!window.confirm(`تأكيد تغيير حالة الحساب لـ «${teacher.full_name || teacher.email}»؟`)) return
    setBusyId(teacher.id)
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', teacher.id)
    if (error) {
      toast('تعذر تحديث الحساب: ' + error.message, 'error')
    } else {
      toast('تم تحديث الحساب بنجاح')
      load()
    }
    setBusyId(null)
  }

  // دالة تفعيل الاشتراك عبر دالة الـ RPC المباشرة لضمان القبول الفوري
  const handleActivateSubscription = async (teacherId) => {
    setBusyId(teacherId)
    
    const { error } = await supabase.rpc('force_activate_subscription', {
      teacher_id: teacherId
    })

    if (error) {
      toast('تعذر التفعيل: ' + error.message, 'error')
    } else {
      toast('تم تفعيل الاشتراك بنجاح لمدة 30 يوماً!')
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId
            ? { ...t, subscription_status: 'active', subscription_end_date: newExpiry }
            : t
        )
      )
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
    <div className="min-h-screen bg-slate-100 pb-12">
      <header className="bg-gradient-to-l from-slate-800 to-slate-900 px-4 py-5 text-white lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
        <div className="card flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-semibold text-slate-500">مرحباً،</p>
            <p className="text-xl font-extrabold text-slate-800">{profile?.full_name || 'المدير'}</p>
          </div>
          <p className="hidden text-sm text-slate-400 sm:block">{fmtDate(new Date())}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="card flex items-center gap-3 p-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${c.cls}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">{c.label}</p>
                <p className="text-xl font-extrabold text-slate-800">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="card p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-extrabold text-violet-700">{stats?.admins ?? 0}</p>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500">مديري نظام</p>
          </div>
          <div className="card p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-700">{stats?.activeTeachers ?? 0}</p>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500">مشتركين نشطين</p>
          </div>
          <div className="card p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-extrabold text-rose-700">{stats?.disabled ?? 0}</p>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500">معطّلة</p>
          </div>
        </div>

        {/* Teachers management section */}
        <div className="card overflow-hidden p-0">
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
            <div className="block divide-y divide-slate-100 p-4 space-y-4">
              {teachers.map((t) => {
                const isSelf = t.id === profile?.id
                const isActiveSub = t.subscription_status === 'active'

                return (
                  <div key={t.id} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-base font-extrabold text-primary-700">
                          {(t.full_name || 'م').charAt(0)}
                        </span>
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm">
                            {t.full_name || 'معلم جديد'}
                            {isSelf && <span className="mr-1.5 text-[10px] text-primary-600 font-bold">(أنت)</span>}
                          </p>
                          <p className="text-xs text-slate-500 font-medium" dir="ltr">{t.email}</p>
                        </div>
                      </div>
                      <div>
                        {isActiveSub ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                            مشترك نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700">
                            تجريبي / غير مفعل
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleActivateSubscription(t.id)}
                        disabled={busyId === t.id}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition shadow-sm text-center"
                      >
                        {isActiveSub ? 'تجديد الاشتراك (100 ج.م)' : 'تفعيل الاشتراك (100 ج.م)'}
                      </button>

                      {t.role !== 'admin' && (
                        <button
                          onClick={() => setRole(t, 'admin')}
                          disabled={busyId === t.id}
                          className="bg-violet-50 hover:bg-violet-100 text-violet-700 px-3 py-2 rounded-xl text-xs font-bold transition"
                        >
                          أدمن
                        </button>
                      )}

                      {t.role === 'disabled' ? (
                        <button
                          onClick={() => setRole(t, 'teacher')}
                          disabled={busyId === t.id}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold transition"
                        >
                          فك التعطيل
                        </button>
                      ) : (
                        <button
                          onClick={() => setRole(t, 'disabled')}
                          disabled={busyId === t.id || t.role === 'admin'}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold transition"
                        >
                          تعطيل
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
