import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GraduationCap, Printer, X } from 'lucide-react'
import { fmtDate } from '../lib/constants'

export default function PrintReport({
  open,
  onClose,
  title,
  subtitle,
  teacherName,
  columns,
  rows,
  notes,
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('print-report-open')
      return () => {
        document.body.style.overflow = ''
        document.body.classList.remove('print-report-open')
      }
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="print-report-overlay">
      <div className="print-report-toolbar">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-primary">
            <Printer className="h-4 w-4" />
            طباعة / PDF
          </button>
          <button onClick={onClose} className="btn-outline">
            <X className="h-4 w-4" />
            إغلاق
          </button>
        </div>
      </div>

      <div id="print-area" className="print-area">
        <div className="print-head">
          <div className="print-logo">
            <GraduationCap className="h-9 w-9" />
          </div>
          <div className="print-title-block">
            <h1>منصة تعليم</h1>
            <h2>{title}</h2>
          </div>
          <div className="print-date">
            <p>التاريخ: {fmtDate(new Date())}</p>
            {teacherName && <p>المعلم: {teacherName}</p>}
          </div>
        </div>

        {subtitle && <p className="print-subtitle">{subtitle}</p>}

        <table className="print-table">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {notes && (
          <div className="print-notes">
            <p className="text-sm font-bold text-slate-700">ملاحظات / توقيع</p>
            <div className="mt-8 flex items-center justify-between">
              <div className="print-sign">توقيع المعلم</div>
              <div className="print-sign">توقيع الإدارة</div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
