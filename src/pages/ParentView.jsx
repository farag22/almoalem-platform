import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  GraduationCap,
  Search,
  CalendarCheck,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  UserRound,
  TrendingUp,
  ArrowLeft,
  NotebookPen,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ATTENDANCE_STATUS, HOMEWORK_STATUS, fmtDate, fmtMoney, homeworkCompliance, evalScoreBadge } from '../lib/constants'

const statusIcon = {
  present: <CheckCircle2 className="h-4 w-4" />,
  absent: <XCircle className="h-4 w-4" />,
  late: <Clock className="h-4 w-4" />,
}

export default function ParentView() {
  const { code: urlCode } = useParams()
  const [inputCode, setInputCode] = useState(urlCode ?? '')
  const [searchedCode, setSearchedCode] = useState(urlCode ?? '')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  const search = useCallback(async (rawCode) => {
    const code = (rawCode ?? inputCode).trim()
    if (!code) {
      setError('يرجى إدخال كود الطالب')
      setData(null)
      return
    }
    setError('')
    setLoading(true)
    setData(null)

    // البحث بمرونة أكبر (يطابق الكود بغض النظر عن حالة الحروف الكبيرة/الصغيرة)
    const { data: student, error: err } = await supabase
      .from('students')
      .select('*, groups(group_name, color_code), teachers(full_name)')
      .or(`student_code.ilike.${code},id.eq.${code}`)
      .maybeSingle()

    if (err || !student) {
      setError('الكود غير صحيح أو الطالب غير موجود')
      setLoading(false)
      return
    }

    const [att, pay, evals] = await Promise.all([
      supabase
        .from('attendance')
        .select('session_date, status')
        .eq('student_id', student.id)
        .order('session_date', { ascending: false }),
      supabase
        .from('payments')
        .select('amount, is_paid, paid_at')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('session_evaluations')
        .select('title, session_date, homework_status, score, max_score, note')
        .eq('student_id', student.id)
        .order('session_date', { ascending: false }),
    ])

    setSearchedCode(code)
    setData({
      ...student,
      group_name: student.groups?.group_name || 'بدون مجموعة',
      group_color: student.groups?.color_code || '#2547eb',
      teacher_name: student.teachers?.full_name || 'المعلم',
      attendance: att.data ?? [],
      payments: pay.data ?? [],
      evaluations: (evals.data ?? []).map((e) => ({
        title: e.title,
        date: e.session_date,
        homework: e.homework_status,
        score: e.score,
        total: e.max_score,
        note: e.note,
      })),
    })
    setLoading(false)
  }, [inputCode])

  const onSubmit = (e) => {
    e.preventDefault()
    search()
  }

  const onReset = () => {
    setData(null)
    setError('')
    setInputCode('')
    setSearchedCode('')
    if (inputRef.current) inputRef.current.focus()
  }

  useEffect(() => {
    if (urlCode) search(urlCode)
  }, [urlCode, search])

  const presentCount = data?.attendance?.filter((a) => a.status === 'present').length ?? 0
  const absentCount = data?.attendance?.filter((a) => a.status === 'absent').length ?? 0
  const lateCount = data?.attendance?.filter((a) => a.status === 'late').length ?? 0
  const totalRecords = data?.attendance?.length ?? 0
  const attendanceRate =
    totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0
  const totalPaid = data?.payments?.reduce((s, p) => s + (p.is_paid ? Number(p.amount) : 0), 0) ?? 0
  const totalAmount = data?.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0
  const remaining = Math.max(0, totalAmount - totalPaid)

  const evaluations = data?.evaluations ?? []
  const compliance = homeworkCompliance(evaluations)
  const latestQuizzes = [...evaluations]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.title.localeCompare(a.title))
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Header */}
      <header className="bg-gradient-to-l from-primary-700 via-primary-800 to-indigo-900 px-4 py-6 text-white lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            <span className="text-lg font-extrabold">منصة تعليم</span>
          </div>
          <Link to="/teacher/login" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20">
            دخول المعلم
          </Link>
        </div>
      </header>

      <main className="mx-auto -mt-5 max-w-3xl space-y-5 px-4">
        {/* Search card */}
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary-600" />
            <h1 className="text-xl font-extrabold text-slate-800">متابعة الطالب</h1>
          </div>
          <p className="mb-4 text-sm leading-6 text-slate-500">
            أدخل كود الطالب المُسلَّم من المدرسة لمتابعة الحضور والمصاريف.
            <br />
            الوصول بقراءة فقط للحفاظ على سرية البيانات.
          </p>

          <form onSubmit={onSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                className="input pr-10 text-lg font-bold tracking-widest"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="كود الطالب"
                dir="ltr"
                autoFocus={!urlCode}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary shrink-0 px-5">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'بحث'}
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              <span>{error}</span>
              <button onClick={onReset} className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-rose-500 hover:bg-rose-100">
                مسح
              </button>
            </div>
          )}
        </div>

        {/* Result */}
        {data && (
          <>
            {/* Student card */}
            <div className="card overflow-hidden">
              <div className="h-2" style={{ backgroundColor: data.group_color || '#2547eb' }} />
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
                    style={{ backgroundColor: data.group_color || '#2547eb' }}
                  >
                    {data.student_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-extrabold text-slate-800">{data.student_name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-white"
                        style={{ backgroundColor: data.group_color || '#2547eb' }}
                      >
                        {data.group_name}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                        {data.teacher_name}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] font-bold tracking-wider text-slate-400" dir="ltr">
                      {searchedCode}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <MiniStat label="حاضر" value={presentCount} cls="text-emerald-600" />
                  <MiniStat label="غائب" value={absentCount} cls="text-rose-600" />
                  <MiniStat label="متأخر" value={lateCount} cls="text-amber-600" />
                </div>
              </div>
            </div>

            {/* Attendance rate + payments summary */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <section className="card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  <h3 className="font-extrabold text-slate-800">نسبة الحضور</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-slate-100" strokeWidth="4" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${(attendanceRate / 100) * 97.4} 97.4`}
                      />
                    </svg>
                    <span className="absolute text-xl font-extrabold text-slate-800">
                      {totalRecords > 0 ? `${attendanceRate}%` : '—'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-600">
                      {totalRecords > 0
                        ? `${presentCount} حضور من أصل ${totalRecords} يوم`
                        : 'لا توجد سجلات حضور بعد'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">محسوبة من السجلات المسجلة فقط</p>
                  </div>
                </div>
              </section>

              <section className="card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary-600" />
                  <h3 className="font-extrabold text-slate-800">المصاريف</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-4 text-center">
                    <p className="text-xs font-semibold text-emerald-600">المدفوع</p>
                    <p className="mt-1 text-lg font-extrabold text-emerald-700">{fmtMoney(totalPaid)} ج.م</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-4 text-center">
                    <p className="text-xs font-semibold text-rose-600">المتبقي</p>
                    <p className="mt-1 text-lg font-extrabold text-rose-700">{fmtMoney(remaining)} ج.م</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Academic report */}
            <section className="card p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
                <NotebookPen className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-extrabold text-slate-800">التقرير الأكاديمي</h3>
              </div>

              {evaluations.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  لم تُسجَّل تقييمات بعد — يبدأ المعلم في الرصد خلال الحصص القادمة
                </p>
              ) : (
                <>
                  {/* Homework compliance */}
                  <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-600">نسبة التزام الطالب بالواجبات</p>
                      <span
                        className={`text-lg font-extrabold ${
                          compliance >= 80
                            ? 'text-emerald-600'
                            : compliance >= 50
                              ? 'text-amber-600'
                              : 'text-rose-600'
                        }`}
                      >
                        {compliance}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          compliance >= 80
                            ? 'bg-emerald-500'
                            : compliance >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${compliance}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      محسوبة من {evaluations.length} {evaluations.length === 1 ? 'حصة مسجلة' : 'حصص مسجلة'}
                    </p>
                  </div>

                  {/* Latest quizzes */}
                  <h4 className="mb-2 text-sm font-bold text-slate-600">آخر {latestQuizzes.length} اختبارات</h4>
                  <ul className="flex flex-col gap-2">
                    {latestQuizzes.map((e, i) => {
                      const hw = HOMEWORK_STATUS[e.homework] || HOMEWORK_STATUS.not_submitted
                      const showScore = e.score != null && e.total != null
                      return (
                        <li
                          key={i}
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-700">
                                {e.title || 'حصة'}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">{fmtDate(e.date)}</p>
                            </div>
                            <span className={`badge ${hw.color}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${hw.dot}`} />
                              {hw.label}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {showScore && (
                              <span className={`badge ${evalScoreBadge(e.score, e.total)}`}>
                                الدرجة: {e.score} / {e.total}
                              </span>
                            )}
                            {e.note && (
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                                {e.note}
                              </span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </section>

            {/* Attendance records */}
            <section className="card p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
                <CalendarCheck className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-extrabold text-slate-800">سجل الحضور والغياب</h3>
              </div>
              {data.attendance?.length ? (
                <ul className="divide-y divide-slate-100">
                  {data.attendance.map((a, i) => (
                    <li key={i} className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium text-slate-700">{fmtDate(a.session_date)}</span>
                      <span className={`badge ${ATTENDANCE_STATUS[a.status].color}`}>
                        {statusIcon[a.status]}
                        {ATTENDANCE_STATUS[a.status].label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">لا توجد سجلات حضور بعد</p>
              )}
            </section>

            {/* Payments list */}
            <section className="card p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Wallet className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-extrabold text-slate-800">تفاصيل المصاريف</h3>
              </div>
              {data.payments?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="th">المستحق</th>
                        <th className="th text-center">الحالة</th>
                        <th className="th text-center">تاريخ الدفع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.payments.map((p, i) => (
                        <tr key={i}>
                          <td className="td font-semibold">{fmtMoney(p.amount)} ج.م</td>
                          <td className="td text-center">
                            <span
                              className={`badge ${
                                p.is_paid
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {p.is_paid ? 'مدفوع' : 'غير مدفوع'}
                            </span>
                          </td>
                          <td className="td text-center text-xs text-slate-500">
                            {p.paid_at ? fmtDate(p.paid_at) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">لا توجد مدفوعات مسجلة بعد</p>
              )}
            </section>

            <div className="text-center">
              <button onClick={onReset} className="btn-outline">
                <ArrowLeft className="h-4 w-4" />
                البحث عن طالب آخر
              </button>
            </div>
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <p className="text-sm text-slate-500">جارِ تحميل بيانات الطالب...</p>
          </div>
        )}
      </main>
    </div>
  )
}

function MiniStat({ label, value, cls }) {
  return (
    <div className="rounded-xl bg-slate-50 py-3 text-center">
      <p className={`text-xl font-extrabold ${cls}`}>{value}</p>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
    </div>
  )
}
