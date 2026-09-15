import { useState, useEffect } from 'react'
import { FileSpreadsheet, Plus, Trash2, Calendar, Award, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function QuizzesPage() {
  const { teacherId } = useAuth()
  const toast = useToast()

  const [quizzes, setQuizzes] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [groupId, setGroupId] = useState('')
  const [maxScore, setMaxScore] = useState(10)
  const [quizDate, setQuizDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    if (!teacherId) return
    setLoading(true)
    const [qRes, gRes] = await Promise.all([
      supabase.from('quizzes').select('*, groups(group_name, color_code)').eq('teacher_id', teacherId).order('quiz_date', { ascending: false }),
      supabase.from('groups').select('id, group_name').eq('teacher_id', teacherId)
    ])
    setQuizzes(qRes.data ?? [])
    setGroups(gRes.data ?? [])
    if (gRes.data?.length > 0) setGroupId(gRes.data[0].id)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [teacherId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!title.trim() || !groupId) {
      toast('يرجى كتابة عنوان الاختبار واختيار المجموعة', 'error')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('quizzes').insert([
      {
        teacher_id: teacherId,
        group_id: groupId,
        title,
        max_score: Number(maxScore),
        quiz_date: quizDate
      }
    ])

    if (error) {
      toast('تعذر إنشاء الاختبار', 'error')
    } else {
      toast('تم إنشاء الاختبار بنجاح')
      setTitle('')
      fetchData()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('quizzes').delete().eq('id', id)
    if (!error) {
      toast('تم حذف الاختبار')
      setQuizzes(quizzes.filter(q => q.id !== id))
    } else {
      toast('تعذر الحذف', 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="card p-6 bg-white shadow-sm rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary-600" />
            <span>الاختبارات والواجبات</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">إنشاء ومتابعة الامتحانات الشهرية والأسبوعية للمجموعات.</p>
        </div>
      </div>

      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-base font-extrabold text-slate-800 mb-4">إنشاء اختبار جديد</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">عنوان الاختبار / الواجب</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: امتحان الوحدة الأولى" className="input text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">المجموعة</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input text-sm">
              {groups.map(g => <option key={g.id} value={g.id}>{g.group_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">الدرجة النهائية</label>
            <input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="input text-sm" min="1" required />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>إنشاء</span>
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-base font-extrabold text-slate-800 mb-4">الاختبارات المسجلة</h2>
        {quizzes.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">لا توجد اختبارات مسجلة بعد</p>
        ) : (
          <div className="space-y-3">
            {quizzes.map(q => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-800 text-base">{q.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1 text-primary-600">
                      <Layers className="h-3.5 w-3.5" />
                      {q.groups?.group_name || 'مجموعة'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5" />
                      الدرجة: {q.max_score} درجة
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {q.quiz_date}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDelete(q.id)} className="text-rose-500 hover:bg-rose-50 p-2.5 rounded-xl transition">
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
