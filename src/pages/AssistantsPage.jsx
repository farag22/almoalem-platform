import { useState, useEffect } from 'react'
import { UserCog, Plus, Trash2, Mail, ShieldCheck, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function AssistantsPage() {
  const { teacherId } = useAuth()
  const toast = useToast()

  const [assistants, setAssistants] = useState([])
  const [loading, setLoading] = useState(true)

  const [assistantName, setAssistantName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [canAttendance, setCanAttendance] = useState(true)
  const [canPayments, setCanPayments] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchAssistants = async () => {
    if (!teacherId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (!error) {
      setAssistants(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAssistants()
  }, [teacherId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!assistantName.trim() || !email.trim() || !password.trim()) {
      toast('يرجى إدخال الاسم، البريد، وكلمة المرور للمساعد', 'error')
      return
    }

    if (password.length < 6) {
      toast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error')
      return
    }

    setSubmitting(true)

    // 1. إنشاء حساب المصادقة للمساعد في Supabase
    // ملاحظة: تتطلب هذه الخطوة أن يكون جدول المستخدمين أو التسجيل متاحاً، أو نقوم بتخزين بياناته وربطه مباشرة
    const { error: insertError } = await supabase.from('assistants').insert([
      {
        teacher_id: teacherId,
        assistant_name: assistantName,
        email,
        password_plain: password, // حفظ مؤقت أو إظهارها للمعلم لتسليمها للمساعد
        permissions: {
          attendance: canAttendance,
          payments: canPayments,
        },
      },
    ])

    if (insertError) {
      toast('تعذر إضافة المساعد، ربما البريد مسجل مسبقاً', 'error')
    } else {
      toast('تمت إضافة المساعد بنجاح وأصبح جاهزاً للدخول')
      setAssistantName('')
      setEmail('')
      setPassword('')
      setCanAttendance(true)
      setCanPayments(false)
      fetchAssistants()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('assistants').delete().eq('id', id)
    if (!error) {
      toast('تم حذف المساعد')
      setAssistants(assistants.filter((a) => a.id !== id))
    } else {
      toast('تعذر الحذف', 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="card p-6 bg-white shadow-sm rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary-600" />
            <span>إدارة المساعدين والصلاحيات</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">تحديد صلاحيات وبيانات دخول المساعدين والسكرتارية.</p>
        </div>
      </div>

      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-base font-extrabold text-slate-800 mb-4">إضافة مساعد جديد</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">اسم المساعد</label>
              <input
                type="text"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="مثال: أحمد محمد"
                className="input text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="assistant@example.com"
                className="input text-sm"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">كلمة المرور</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة مرور الدخول"
                className="input text-sm"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={canAttendance}
                onChange={(e) => setCanAttendance(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <span className="text-sm font-bold text-slate-700">السماح بإدارة وتسجيل الحضور</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={canPayments}
                onChange={(e) => setCanPayments(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <span className="text-sm font-bold text-slate-700">السماح بإدارة وتسجيل المصاريف</span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={submitting} className="btn-primary px-6 py-2.5 text-sm font-bold flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>حفظ وإضافة المساعد</span>
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-base font-extrabold text-slate-800 mb-4">المساعدون المسجلون ({assistants.length})</h2>
        {assistants.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">لا توجد مساعدون مسجلون بعد</p>
        ) : (
          <div className="space-y-3">
            {assistants.map((a) => (
              <div key={a.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-extrabold text-slate-800 text-base">{a.assistant_name}</h3>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500" dir="ltr">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {a.email}
                    </span>
                    {a.password_plain && (
                      <span className="flex items-center gap-1 text-primary-600 font-bold">
                        <Lock className="h-3 w-3" />
                        كلمة السر: {a.password_plain}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {a.permissions?.attendance && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> الحضور
                      </span>
                    )}
                    {a.permissions?.payments && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> المصاريف
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(a.id)} className="text-rose-500 hover:bg-rose-50 p-2.5 rounded-xl transition shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
