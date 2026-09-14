import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  Check,
  X,
  Clock,
  ChevronRight,
  ChevronLeft,
  Filter,
  Download,
  Printer,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Spinner } from '../App'
import Modal from '../components/ui/Modal'
import PrintReport from '../components/PrintReport'
import WaIcon from '../components/WaIcon'
import { ATTENDANCE_STATUS, fmtDate } from '../lib/constants'
import { waLink, absentMsg } from '../lib/whatsapp'

const STATUS_ORDER = ['present', 'absent', 'late']

export default function AttendancePage() {
  const toast = useToast()
  const { teacherId, profile } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [groups, setGroups] = useState([])
  const [groupFilter, setGroupFilter] = useState('all')
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState({}) // key: studentId -> status
  const [date, setDate] = useState(today)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)

  const load = useCallback(async () => {
    if (!teacherId) return
    setLoading(true)
    try {
      const [sRes, gRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at'),
        supabase
          .from('groups')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at'),
      ])

      const studentList = sRes.data ?? []
      const groupList = gRes.data ?? []

      let aRes = []
      if (studentList.length > 0) {
        const studentIds = studentList.map((s) => s.id)
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('*')
          .eq('session_date', date)
          .in('student_id', studentIds)
        aRes = attendanceData ?? []
      }

      setGroups(groupList)
      setStudents(studentList)

      const map = {}
      aRes?.forEach((r) => {
        map[r.student_id] = r.status
      })
      setRecords(map)
    } catch (err) {
      console.error('Error loading attendance:', err)
      toast('تعذر تحميل بيانات الحضور', 'error')
    } finally {
      setLoading(false)
    }
  }, [date, teacherId])

  useEffect(() => {
    if (teacherId) {
      load()
    }
  }, [load, teacherId])

  const filteredStudents = useMemo(() => {
    if (groupFilter === 'all') return students
    return students.filter((s) => s.group_id === groupFilter)
  }, [students, groupFilter])

  const groupById = (id) => groups.find((g) => g.id === id)

  const mark = async (student, status) => {
    const previous = records[student.id]
    setRecords((r) => ({ ...r, [student.id]: status }))
    setSavingKey(`${student.id}-${status}`)
    try {
      const existing = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', student.id)
        .eq('session_date', date)
        .maybeSingle()
      if (existing.data) {
        const { error } = await supabase
          .from('attendance')
          .update({ status })
          .eq('id', existing.data.id)
        if (error) {
          setRecords((r) => ({ ...r, [student.id]: previous }))
          toast('تعذر التحديث', 'error')
        } else toast(`تم تسجيل «${ATTENDANCE_STATUS[status].label}»`)
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert({ student_id: student.id, session_date: date, status })
        if (error) {
          setRecords((r) => ({ ...r, [student.id]: previous }))
          toast('تعذر التسجيل', 'error')
        } else toast(`تم تسجيل «${ATTENDANCE_STATUS[status].label}»`)
      }
    } catch {
      setRecords((r) => ({ ...r, [student.id]: previous }))
    } finally {
      setSavingKey(null)
    }
  }

  const markAll = async (status) => {
    if (!window.confirm(`تأكيد تسجيل «${ATTENDANCE_STATUS[status].label}» لكل الطلاب الظاهرين؟`)) return
    for (const s of filteredStudents) {
      setRecords((r) => ({ ...r, [s.id]: status }))
    }
    for (const s of filteredStudents) {
      const existing = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', s.id)
        .eq('session_date', date)
        .maybeSingle()
      if (existing.data) {
        await supabase.from('attendance').update({ status }).eq('id', existing.data.id)
      } else {
        await supabase.from('attendance').insert({ student_id: s.id, session_date: date, status })
      }
    }
    toast(`تم تسجيل ${filteredStudents.length} طالب كـ«${ATTENDANCE_STATUS[status].label}»`)
  }

  const shiftDay = (delta) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().slice(0, 10))
  }

  const counts = useMemo(() => {
    let present = 0,
      absent = 0,
      late = 0
    filteredStudents.forEach((s) => {
      if (records[s.id] === 'present') present++
      else if (records[s.id] === 'absent') absent++
      else if (records[s.id] === 'late') late++
    })
    return { present, absent, late, total: filteredStudents.length, marked: present + absent + late }
  }, [filteredStudents, records])

  const exportCSV = () => {
    const header = 'اسم الطالب,المجموعة,الحالة'
    const rows = filteredStudents.map((s) => {
      const grp = groupById(s.group_id)
      const status = records[s.id] || 'لم يُسجَّل'
      const label = ATTENDANCE_STATUS[status]?.label || 'لم يُسجَّل'
      return `"${s.student_name}","${grp?.group_name || ''}","${label}"`
    })
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `attendance-${date}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('تم تصدير ملف الحضور')
  }

  const statusLabel = (status) => ATTENDANCE_STATUS[status]?.label || 'لم يُسجَّل'
  const printColumns = ['م', 'اسم الطالب', 'المجموعة', 'الحالة', 'التوقيع']
  const printRows = filteredStudents.map((s, i) => {
    const grp = groupById(s.group_id)
    return [
      i + 1,
      s.student_name,
      grp?.group_name || 'بدون مجموعة',
      statusLabel(records[s.id]),
      '',
    ]
  })
  const groupLabel =
    groupFilter === 'all' ? 'كل المجاميع' : groups.find((g) => g.id === groupFilter)?.group_name || ''

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">الحضور والغياب</h1>
          <p className="mt-1 text-sm text-slate-500">سجّل الحضور اليومي بنقرة واحدة لكل طالب</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSummaryOpen(true)} className="btn-outline">
            <Filter className="h-4 w-4" />
            ملخص اليوم
          </button>
          <button onClick={exportCSV} className="btn-outline">
            <Download className="h-4 w-4" />
            تصدير CSV
          </button>
          <button onClick={() => setPrintOpen(true)} className="btn-outline">
            <Printer className="h-4 w-4" />
            طباعة / PDF
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDay(-1)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <ChevronRight className="h-5 w-5" />
          </button>
          <input
            type="date"
            className="input w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button onClick={() => shiftDay(1)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setDate(today)} className="btn-outline hidden sm:inline-flex">
            اليوم
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select className="input sm:w-52" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="all">كل المجاميع</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group_name}
              </option>
            ))}
          </select>
          <button onClick={() => markAll('present')} className="btn-success">
            <Check className="h-4 w-4" />
            الكل حاضر
          </button>
          <button onClick={() => markAll('absent')} className="btn-danger">
            <X className="h-4 w-4" />
            الكل غائب
          </button>
          <button onClick={() => markAll('late')} className="bg-amber-500 hover:bg-amber-600 btn text-white">
            <Clock className="h-4 w-4" />
            الكل متأخر
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        <SummaryCard label="المسجل" value={`${counts.marked}/${counts.total}`} cls="bg-slate-50 text-slate-700" />
        <SummaryCard label="حاضر" value={counts.present} cls="bg-emerald-50 text-emerald-700" />
        <SummaryCard label="غائب" value={counts.absent} cls="bg-rose-50 text-rose-700" />
        <SummaryCard label="متأخر" value={counts.late} cls="bg-amber-50 text-amber-700" />
      </div>

      {/* Roster */}
      {filteredStudents.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <CalendarCheck className="h-12 w-12 text-slate-200" />
          <p className="font-bold text-slate-500">لا يوجد طلاب في هذه التصفية</p>
          <p className="text-sm text-slate-400">أضف طلاباً أو غيّر تصفية المجموعة</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1fr_repeat(3,90px)_56px] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:grid">
            <span className="text-sm font-bold text-slate-500">الطالب</span>
            <span className="text-center text-sm font-bold text-emerald-600">حاضر</span>
            <span className="text-center text-sm font-bold text-rose-600">غائب</span>
            <span className="text-center text-sm font-bold text-amber-600">متأخر</span>
            <span className="text-center text-sm font-bold text-slate-400">إشعار</span>
          </div>
          <div className="divide-y divide-slate-50">
            {filteredStudents.map((s) => {
              const grp = groupById(s.group_id)
              const current = records[s.id]
              const isAbsent = current === 'absent'
              const hasPhone = Boolean(s.parent_phone)
              return (
                <div key={s.id} className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr_repeat(3,90px)_56px] sm:items-center">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white"
                      style={{ backgroundColor: grp?.color_code || '#2547eb' }}
                    >
                      {s.student_name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">{s.student_name}</p>
                      {grp && <p className="text-xs font-semibold text-slate-400">{grp.group_name}</p>}
                    </div>
                  </div>
                  {STATUS_ORDER.map((status) => {
                    const active = current === status
                    const colors = {
                      present: 'border-emerald-500 bg-emerald-500 text-white',
                      absent: 'border-rose-500 bg-rose-500 text-white',
                      late: 'border-amber-500 bg-amber-500 text-white',
                    }
                    const inactive = {
                      present: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
                      absent: 'border-rose-200 text-rose-600 hover:bg-rose-50',
                      late: 'border-amber-200 text-amber-600 hover:bg-amber-50',
                    }
                    return (
                      <button
                        key={status}
                        onClick={() => mark(s, status)}
                        disabled={savingKey !== null}
                        className={`flex items-center justify-center gap-1 rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${
                          active ? colors[status] : `${inactive[status]} bg-white`
                        }`}
                      >
                        {savingKey === `${s.id}-${status}` && <Spinner size="h-4 w-4" />}
                        {ATTENDANCE_STATUS[status].label}
                      </button>
                    )
                  })}
                  <div className="flex justify-center">
                    {isAbsent && hasPhone ? (
                      <a
                        href={waLink(
                          s.parent_phone,
                          absentMsg({
                            studentName: s.student_name,
                            dateLabel: fmtDate(date),
                            groupName: grp?.group_name || 'بدون مجموعة',
                            teacherName: profile?.full_name || 'المعلم',
                          }),
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="إرسال إشعار واتساب لولي الأمر"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm transition hover:scale-105 hover:bg-[#1fb355]"
                      >
                        <WaIcon className="h-5 w-5" />
                      </a>
                    ) : (
                      <span className="text-slate-200">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary modal */}
      <Modal open={summaryOpen} onClose={() => setSummaryOpen(false)} title={`ملخص الحضور — ${fmtDate(date)}`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ModalStat label="المسجل" value={counts.marked} cls="bg-slate-50 text-slate-700" />
          <ModalStat label="حاضر" value={counts.present} cls="bg-emerald-50 text-emerald-700" />
          <ModalStat label="غائب" value={counts.absent} cls="bg-rose-50 text-rose-700" />
          <ModalStat label="متأخر" value={counts.late} cls="bg-amber-50 text-amber-700" />
        </div>
        <div className="mt-4 space-y-2">
          {filteredStudents
            .filter((s) => !records[s.id])
            .map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5">
                <span className="text-sm font-bold text-amber-800">{s.student_name}</span>
                <span className="text-xs font-bold text-amber-600">لم يُسجَّل بعد</span>
              </div>
            ))}
        </div>
      </Modal>

      <PrintReport
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title="سجل الحضور والغياب"
        subtitle={`التاريخ: ${fmtDate(date)} — ${groupLabel} — الحاضر ${counts.present} / الغائب ${counts.absent} / المتأخر ${counts.late}`}
        teacherName={profile?.full_name || 'المعلم'}
        columns={printColumns}
        rows={printRows}
        notes
      />
    </div>
  )
}

function SummaryCard({ label, value, cls }) {
  return (
    <div className={`card rounded-2xl p-4 text-center ${cls}`}>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-bold opacity-70">{label}</p>
    </div>
  )
}

function ModalStat({ label, value, cls }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${cls}`}>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-bold opacity-70">{label}</p>
    </div>
  )
}
