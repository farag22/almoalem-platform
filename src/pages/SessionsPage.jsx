import { useEffect, useState } from 'react'
import { Calendar, Plus, Trash2, Clock, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Spinner } from '../App'
import Modal from '../components/ui/Modal'

export default function SessionsPage() {
  const toast = useToast()
  const { teacherId } = useAuth()
  const [sessions, setSessions] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [groupId, setGroupId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('السبت')
  const [time, setTime] = useState('14:00')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

  const load = async () => {
    if (!teacherId) return
    setLoading(true)
    try {
      const [sRes, gRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('*, groups(group_name, color_code)')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false }),
        supabase
          .from('groups')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at'),
      ])

      setSessions(sRes.data ?? [])
      setGroups(gRes.data ?? [])
    } catch (err) {
      console.error('Error loading sessions:', err)
      toast('تعذر تحميل مواعيد الحصص', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (teacherId) {
      load()
    }
  }, [teacherId])

  const openCreate = () => {
    setGroupId(groups[0]?.id || '')
    setDayOfWeek('السبت')
    setTime('14:00')
    setTitle('')
    setModalOpen(true)
  }

  const save = async () => {
    if (!groupId) {
      toast('اختر المجموعة', 'error')
      return
    }
    setSaving(true)
    const payload = {
      teacher_id: teacherId,
      user_id: teacherId, // متوافق مع قيود الجدول في قاعدة البيانات
      group_id: groupId,
      day_of_week: dayOfWeek,
      session_time: time,
      title: title.trim() || 'حصّة دراسية',
    }

    const { error } = await supabase.from('sessions').insert([payload])
    if (error) {
      console.error('Error saving session:', error)
      toast('تعذر إضافة الموعد', 'error')
    } else {
      toast('تم إضافة موعد الحصة بنجاح')
      setModalOpen(false)
      load()
    }
    setSaving(false)
  }

  const remove = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموعد؟')) return
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) {
      toast('تعذر الحذف', 'error')
    } else {
      toast('تم حذف الموعد بنجاح')
      load()
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden p-3 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">الحصص والمواعيد</h1>
          <p className="mt-1 text-sm text-slate-500">إدارة مواعيد الحصص والأيام الأسبوعية للمجاميع</p>
        </div>
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus className="h-5 w-5" /> موعد حصة جديد
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Calendar className="h-12 w-12 text-slate-300" />
          <p className="font-bold text-slate-600">لا توجد مواعيد حصص مسجلة</p>
          <p className="text-sm text-slate-400">أضف موعدك الأول لتنظيم الجدول الأسبوعي</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => {
            const grp = s.groups
            return (
              <div key={s.id} className="card p-5 relative overflow-hidden space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-2xl text-white font-extrabold"
                      style={{ backgroundColor: grp?.color_code || '#2547eb' }}
                    >
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-slate-800">{s.title}</h3>
                      <p className="text-xs font-semibold text-slate-500">{grp?.group_name || 'مجموعة عامة'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(s.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-slate-600">
                  <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl">
                    <Calendar className="h-4 w-4 text-primary-600" /> {s.day_of_week}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl" dir="ltr">
                    <Clock className="h-4 w-4 text-primary-600" /> {s.session_time}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="إضافة موعد حصة جديدة"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-outline">إلغاء</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Spinner size="h-5 w-5" /> : 'حفظ الموعد'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">عنوان الحصة / المادة</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: حصة الفيزياء الأسبوعية"
            />
          </div>
          <div>
            <label className="label">المجموعة</label>
            <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">اليوم من الأسبوع</label>
            <select className="input" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
              {days.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">وقت الحصة</label>
            <input
              type="time"
              className="input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
