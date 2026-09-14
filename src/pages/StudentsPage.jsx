import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Users, Copy, Check, Phone, KeyRound, FileSpreadsheet, Printer, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Spinner } from '../App'
import Modal from '../components/ui/Modal'
import PrintReport from '../components/PrintReport'
import WaIcon from '../components/WaIcon'
import QuickGradingModal from '../components/QuickGradingModal'
import { fmtMoney } from '../lib/constants'
import { downloadCSV } from '../lib/export'
import { waLink, paymentReminderMsg } from '../lib/whatsapp'

export default function StudentsPage() {
  const toast = useToast()
  const { teacherId, profile } = useAuth()
  const [students, setStudents] = useState([])
  const [groups, setGroups] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [studentCode, setStudentCode] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [gradingOpen, setGradingOpen] = useState(false)

  const load = async () => {
    if (!teacherId) return
    setLoading(true)
    try {
      // جلب الطلاب والمجموعات والمدفوعات الخاصة بالمعلم مباشرة وبشكل موثوق
      const [sRes, gRes] = await Promise.all([
        supabase
          .from('students')
          .select('*, groups(group_name, color_code)')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false }),
        supabase
          .from('groups')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at'),
      ])

      const studentList = sRes.data ?? []
      const groupList = gRes.data ?? []

      let pRes = []
      if (studentList.length > 0) {
        const studentIds = studentList.map((s) => s.id)
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('student_id, amount, is_paid')
          .in('student_id', studentIds)
        pRes = paymentsData ?? []
      }

      setStudents(studentList)
      setGroups(groupList)
      setPayments(pRes)
    } catch (err) {
      console.error('Error loading students:', err)
      toast('تعذر تحميل بيانات الطلاب', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (teacherId) {
      load()
    }
  }, [teacherId])

  const generateCode = () => {
    const rand = Math.random().toString(36).slice(2, 8)
    setStudentCode(`std-${rand}`)
  }

  const openCreate = () => {
    setEditing(null)
    setName('')
    setGroupId('')
    setParentPhone('')
    generateCode()
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setName(s.student_name)
    setGroupId(s.group_id || '')
    setStudentCode(s.student_code || '')
    setParentPhone(s.parent_phone || '')
    setModalOpen(true)
  }

  const save = async () => {
    if (!name.trim()) {
      toast('أدخل اسم الطالب', 'error')
      return
    }
    if (!studentCode.trim()) {
      toast('أدخل كود ولي الأمر', 'error')
      return
    }
    setSaving(true)
    const payload = {
      teacher_id: teacherId,
      student_name: name.trim(),
      group_id: groupId || null,
      student_code: studentCode.trim(),
      parent_phone: parentPhone.trim() || null,
    }

    if (editing) {
      const { error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', editing.id)
        .eq('teacher_id', teacherId)
      if (error) {
        toast(
          error.message.includes('student_code')
            ? 'كود ولي الأمر مستخدم من قبل'
            : 'تعذر تعديل الطالب',
          'error',
        )
      } else {
        toast('تم تعديل بيانات الطالب')
        setModalOpen(false)
        await load()
      }
    } else {
      const { error } = await supabase.from('students').insert([payload])
      if (error) {
        toast(
          error.message.includes('student_code')
            ? 'كود ولي الأمر مستخدم من قبل'
            : 'تعذر إضافة الطالب',
          'error',
        )
      } else {
        toast('تم إضافة الطالب بنجاح')
        setModalOpen(false)
        await load()
      }
    }
    setSaving(false)
  }

  const remove = async (s) => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف الطالب "${s.student_name}"؟ سيتم حذف سجلات الحضور والمدفوعات المرتبطة.`,
      )
    )
      return
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', s.id)
      .eq('teacher_id', teacherId)
    if (error) toast('تعذر حذف الطالب', 'error')
    else {
      toast('تم حذف الطالب')
      await load()
    }
  }

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(code)
      toast('تم نسخ كود ولي الأمر')
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      toast('تعذر النسخ', 'error')
    }
  }

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        !search.trim() || s.student_name.toLowerCase().includes(search.trim().toLowerCase())
      const matchGroup = groupFilter === 'all' || s.group_id === groupFilter
      return matchSearch && matchGroup
    })
  }, [students, search, groupFilter])

  const groupById = (id) => groups.find((g) => g.id === id)

  const remainingFor = (studentId) => {
    const ps = payments.filter((p) => p.student_id === studentId)
    const total = ps.reduce((x, p) => x + Number(p.amount || 0), 0)
    const paid = ps.reduce((x, p) => x + (p.is_paid ? Number(p.amount || 0) : 0), 0)
    return Math.max(0, total - paid)
  }

  const groupNameFor = (s) => groupById(s.group_id)?.group_name || 'بدون مجموعة'

  const exportExcel = () => {
    const rows = filtered.map((s, i) => [
      i + 1,
      s.student_name,
      groupNameFor(s),
      s.student_code,
      s.parent_phone || '',
    ])
    downloadCSV({
      filename: `كشف-الطلاب-${new Date().toISOString().slice(0, 10)}`,
      headers: ['م', 'اسم الطالب', 'المجموعة', 'كود ولي الأمر', 'رقم الموبايل'],
      rows,
    })
    toast('تم تصدير كشف الطلاب')
  }

  const openPrint = () => setPrintOpen(true)

  const printColumns = ['م', 'اسم الطالب', 'المجموعة', 'كود ولي الأمر', 'رقم الموبايل', 'التوقيع']
  const printRows = filtered.map((s, i) => [
    i + 1,
    s.student_name,
    groupNameFor(s),
    s.student_code,
    s.parent_phone || '—',
    '',
  ])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-3 overflow-x-hidden p-3 md:space-y-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 md:text-2xl">الطلاب</h1>
          <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
            إدارة الطلاب، أكواد أولياء الأمور، وأرقام الموبايل
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setGradingOpen(true)} className="btn-primary">
            <ClipboardList className="h-4 w-4" />
            رصد الحصة اليومية
          </button>
          <button onClick={exportExcel} className="btn-outline">
            <FileSpreadsheet className="h-4 w-4" />
            تصدير Excel
          </button>
          <button onClick={openPrint} className="btn-outline">
            <Printer className="h-4 w-4" />
            طباعة / PDF
          </button>
          <button onClick={openCreate} className="btn-outline">
            <Plus className="h-5 w-5" />
            طالب جديد
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            className="input pr-10"
            placeholder="ابحث باسم الطالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-52" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
          <option value="all">كل المجاميع</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.group_name}
            </option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
            <Users className="h-7 w-7" />
          </div>
          <p className="text-sm font-bold text-slate-600">لا يوجد طلاب</p>
          <p className="text-xs text-slate-400">أضف أول طالب للبدء</p>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-2 md:hidden">
          {filtered.map((s) => {
            const grp = groupById(s.group_id)
            const remaining = remainingFor(s.id)
            return (
              <div key={s.id} className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white"
                      style={{ backgroundColor: grp?.color_code || '#2547eb' }}
                    >
                      {s.student_name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-700">{s.student_name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {grp ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: grp.color_code }} />
                            {grp.group_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">بدون مجموعة</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(s)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600"
                      title="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(s)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5">
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                    <KeyRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <code className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]" dir="ltr">
                      {s.student_code}
                    </code>
                    <button
                      onClick={() => copyCode(s.student_code)}
                      className="shrink-0 p-0.5 text-slate-400 transition hover:text-primary-600"
                      title="نسخ الكود"
                    >
                      {copiedId === s.student_code ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate" dir="ltr">
                      {s.parent_phone || '—'}
                    </span>
                  </div>
                </div>

                {s.parent_phone && remaining > 0 && (
                  <a
                    href={waLink(
                      s.parent_phone,
                      paymentReminderMsg({
                        studentName: s.student_name,
                        amount: fmtMoney(remaining),
                        teacherName: profile?.full_name || 'المعلم',
                      }),
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="تذكير واتساب بسداد المصاريف"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#1fb355]"
                  >
                    <WaIcon className="h-3.5 w-3.5" />
                    تذكير بالمصاريف
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="card hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">الطالب</th>
                  <th className="th">المجموعة</th>
                  <th className="th">كود ولي الأمر</th>
                  <th className="th">رقم الموبايل</th>
                  <th className="th">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => {
                  const grp = groupById(s.group_id)
                  return (
                    <tr key={s.id} className="transition hover:bg-slate-50/60">
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold text-white"
                            style={{ backgroundColor: grp?.color_code || '#2547eb' }}
                          >
                            {s.student_name.charAt(0)}
                          </span>
                          <span className="font-bold">{s.student_name}</span>
                        </div>
                      </td>
                      <td className="td">
                        {grp ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: grp.color_code }} />
                            {grp.group_name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">بدون مجموعة</span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs" dir="ltr">
                            {s.student_code}
                          </code>
                          <button
                            onClick={() => copyCode(s.student_code)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600"
                            title="نسخ الكود"
                          >
                            {copiedId === s.student_code ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="td">
                        {s.parent_phone ? (
                          <span className="inline-flex items-center gap-1.5 text-sm" dir="ltr">
                            <Phone className="h-4 w-4 text-slate-400" />
                            {s.parent_phone}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                        {s.parent_phone && remainingFor(s.id) > 0 && (
                          <span className="mt-1.5 flex items-center justify-center gap-2">
                            <a
                              href={waLink(
                                s.parent_phone,
                                paymentReminderMsg({
                                  studentName: s.student_name,
                                  amount: fmtMoney(remainingFor(s.id)),
                                  teacherName: profile?.full_name || 'المعلم',
                                }),
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="تذكير واتساب بسداد المصاريف"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#1fb355]"
                            >
                              <WaIcon className="h-3.5 w-3.5" />
                              تذكير بالمصاريف
                            </a>
                          </span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600"
                            title="تعديل"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(s)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
        size="sm"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <button onClick={() => setModalOpen(false)} className="btn-outline w-full sm:w-auto">
              إلغاء
            </button>
            <button onClick={save} disabled={saving} className="btn-primary w-full sm:w-auto">
              {saving ? <Spinner size="h-5 w-5" /> : 'حفظ'}
            </button>
          </div>
        }
      >
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="label">اسم الطالب</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الكامل للطالب"
              autoFocus
            />
          </div>

          <div>
            <label className="label">المجموعة</label>
            <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">بدون مجموعة</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              <span className="flex items-center gap-1.5">
                <KeyRound className="h-4 w-4" />
                كود ولي الأمر (يستخدمه ولي الأمر للدخول)
              </span>
            </label>
            <div className="flex gap-2">
              <input
                className="input font-mono"
                dir="ltr"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
              />
              <button type="button" onClick={generateCode} className="btn-outline shrink-0" title="توليد كود عشوائي">
                توليد
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              سلّم هذا الكود لولي الأمر للدخول على المنصة بمشاهدة قراءة فقط
            </p>
          </div>

          <div>
            <label className="label">
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                رقم موبايل ولي الأمر
              </span>
            </label>
            <input
              className="input"
              dir="ltr"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              inputMode="tel"
            />
          </div>
        </div>
      </Modal>

      <QuickGradingModal
        open={gradingOpen}
        onClose={() => setGradingOpen(false)}
        teacherId={teacherId}
        groups={groups}
        initialGroupId={groupFilter !== 'all' ? groupFilter : ''}
        onSaved={load}
      />

      <PrintReport
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title="كشف أسماء الطلاب"
        subtitle={`عدد الطلاب: ${filtered.length}`}
        teacherName={profile?.full_name || 'المعلم'}
        columns={printColumns}
        rows={printRows}
        notes
      />
    </div>
  )
}
