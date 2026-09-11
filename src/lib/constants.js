export const GROUP_COLORS = [
  { value: '#2547eb', label: 'أزرق' },
  { value: '#10b981', label: 'أخضر' },
  { value: '#f59e0b', label: 'برتقالي' },
  { value: '#ef4444', label: 'أحمر' },
  { value: '#8b5cf6', label: 'بنفسجي' },
  { value: '#ec4899', label: 'وردي' },
  { value: '#06b6d4', label: 'سماوي' },
  { value: '#64748b', label: 'رمادي' },
]

export const MONTHS = [
  { value: 1, label: 'يناير' },
  { value: 2, label: 'فبراير' },
  { value: 3, label: 'مارس' },
  { value: 4, label: 'أبريل' },
  { value: 5, label: 'مايو' },
  { value: 6, label: 'يونيو' },
  { value: 7, label: 'يوليو' },
  { value: 8, label: 'أغسطس' },
  { value: 9, label: 'سبتمبر' },
  { value: 10, label: 'أكتوبر' },
  { value: 11, label: 'نوفمبر' },
  { value: 12, label: 'ديسمبر' },
]

export const ATTENDANCE_STATUS = {
  present: { label: 'حاضر', color: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-500' },
  absent: { label: 'غائب', color: 'bg-rose-100 text-rose-700', btn: 'bg-rose-500' },
  late: { label: 'متأخر', color: 'bg-amber-100 text-amber-700', btn: 'bg-amber-500' },
}

export const HOMEWORK_STATUS = {
  submitted: { label: 'تم التسليم', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  partial: { label: 'تسليم جزئي', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  not_submitted: { label: 'لم يسلم', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
}

export const evalScoreBadge = (score, total) => {
  if (score == null || total == null || total <= 0) return 'bg-slate-100 text-slate-600'
  const pct = (Number(score) / Number(total)) * 100
  if (pct >= 80) return 'bg-emerald-100 text-emerald-700'
  if (pct >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

export const homeworkCompliance = (evals = []) => {
  if (!evals.length) return 0
  const total = evals.length
  const done = evals.reduce((acc, e) => {
    if (e.homework === 'submitted') return acc + 1
    if (e.homework === 'partial') return acc + 0.5
    return acc
  }, 0)
  return Math.round((done / total) * 100)
}

export const fmtDate = (d) => {
  const date = new Date(d)
  return date.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })
