import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Spinner } from '../App'

export default function TeacherLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
          },
        })
        if (error) throw error
        if (data?.user) {
          setMessage(
            'تم إنشاء الحساب بنجاح! تحقق من بريدك الإلكتروني لتفعيل الحساب إن لزم الأمر، ثم سجّل الدخول.',
          )
          setMode('login')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: teacher } = await supabase
          .from('teachers')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()
        const role = teacher?.role
        if (role === 'disabled') {
          await supabase.auth.signOut()
          setError('تم تعطيل حسابك، يرجى التواصل مع إدارة المنصة')
          return
        }
        navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true })
      }
    } catch (err) {
      setError(toArabicError(err.message || 'حدث خطأ غير متوقع، حاول مجدداً'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand side */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary-700 via-primary-800 to-indigo-900 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-extrabold text-white">منصة تعليم</span>
        </div>
        <div>
          <h1 className="mb-4 text-4xl font-extrabold leading-snug text-white">
            منصة تعليمية متكاملة
            <br />
            للمعلمين وأولياء الأمور
          </h1>
          <p className="max-w-md text-lg leading-8 text-indigo-200">
            إدارة المجاميع والطلاب والحضور والمصاريف بسهولة تامة، مع وصول آمن لأولياء الأمور عبر
            كود الطالب.
          </p>
          <div className="mt-8 flex gap-3">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white">
              مجاميع ملونة
            </span>
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white">
              حضور بنقرة واحدة
            </span>
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white">
              مصاريف شهرية
            </span>
          </div>
        </div>
        <p className="text-sm text-indigo-300">© {new Date().getFullYear()} منصة تعليم</p>
      </div>

      {/* Form side */}
      <div className="flex w-full flex-col justify-center bg-slate-50 px-6 py-10 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-xl font-extrabold text-slate-800">منصة تعليم</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-800">
              {mode === 'login' ? 'تسجيل دخول المعلم' : 'إنشاء حساب معلم'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'login'
                ? 'أدخل بريدك الإلكتروني وكلمة المرور للمتابعة'
                : 'أنشئ حسابك ليبدأ استخدام المنصة'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">الاسم الكامل</label>
                <div className="relative">
                  <User className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pr-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: أ. أحمد محمد"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="input pr-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10 pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? (
                <Spinner size="h-5 w-5" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="h-5 w-5" />
                  تسجيل الدخول
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  إنشاء الحساب
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            {mode === 'login' ? (
              <>
                ليس لديك حساب؟{' '}
                <button
                  onClick={() => {
                    setMode('signup')
                    setError('')
                    setMessage('')
                  }}
                  className="font-bold text-primary-600 hover:underline"
                >
                  إنشاء حساب جديد
                </button>
              </>
            ) : (
              <>
                لديك حساب بالفعل؟{' '}
                <button
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setMessage('')
                  }}
                  className="font-bold text-primary-600 hover:underline"
                >
                  تسجيل الدخول
                </button>
              </>
            )}
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="mb-2 text-sm font-bold text-slate-700">هل أنت ولي أمر؟</p>
            <Link
              to="/parent"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              دخول أولياء الأمور
            </Link>
            <p className="mt-2 text-xs text-slate-400">الدخول عبر كود الطالب فقط، بمشاهدة قراءة فقط</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function toArabicError(msg) {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'بيانات الدخول غير صحيحة، تأكد من البريد وكلمة المرور'
  if (m.includes('email not confirmed')) return 'لم يتم تفعيل البريد الإلكتروني بعد، تحقق من بريدك'
  if (m.includes('already registered')) return 'هذا البريد مسجل مسبقاً، سجّل الدخول مباشرة'
  if (m.includes('password should be at least')) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
  if (m.includes('rate limit')) return 'طلبات كثيرة جداً، حاول بعد قليل'
  if (m.includes('network')) return 'مشكلة في الاتصال بالإنترنت، حاول مجدداً'
  return msg
}
