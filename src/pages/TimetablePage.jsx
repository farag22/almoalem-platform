import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Trash2, Clock, MapPin, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

const daysOfWeek = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

export default function TimetablePage() {
  const { teacherId } = useAuth()
  const toast = useToast()
  
  const [timetable, setTimetable] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [day, setDay] = useState('السبت')
  const [groupId, setGroupId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [room, setRoom] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    if (!teacherId) return
    setLoading(true)
    const [tRes, gRes] = await Promise.all([
      supabase.from('timetable').select('*, groups(group_name, color_code)').eq('teacher_id', teacherId),
      supabase.from('groups').select('id, group_name').eq('teacher_id', teacherId)
    ])
    setTimetable(tRes.data ?? [])
    setGroups(gRes.data ?? [])
    if (gRes.data?.length > 0) setGroupId(gRes.data[0].id)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [teacherId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!groupId || !startTime) {
      toast('يرجى اختيار المجموعة وتحديد وقت الحصة', 'error')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('timetable').insert([
      {
        teacher_id: teacherId,
        group_id: groupId,
        day_of_week: day,
        start_time: startTime,
        room_or_place: room
      }
    ])

    if (error) {
      toast('تعذر إضافة الحصة للجدول', 'error')
    } else {
      toast('تمت إضافة الموعد بنجاح')
      setStartTime('')
      setRoom('')
      fetchData()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('timetable').delete().eq('id', id)
    if (!error) {
      toast('تم حذف الموعد')
      setTimetable(timetable.filter(t => t.id !== id))
    } else {
      toast('تعذر الحذف', 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="card p-6 bg-white shadow-sm rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary-600" />
            <span>الجدول والتقويم الأسبوعي</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">إدارة مواعيد الحصص والمجاميع الدراسية أسبوعياً.</p>
        </div>
      </div>

      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-base font-extrabold text-slate-800 mb-4">إضافة حصة جديدة للجدول</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">اليوم</label>
            <select value={day} onChange={(e) => setDay(e.target.value)} className="input text-sm">
              {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">المجموعة</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input text-sm">
              {groups.map(g => <option key={g.id} value={g.id}>{g.group_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">وقت الحصة</label>
            <input type="text" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="مثال: 04:00 عصراً" className="input text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">المكان / القاعة</label>
            <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="قاعة 1 / السنتر الرئيسي" className="input text-sm" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>إضافة</span>
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {daysOfWeek.map(d => {
          const dayItems = timetable.filter(t => t.day_of_week === d)
          return (
            <div key={d} className="card p-4 bg-white shadow-sm rounded-2xl border border-slate-100">
              <h3 className="font-extrabold text-slate-800 pb-2 border-b border-slate-100 mb-3 flex items-center justify-between">
                <span>{d}</span>
                <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-bold">{dayItems.length} حصص</span>
              </h3>
              {dayItems.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">لا توجد حصص مسجلة</p>
              ) : (
                <div className="space-y-2.5">
                  {dayItems.map(item => (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-primary-600 shrink-0" />
                          <span>{item.groups?.group_name || 'مجموعة'}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{item.start_time}</span>
                          {item.room_or_place && (
                            <>
                              <span className="text-slate-300">|</span>
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span className="truncate">{item.room_or_place}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <button onClick={() => handleDelete(item.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
