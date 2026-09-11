import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Wallet,
  Search,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Spinner } from '../App'
import Modal from '../components/ui/Modal'
import PrintReport from '../components/PrintReport'
import WaIcon from '../components/WaIcon'
import { fmtMoney } from '../lib/constants'
import { downloadCSV } from '../lib/export'
import { waLink, paymentReminderMsg } from '../lib/whatsapp'

export default function PaymentsPage() {
  const toast = useToast()
  const { teacherId, profile } = useAuth()
  const [students, setStudents] = useState([])
  const [groups, setGroups] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupFilter, setGroupFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [payingStudent, setPayingStudent] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [printOpen, setPrintOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: myStudentIds }, sRes, gRes] = await Promise.all([
      supabase.from('students').select('id').eq('teacher_id', teacherId),
      supabase
        .from('students')
        .select('*, groups(group_name, color_code)')
        .eq('teacher_id', teacherId)
        .order('created_at'),
      supabase
        .from('groups')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at'),
    ])

    const ids = myStudentIds?.map((s) => s.id) ?? []
    const { data: pRes } = ids.length
      ? await supabase
          .from('payments')
          .select('*, students(student_name)')
          .in('student_id', ids)
          .order('created_at', { ascending: false })
      : { data: [] }

    setStudents(sRes.data ?? [])
    setGroups(gRes.data ?? [])
    setPayments(pRes ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchGroup = groupFilter === 'all' || s.group_id === groupFilter
      const matchSearch =
        !search.trim() ||
        s.student_name.toLowerCase().includes(search.trim().toLowerCase())
      return matchGroup && matchSearch
    })
  }, [students, groupFilter, search])

  const paymentsFor = (studentId) => payments.filter((p) => p.student_id === studentId)

  const summary = useMemo(() => {
    let total = 0
    let collected = 0
    payments.forEach((p) => {
      total += Number(p.amount || 0)
      if (p.is_paid) collected += Number(p.amount || 0)
    })
    return { total, collected, remaining: total - collected }
  }, [payments])

  const studentStats = (s) => {
    const ps = paymentsFor(s.id)
    const total = ps.reduce((x, p) => x + Number(p.amount || 0), 0)
    const paid = ps.reduce((x, p) => x + (p.is_paid ? Number(p.amount || 0) : 0), 0)
    return { total, paid, remaining: Math.max(0, total - paid) }
  }

  const exportExcel = () => {
    const rows = filteredStudents.map((s, i) => {
      const st = studentStats(s)
      return [
        i + 1,
        s.student_name,
        s.groups?.group_name || 'بدون مجموعة',
        fmtMoney(st.total),
        fmtMoney(st.paid),
        fmtMoney(st.remaining),
        st.remaining > 0 ? 'متبقي' : 'مدفوع',
      ]
    })
    downloadCSV({
      filename: `تقرير-التحصيلات-${new Date().toISOString().slice(0, 10)}`,
      headers: ['م', 'اسم الطالب', 'المجموعة', 'المستحق', 'المدفوع', 'المتبقي', 'الحالة'],
      rows,
    })
    toast('تم تصدير تقرير التحصيلات')
  }

  const openPrint = () => setPrintOpen(true)
  const printColumns = ['م', 'اسم الطالب', 'المجموعة', 'المستحق', 'المدفوع', 'المتبقي', 'الحالة']
  const printRows = filteredStudents.map((s, i) => {
    const st = studentStats(s)
    return [
      i + 1,
      s.student_name,
      s.groups?.group_name || 'بدون مجموعة',
      `${fmtMoney(st.total)} ج.م`,
      `${fmtMoney(st.paid)} ج.م`,
      `${fmtMoney(st.remaining)} ج.م`,
      st.remaining > 0 ? 'متبقي' : 'مدفوع',
    ]
  })

  const openCreate = (studentId = '') => {
    setEditing(null)
    setStudentId(studentId || filteredStudents[0]?.id || '')
    setAmount('')
    setModalOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setStudentId(p.student_id)
    setAmount(String(p.amount))
    setModalOpen(true)
  }

  const openPay = (student) => {
    setPayingStudent(student)
    setPayAmount('')
    setPayModalOpen(true)
  }

  const save = async () => {
    if (!studentId) {
      toast('اختر الطالب', 'error')
      return
    }
    if (!amount || Number(amount) < 0) {
      toast('أدخل قيمة المستحق', 'error')
      return
    }
    setSaving(true)
    const payload = {
      student_id: studentId,
      amount: Number(amount),
    }

    if (editing) {
      const { error } = await supabase.from('payments').update(payload).eq('id', editing.id)
      if (error) toast('تعذر تعديل الدفعة', 'error')
      else toast('تم تعديل الدفعة')
    } else {
      const { error } = await supabase.from('payments').insert(payload)
      if (error) toast('تعذر إضافة الدفعة', 'error')
      else toast('تم إضافة الدفعة')
    }
    setSaving(false)
    setModalOpen(false)
    load()
  }

  const markPaid = async (p) => {
    const { error } = await supabase
      .from('payments')
      .update({
        is_paid: !p.is_paid,
        paid_at: !p.is_paid ? new Date().toISOString() : null,
      })
      .eq('id', p.id)
    if (error) toast('تعذر التحديث', 'error')
    else toast(p.is_paid ? 'تم إلغاء الدفع' : `تم تسجيل دفع ${fmtMoney(p.amount)} ج.م`)
    load()
  }

  const recordPayment = async () => {
    if (!payingStudent || !payAmount || Number(payAmount) <= 0) {
      toast('أدخل المبلغ المدفوع', 'error')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('payments').insert({
      student_id: payingStudent.id,
      amount: Number(payAmount),
      is_paid: true,
      paid_at: new Date().toISOString(),
    })
    if (error) toast('تعذر تسجيل الدفعة', 'error')
    else toast(`تم تسجيل دفع ${fmtMoney(payAmount)} ج.م`)
    setSaving(false)
    setPayModalOpen(false)
    load()
  }

  const remove = async (p) => {
    if (!window.confirm('حذف هذه الدفعة؟')) return
    const { error } = await supabase.from('payments').delete().eq('id', p.id)
    if (error) toast('تعذر الحذف', 'error')
    else toast('تم حذف الدفعة')
    load()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">المصاريف والمدفوعات</h1>
          <p className="mt-1 text-sm text-slate-500">سجّل المصاريف وتابع مدفوعات كل طالب</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportExcel} className="btn-outline flex-1 sm:flex-none justify-center">
            <FileSpreadsheet className="h-4 w-4" /> تصدير Excel
          </button>
          <button onClick={openPrint} className="btn-outline flex-1 sm:flex-none justify-center">
            <Printer className="h-4 w-4" /> طباعة / PDF
          </button>
          <button onClick={() => openCreate()} className="btn-primary w-full sm:w-auto justify-center">
            <Plus className="h-5 w-5" /> دفعة جديدة
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">إجمالي المستحق</p>
              <p className="text-xl font-extrabold text-slate-800">{fmtMoney(summary.total)} ج.م</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">المحصّل</p>
              <p className="text-xl font-extrabold text-emerald-700">{fmtMoney(summary.collected)} ج.م</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">المتبقي</p>
              <p className="text-xl font-extrabold text-rose-700">{fmtMoney(summary.remaining)} ج.م</p>
            </div>
          </div>
        </div>
      </div>

      {/* Student payment status */}
      <div className="card p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-extrabold text-slate-800">حالة مدفوعات الطلاب</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full sm:w-auto">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="input pr-10 w-full"
                placeholder="ابحث عن طالب..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-full sm:w-auto"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="all">كل المجاميع</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredStudents.map((s) => {
            const ps = paymentsFor(s.id)
            const total = ps.reduce((x, p) => x + Number(p.amount || 0), 0)
            const paidSum = ps.reduce((x, p) => x + (p.is_paid ? Number(p.amount || 0) : 0), 0)
            const remaining = Math.max(0, total - paidSum)
            const status =
              total === 0
                ? { label: 'بدون دفعات', cls: 'bg-slate-100 text-slate-500' }
                : paidSum >= total
                ? { label: 'مدفوع بالكامل', cls: 'bg-emerald-100 text-emerald-700' }
                : paidSum > 0
                ? { label: 'دفع جزئي', cls: 'bg-amber-100 text-amber-700' }
                : { label: 'غير مدفوع', cls: 'bg-rose-100 text-rose-700' }

            return (
              <div key={s.id} className="rounded-2xl border border-slate-100 p-4 transition hover:shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white"
                      style={{ backgroundColor: s.groups?.color_code || '#2547eb' }}
                    >
                      {s.student_name.charAt(0)}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 truncate">{s.student_name}</p>
                      <p className="text-xs font-semibold text-slate-400 truncate">
                        {s.groups?.group_name || 'بدون مجموعة'}
                      </p>
                    </div>
                  </div>
                  <span className={`badge flex-shrink-0 ${status.cls}`}>{status.label}</span>
                </div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">المدفوع / المستحق</span>
                  <span className="font-extrabold text-slate-800">
                    {fmtMoney(paidSum)} / {fmtMoney(total)} ج.م
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openPay(s)} className="btn-outline flex-1 py-2 justify-center">
                    <Banknote className="h-4 w-4" /> تسجيل دفع
                  </button>
                  {remaining > 0 && s.parent_phone && (
                    <a
                      href={waLink(
                        s.parent_phone,
                        paymentReminderMsg({
                          studentName: s.student_name,
                          amount: fmtMoney(remaining),
                          teacherName: profile?.full_name || 'المعلم',
                        })
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="تذكير واتساب بسداد المصاريف"
                      className="flex w-11 items-center justify-center rounded-xl bg-[#25D366] text-white transition hover:bg-[#1fb355]"
                    >
                      <WaIcon className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* All payments table section */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-extrabold text-slate-800">سجل جميع الدفعات</h2>
        </div>
        {payments.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">لا توجد دفعات مسجلة بعد</p>
        ) : (
          <>
            {/* 📱 عرض الموبايل: كروت خفيفة تحت بعضها */}
            <div className="block md:hidden divide-y divide-slate-100">
              {payments.map((p) => {
                const st = p.is_paid
                  ? { label: 'مدفوع', cls: 'bg-emerald-100 text-emerald-700' }
                  : { label: 'غير مدفوع', cls: 'bg-rose-100 text-rose-700' }
                return (
                  <div key={p.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{p.students?.student_name || '—'}</span>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>المبلغ: <strong className="text-slate-800">{fmtMoney(p.amount)} ج.م</strong></span>
                      <span>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('ar-EG') : '—'}</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => markPaid(p)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          p.is_paid ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p.is_paid ? 'إلغاء' : 'دفع'}
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 💻 عرض الشاشات الكبيرة: جدول متكامل */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="th">الطالب</th>
                    <th className="th text-center">المستحق</th>
                    <th className="th text-center">الحالة</th>
                    <th className="th text-center">تاريخ الدفع</th>
                    <th className="th text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.map((p) => {
                    const st = p.is_paid
                      ? { label: 'مدفوع', cls: 'bg-emerald-100 text-emerald-700' }
                      : { label: 'غير مدفوع', cls: 'bg-rose-100 text-rose-700' }
                    return (
                      <tr key={p.id} className="transition hover:bg-slate-50/60">
                        <td className="td font-bold">{p.students?.student_name || '—'}</td>
                        <td className="td text-center">{fmtMoney(p.amount)} ج.م</td>
                        <td className="td text-center">
                          <span className={`badge ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="td text-center text-xs text-slate-500">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString('ar-EG') : '—'}
                        </td>
                        <td className="td text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => markPaid(p)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                p.is_paid
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {p.is_paid ? 'إلغاء' : 'دفع'}
                            </button>
                            <button
                              onClick={() => openEdit(p)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-primary-50 hover:text-primary-600"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => remove(p)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل الدفعة' : 'إضافة دفعة'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-outline">إلغاء</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Spinner size="h-5 w-5" /> : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">الطالب</label>
            <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">اختر الطالب</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.student_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">المستحق (ج.م)</label>
            <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" />
          </div>
        </div>
      </Modal>

      <Modal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title={`تسجيل دفع — ${payingStudent?.student_name || ''}`}
        footer={
          <>
            <button onClick={() => setPayModalOpen(false)} className="btn-outline">إلغاء</button>
            <button onClick={recordPayment} disabled={saving} className="btn-success">
              {saving ? <Spinner size="h-5 w-5" /> : 'تأكيد الدفع'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">المبلغ المدفوع (ج.م)</label>
            <input
              type="number"
              className="input text-lg font-extrabold"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              min="0"
              autoFocus
            />
          </div>
          {payingStudent && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="inline h-4 w-4" /> سيتم تسجيل هذا المبلغ كمدفوع بالكامل
            </div>
          )}
        </div>
      </Modal>

      <PrintReport
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title="تقرير التحصيلات"
        subtitle={`إجمالي المستحق: ${fmtMoney(summary.total)} ج.م — المحصّل: ${fmtMoney(summary.collected)} ج.م — المتبقي: ${fmtMoney(summary.remaining)} ج.م`}
        teacherName={profile?.full_name || 'المعلم'}
        columns={printColumns}
        rows={printRows}
        notes
      />
    </div>
  )
}
