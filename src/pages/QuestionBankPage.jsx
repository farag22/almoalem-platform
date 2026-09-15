import { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, HelpCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function QuestionBankPage() {
  const { teacherId } = useAuth()
  const toast = useToast()

  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  const [questionText, setQuestionText] = useState('')
  const [questionType, setQuestionType] = useState('MCQ')
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [subjectUnit, setSubjectUnit] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchQuestions = async () => {
    if (!teacherId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('question_bank')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (!error) {
      setQuestions(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchQuestions()
  }, [teacherId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!questionText.trim()) {
      toast('يرجى كتابة نص السؤال', 'error')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('question_bank').insert([
      {
        teacher_id: teacherId,
        question_text: questionText,
        question_type: questionType,
        correct_answer: correctAnswer,
        subject_unit: subjectUnit,
      },
    ])

    if (error) {
      toast('تعذر إضافة السؤال', 'error')
    } else {
      toast('تمت إضافة السؤال بنجاح')
      setQuestionText('')
      setCorrectAnswer('')
      setSubjectUnit('')
      fetchQuestions()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('question_bank').delete().eq('id', id)
    if (!error) {
      toast('تم حذف السؤال')
      setQuestions(questions.filter((q) => q.id !== id))
    } else {
      toast('تعذر الحذف', 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="card p-6 bg-white shadow-sm rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary-600" />
            <span>بنك الأسئلة</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">مخزن مركزي للأسئلة لتنظيم الاختبارات والواجبات بسهولة.</p>
        </div>
      </div>

      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-base font-extrabold text-slate-800 mb-4">إضافة سؤال جديد للمخزن</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">نوع السؤال</label>
              <select value={questionType} onChange={(e) => setQuestionType(e.target.value)} className="input text-sm">
                <option value="MCQ">اختيار من متعدد (MCQ)</option>
                <option value="Essay">سؤال مقالي</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">الوحدة / الفصل الدراسي</label>
              <input
                type="text"
                value={subjectUnit}
                onChange={(e) => setSubjectUnit(e.target.value)}
                placeholder="مثال: الوحدة الأولى - الباب الثاني"
                className="input text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">نص السؤال</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="اكتب نص السؤال هنا..."
              rows="2"
              className="input text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">الإجابة الصحيحة (اختياري)</label>
            <input
              type="text"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="الإجابة النموذجية أو الاختيار الصحيح"
              className="input text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary px-6 py-2.5 text-sm font-bold flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>حفظ في بنك الأسئلة</span>
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-base font-extrabold text-slate-800 mb-4">الأسئلة المخزنة ({questions.length})</h2>
        {questions.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">لا توجد أسئلة مسجلة في البنك بعد</p>
        ) : (
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-primary-50 text-primary-600 px-2.5 py-0.5 rounded-full font-bold">
                      {q.question_type === 'MCQ' ? 'اختياري' : 'مقالي'}
                    </span>
                    {q.subject_unit && (
                      <span className="text-xs text-slate-400 font-semibold">{q.subject_unit}</span>
                    )}
                  </div>
                  <p className="font-bold text-slate-800 text-sm mt-1 flex items-start gap-1.5">
                    <HelpCircle className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
                    <span>{q.question_text}</span>
                  </p>
                  {q.correct_answer && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      الإجابة الصحيحة: {q.correct_answer}
                    </p>
                  )}
                </div>
                <button onClick={() => handleDelete(q.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition shrink-0">
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
