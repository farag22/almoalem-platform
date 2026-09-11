import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, QrCode, ArrowLeft, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Spinner } from '../App'

export default function ParentLogin() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setError('يرجى إدخال كود الطالب')
      return
    }
    setError('')
    setLoading(true)

    const { data, error: err } = await supabase
      .from('students')
      .select('id, student_code')
      .eq('student_code', trimmed)
      .maybeSingle()

    if (err) {
      setError('حدث خطأ أثناء التحقق، حاول مجدداً')
      setLoading(false)
      return
    }

    if (!data) {
      setError('الكود غير صحيح، تأكد من كود الطالب وأعد المحاولة')
      setLoading(false)
      return
    }

    navigate(`/parent/${encodeURIComponent(trimmed)}`, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-4 lg:px-8">
        <Link to="/teacher/login" className="btn-outline">
          <ArrowLeft className="h-4 w-4" />
          دخول المعلم
        </Link>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary-600" />
          <span className="text-lg font-extrabold text-slate-800">منصة تعليم</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
            <QrCode className="h-9 w-9" />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-slate-800">دخول ولي الأمر</h1>
          <p className="mb-6 text-sm leading-6 text-slate-500">
            أدخل كود الطالب المقدم من المدرسة لمتابعة الحضور والمصاريف.
            <br />
            الوصول بقراءة فقط للحفاظ على سرية البيانات.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <UserRound className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="input pr-12 text-center text-lg font-bold tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="كود الطالب"
                dir="ltr"
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? <Spinner size="h-5 w-5" /> : 'عرض بيانات الطالب'}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-400">
            الكود يُصرف للمعلم ويُسلَّم إلى ولي الأمر عن طريق المدرسة
          </p>
        </div>
      </main>
    </div>
  )
}
