import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users, Layers, FileSpreadsheet, Printer, ClipboardList, MapPin, Globe } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Spinner } from '../App'
import Modal from '../components/ui/Modal'
import PrintReport from '../components/PrintReport'
import QuickGradingModal from '../components/QuickGradingModal'
import { GROUP_COLORS } from '../lib/constants'
import { downloadCSV } from '../lib/export'

export default function GroupsPage() {
  const toast = useToast()
  const { teacherId, profile } = useAuth()
  const [groups, setGroups] = useState([])
  const [studentCounts, setStudentCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(GROUP_COLORS[0].value)
  const [groupType, setGroupType] = useState('center') // center أو online
  const [saving, setSaving] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [studentsForPrint, setStudentsForPrint] = useState([])
  const [gradingGroupId, setGradingGroupId] = useState('')

  const load = async () => {
    setLoading(true)
    const { data: g } = await supabase
      .from('groups')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at')
    const { data: s } = await supabase
      .from('students')
      .select('group_id')
      .eq('teacher_id', teacherId)
    const counts = {}
    s?.forEach((st) => {
      if (st.group_id) counts[st.group_id] = (counts[st.group_id] || 0) + 1
    })
    setGroups(g ?? [])
    setStudentCounts(counts)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setColor(GROUP_COLORS[0].value)
    setGroupType('center')
    setModalOpen(true)
  }

  const openEdit = (g) => {
    setEditing(g)
    setName(g.group_name)
    setColor(g.color_code)
    setGroupType(g.type || 'center')
    setModalOpen(true)
  }

  const save = async () => {
    if (!name.trim()) {
      toast('أدخل اسم المجموعة', 'error')
      return
    }
    setSaving(true)
    if (editing) {
      const { error } = await supabase
        .from('groups')
        .update({ group_name: name.trim(), color_code: color, type: groupType })
        .eq('id', editing.id)
        .eq('teacher_id', teacherId)
      if (error) toast('تعذر تعديل المجموعة', 'error')
      else toast('تم تعديل المجموعة')
    } else {
      const { error } = await supabase
        .from('groups')
        .insert({ teacher_id: teacherId, group_name: name.trim(), color_code: color, type: groupType })
      if (error) toast('تعذر إنشاء المجموعة', 'error')
      else toast('تم إنشاء المجموعة')
    }
    setSaving(false)
    setModalOpen(false)
    load()
  }

  const remove = async (g) => {
    if (!window.confirm(`هل أنت متأكد من حذف مجموعة "${g.group_name}"؟ لن يتم حذف الطلاب.`)) return
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', g.id)
      .eq('teacher_id', teacherId)
    if (error) toast('تعذر حذف المجموعة', 'error')
    else toast('تم حذف المجموعة')
    load()
  }

  const exportExcel = () => {
    const rows = groups.map((g, i) => [i + 1, g.group_name, g.type === 'online' ? 'أونلاين' : 'سنتر', studentCounts[g.id] || 0, g.color_code])
    downloadCSV({
      filename: `كشف-المجاميع-${new Date().toISOString().slice(0, 10)}`,
      headers: ['م', 'اسم المجموعة', 'النوع', 'عدد الطلاب', 'اللون'],
      rows,
    })
    toast('تم تصدير كشف المجاميع')
  }

  const openPrint = async () => {
    const { data } = await supabase
      .from('students')
      .select('student_name, group_id')
      .eq('teacher_id', teacherId)
      .order('student_name')
    setStudentsForPrint(data ?? [])
    setPrintOpen(true)
  }

  const printColumns = ['م', 'اسم المجموعة', 'النوع', 'عدد الطلاب', 'التوقيع']
  const printRows = groups.map((g, i) => [i + 1, g.group_name, g.type === 'online' ? 'أونلاين' : 'سنتر', studentCounts[g.id] || 0, ''])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">المجاميع</h1>
          <p className="mt-1 text-sm text-slate-500">أنشئ مجاميعك وحدّد لوناً ونوعاً لكل مجموعة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportExcel} className="btn-outline">
            <FileSpreadsheet className="h-4 w-4" />
            تصدير Excel
          </button>
          <button onClick={openPrint} className="btn-outline">
            <Printer className="h-4 w-4" />
            طباعة / PDF
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-5 w-5" />
            مجموعة جديدة
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-500">
            <Layers className="h-8 w-8" />
          </div>
          <p className="font-bold text-slate-600">لا توجد مجاميع بعد</p>
          <p className="text-sm text-slate-400">ابدأ بإنشاء مجموعتك الأولى</p>
          <button onClick={openCreate} className="btn-primary mt-2">
            <Plus className="h-5 w-5" />
            إنشاء مجموعة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <div key={g.id} className="card overflow-hidden">
              <div className="h-2" style={{ backgroundColor: g.color_code }} />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-extrabold text-white"
                      style={{ backgroundColor: g.color_code }}
                    >
                      {g.group_name.charAt(0)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-800">{g.group_name}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          g.type === 'online' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {g.type === 'online' ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          {g.type === 'online' ? 'أونلاين' : 'سنتر'}
                        </span>
                      </div>
                      <p className="flex items-center gap-1 text-xs font-semibold text-slate-400 mt-1">
                        <Users className="h-3.5 w-3.5" />
                        {studentCounts[g.id] || 0} طالب
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setGradingGroupId(g.id)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                      title="رصد الحصة اليومية"
                    >
                      <ClipboardList className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEdit(g)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(g)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل المجموعة' : 'مجموعة جديدة'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-outline">
              إلغاء
            </button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Spinner size="h-5 w-5" /> : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">اسم المجموعة</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: المجموعة الأولى"
              autoFocus
            />
          </div>
          <div>
            <label className="label">نوع المجموعة</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGroupType('center')}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-bold transition ${
                  groupType === 'center'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MapPin className="h-4 w-4" />
                سنتر
              </button>
              <button
                type="button"
                onClick={() => setGroupType('online')}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-bold transition ${
                  groupType === 'online'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Globe className="h-4 w-4" />
                أونلاين
              </button>
            </div>
          </div>
          <div>
            <label className="label">لون المجموعة</label>
            <div className="flex flex-wrap gap-3">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                    color === c.value ? 'ring-2 ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value, '--tw-ring-color': c.value }}
                >
                  {color === c.value && (
                    <span className="text-white">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <QuickGradingModal
        open={!!gradingGroupId}
        onClose={() => setGradingGroupId('')}
        teacherId={teacherId}
        groups={groups}
        initialGroupId={gradingGroupId}
        onSaved={load}
      />

      <PrintReport
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title="كشف المجاميع"
        subtitle={`عدد المجاميع: ${groups.length} — إجمالي الطلاب: ${studentsForPrint.length}`}
        teacherName={profile?.full_name || 'المعلم'}
        columns={printColumns}
        rows={printRows}
        notes
      />
    </div>
  )
}
