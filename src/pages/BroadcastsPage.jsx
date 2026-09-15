import { useState, useEffect } from 'react'
import { MessageSquareText, Plus, Trash2, Send, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function BroadcastsPage() {
  const { teacherId } = useAuth()
  const toast = useToast()

  const [broadcasts, setBroadcasts] = useState([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetGroup, setTargetGroup] = useState('all')
  const [submitting, setSubmitting] = useState(false)

  const fetchBroadcasts = async () => {
    if (!teacherId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (!error) {
      setBroadcasts(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBroadcasts()
  }, [teacherId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      toast('يرجى إدخال عنوان ورسالة الإشعار', 'error')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('broadcasts').insert([
      {
        teacher_id: teacherId,
        title,
        message,
        target_group: targetGroup,
      },
    ])

    if (error) {
      toast('تعذر إرسال الإشعار', 'error')
    } else {
      toast('تم نشر الرسالة بنجاح')
      setTitle('')
      setMessage('')
      fetchBroadcasts()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('broadcasts').delete().eq('id', id)
    if (!error) {
      toast('تم حذف الرسالة')
      setBroadcasts(broadcasts.filter((b) => b.id !== id))
    } else {
      toast('تعذر الحذف', 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="card p-6 bg-white shadow-sm rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <MessageSquareText className="h-6 w-6 text-primary-600" />
            <span>الرسائل والمنشورات الجماعية</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">إرسال التنبيهات والرسائل السريعة للطلاب وأولياء الأمور.</p>
        </div>
      </div>

      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-base font-extrabold text-slate-800 mb-4">إنشاء رسالة أو إشعار جديد</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">عنوان الرسالة</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تذكير بموعد الحصة القادمة"
                className="input text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">الفئة المستهدفة</label>
              <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)} className="input text-sm">
                <option value="all">جميع الطلاب وأولياء الأمور</option>
                <option value="absent">الطلاب الغائبون فقط</option>
                <option value="unpaid">أصحاب المصاريف المتأخرة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">نص الرسالة</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب تفاصيل الرسالة هنا..."
              rows="3"
              className="input text-sm"
              required
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary px-6 py-2.5 text-sm font-bold flex items-center gap-1.5">
              <Send className="h-4 w-4" />
              <span>نشر وإرسال الرسالة</span>
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-base font-extrabold text-slate-800 mb-4">الرسائل المُرسلة مسبقاً ({broadcasts.length})</h2>
        {broadcasts.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">لا توجد رسائل مسجلة بعد</p>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => (
              <div key={b.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-primary-50 text-primary-600 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {b.target_group === 'all' ? 'الجميع' : b.target_group === 'absent' ? 'الغائبون' : 'المتأخرون مالياً'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{new Date(b.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base mt-1">{b.title}</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{b.message}</p>
                </div>
                <button onClick={() => handleDelete(b.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition shrink-0">
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
