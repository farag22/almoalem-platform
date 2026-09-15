import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Wallet, CalendarCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fmtMoney } from '../lib/constants'

export default function ReportsPage() {
  const { teacherId } = useAuth()
  const [stats, setStats] = useState({
    studentsCount: 0,
    groupsCount: 0,
    totalCollected: 0,
    totalRemaining: 0,
    attendanceRate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      if (!teacherId) return
      setLoading(true)

      // 1. جلب طلاب المعلم ومجاميعه
      const [sRes, gRes, aRes] = await Promise.all([
        supabase.from('students').select('id').eq('teacher_id', teacherId),
        supabase.from('groups').select('id', { count: 'exact' }).eq('teacher_id', teacherId),
        supabase.from('attendance').select('status'),
      ])

      const students = sRes.data ?? []
      const studentIds = students.map(s => s.id)
      const studentsCount = students.length
      const groupsCount = gRes.count ?? gRes.data?.length ?? 0

      // 2. جلب المدفوعات الخاصة بطلاب المعلم فقط
      let collected = 0
      let remaining = 0

      if (studentIds.length > 0) {
        const { data: pData } = await supabase
          .from('payments')
          .select('amount, is_paid')
          .in('student_id', studentIds)

        ;(pData ?? []).forEach((p) => {
          const amt = Number(p.amount) || 0
          if (p.is_paid) collected += amt
          else remaining += amt
        })
      }

      const attList = aRes.data ?? []
      const presentCount = attList.filter((a) => a.status === 'present').length
      const attendanceRate = attList.length > 0 ? Math.round((presentCount / attList.length) * 100) : 0

      setStats({
        studentsCount,
        groupsCount,
        totalCollected: collected,
        totalRemaining: remaining,
        attendanceRate,
      })
      setLoading(false)
    }

    fetchReports()
  }, [teacherId])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="card p-6 bg-white shadow-sm rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary-600" />
            <span>التقارير الشاملة والإحصائيات</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">نظرة عامة ومؤشرات أداء شاملة لبيانات السنتر والطلاب.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white shadow-sm rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">إجمالي الطلاب</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.studentsCount}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white shadow-sm rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">المجاميع الدراسية</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.groupsCount}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white shadow-sm rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">المصاريف المحصلة</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{fmtMoney(stats.totalCollected)} ج.م</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white shadow-sm rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">نسبة الحضور العامة</p>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1">{stats.attendanceRate}%</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <CalendarCheck className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h2 className="text-base font-extrabold text-slate-800 mb-4">ملخص الأداء المالي</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-xs font-bold text-emerald-700">إجمالي الإيرادات المحصلة</p>
            <p className="text-2xl font-extrabold text-emerald-800 mt-1">{fmtMoney(stats.totalCollected)} ج.م</p>
          </div>
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
            <p className="text-xs font-bold text-rose-700">المصاريف المتأخرة (المتبقية)</p>
            <p className="text-2xl font-extrabold text-rose-800 mt-1">{fmtMoney(stats.totalRemaining)} ج.م</p>
          </div>
        </div>
      </div>
    </div>
  )
}
