import { useEffect, useState } from 'react'
import { GraduationCap, Save, CalendarDays, StickyNote } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Spinner } from '../App'
import Modal from './ui/Modal'
import { useToast } from './ui/Toast'
import { HOMEWORK_STATUS } from '../lib/constants'

const HW_ORDER = ['submitted', 'partial', 'not_submitted']

export default function QuickGradingModal({
  open,
  onClose,
  teacherId,
  groups = [],
  initialGroupId = '',
  onSaved,
}) {
  const toast = useToast()
  const [students, setStudents] = useState([])
  const [groupFilter, setGroupFilter] = useState(initialGroupId || 'all')
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setGroupFilter(initialGroupId || 'all')
    setSessionTitle('')
    setSessionDate(new Date().toISOString().slice(0, 10))
    setRows({})
    load(initialGroupId || 'all')
  }, [open, initialGroupId, teacherId])

  const load = async (group) => {
    setLoading(true)
    console.log("Loading students for teacherId:", teacherId)

    // جلب كل الطلاب بدون شروط معقدة لنرى هل يوجد طلاب أصلاً
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('student_name')

    if (error) {
      console.error('Error fetching students:', error)
      toast('خطأ في جلب الطلاب', 'error')
      setLoading(false)
      return
    }

    console.log("Fetched students raw data:", data)
    let list = data ?? []

    if (group && group !== 'all') {
      list = list.filter((s) => s.group_id === group)
    }

    setStudents(list)
    const r = {}
    list.forEach((s) => {
      r[s.id] = { homework: 'not_submitted', score: '', total: 10, note: '' }
    })
    setRows(r)
    setLoading(false)
  }

  const setRow = (id, patch) => setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const cycleHomework = (id) => {
    const cur = rows[id]?.homework || 'not_submitted'
    const next = HW_ORDER[(HW_ORDER.indexOf(cur) + 1) % HW_ORDER.length]
    setRow(id, { homework: next })
  }

  const save = async () => {
    const title = sessionTitle.trim() || 'حصة يومية'
    if (!sessionDate) {
      toast('أدخل تاريخ الحصة', 'error')
      return
    }
    if (students.length === 0) {
      toast('لا يوجد طلاب لحفظ تقييماتهم', 'error')
      return
    }
    setSaving(true)
    const data = students.map((s) => {
      const r = rows[s.id] || { homework: 'not_submitted', score: '', total: 10, note: '' }
      const score = r.score === '' || r.score == null ? null : Number(r.score)
      const maxScore = r.total === '' || r.total == null ? 10 : Number(r.total)
      return {
        title,
        session_date: sessionDate,
        group_name: groups.find(g => g.id === s.group_id)?.group_name || 'بدون مجموعة',
        student_name: s.student_name,
        homework_status: r.homework,
        score,
        max_score: maxScore,
        note: r.note.trim(),
        teacher_id: teacherId,
        student_id: s.id,
      }
    })
    const { error } = await supabase.from('session_evaluations').insert(data)
    setSaving(false)
    if (error) {
      console.error('خطأ في حفظ التقييمات:', error)
      toast(error.message || 'تعذر حفظ التقييمات', 'error')
      return
    }
    toast('تم حفظ التقييمات بنجاح ✨')
    onSaved?.()
    onClose()
  }

  const selectedGroup = groups.find((g) => g.id === groupFilter)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="رصد الحصة اليومية"
      size="lg"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button onClick={onClose} className="btn-outline w-full sm:w-auto">
            إلغاء
          </button>
          <button onClick={save} disabled={saving || loading} className="btn-primary w-full sm:w-auto">
            {saving ? <Spinner size="h-5 w-5" /> : (
              <>
                <Save className="h-4 w-4" />
                حفظ التقييمات ({students.length})
              </>
            )}
          </button>
        </div>
      }
    >
      {/* Session meta */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label className="label">عنوان الحصة</label>
          <input
            className="input"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="مثال: حصة الجبر — الوحدة الثالثة"
          />
        </div>
        <div className="sm:w-44">
          <label className="label">التاريخ</label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              className="input pr-10"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Group filter */}
      <div className="mb-3">
        <label className="label">المجموعة</label>
        <select
          className="input"
          value={groupFilter}
          onChange={(e) => {
            setGroupFilter(e.target.value)
            load(e.target.value)
          }}
        >
          <option value="all">كل المجاميع</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.group_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <GraduationCap className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">لا يوجد طلاب في هذا التحديد</p>
          <p className="text-xs text-slate-400">تأكد من إضافة طلاب في صفحة الطلاب أولاً</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {students.map((s) => {
            const r = rows[s.id] || { homework: 'not_submitted', score: '', total: 10, note: '' }
            const hw = HOMEWORK_STATUS[r.homework]
            return (
              <div key={s.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold text-white bg-primary-600">
                      {s.student_name.charAt(0)}
                    </span>
                    <p className="truncate text-sm font-bold text-slate-700">{s.student_name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${hw.dot}`} />
                    <span className="text-[11px] font-bold text-slate-400">{hw.label}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <button
                    type="button"
                    onClick={() => cycleHomework(s.id)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition sm:flex-none sm:px-4 ${
                      r.homework === 'submitted'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : r.homework === 'partial'
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-rose-300 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {hw.label} ← اضغط للتبديل
                  </button>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      className="input w-16 px-2 py-2 text-center"
                      value={r.score}
                      onChange={(e) => setRow(s.id, { score: e.target.value })}
                      placeholder="0"
                      min={0}
                    />
                    <span className="text-sm font-bold text-slate-400">/</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="input w-16 px-2 py-2 text-center"
                      value={r.total}
                      onChange={(e) => setRow(s.id, { total: e.target.value })}
                      placeholder="10"
                      min={1}
                    />
                  </div>
                </div>

                <div className="relative mt-2">
                  <StickyNote className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pr-9 py-2 text-sm"
                    value={r.note}
                    onChange={(e) => setRow(s.id, { note: e.target.value })}
                    placeholder="ملاحظة قصيرة (ممتاز، محتاج تركيز...)"
                  />
                </div>
              </div>
            )
          })}
          {selectedGroup && (
            <p className="pt-1 text-center text-xs text-slate-400">
              جارٍ رصد المجموعة «{selectedGroup.group_name}» — {students.length} طالب
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
