import { useEffect, useState, useMemo, useRef } from 'react'
import { Calendar, QrCode, Search, CheckCircle2, XCircle, Users, Camera, StopCircle } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Spinner } from '../App'
import Modal from '../components/ui/Modal'

export default function SessionsPage() {
  const toast = useToast()
  const { teacherId } = useAuth()
  const [students, setStudents] = useState([])
  const [groups, setGroups] = useState([])
  const [attendanceToday, setAttendanceToday] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const scannerRef = useRef(null)

  const todayStr = new Date().toISOString().slice(0, 10)

  const load = async () => {
    if (!teacherId) return
    setLoading(true)
    try {
      const [sRes, gRes, attRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('student_name'),
        supabase
          .from('groups')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at'),
        supabase
          .from('attendance')
          .select('student_id, status')
          .eq('teacher_id', teacherId)
          .eq('date', todayStr),
      ])

      const studentList = sRes.data ?? []
      const attMap = {}
      attRes.data?.forEach((att) => {
        attMap[att.student_id] = att.status
      })

      setStudents(studentList)
      setGroups(gRes.data ?? [])
      setAttendanceToday(attMap)
    } catch (err) {
      console.error('Error loading QR attendance:', err)
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

  // تشغيل وإيقاف كاميرا قارئ الـ QR
  useEffect(() => {
    let qrScanner = null
    if (scannerOpen && cameraActive) {
      try {
        qrScanner = new Html5QrcodeScanner(
          'qr-reader',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        )
        qrScanner.render(
          (decodedText) => {
            handleScannedCode(decodedText)
            if (qrScanner) {
              qrScanner.clear().catch(() => {})
            }
            setCameraActive(false)
            setScannerOpen(false)
          },
          (error) => {
            // أخطاء المسح المؤقتة أثناء توجيه الكاميرا يتم تجاهلها
          }
        )
      } catch (e) {
        console.error('Camera init error:', e)
      }
    }

    return () => {
      if (qrScanner) {
        qrScanner.clear().catch(() => {})
      }
    }
  }, [scannerOpen, cameraActive, students])

  const handleScannedCode = (code) => {
    const cleanCode = code.trim().toLowerCase()
    const student = students.find(
      (s) =>
        s.student_code?.toLowerCase() === cleanCode ||
        s.id?.toLowerCase() === cleanCode
    )
    if (!student) {
      toast(`لم يتم التعرف على الكود: ${code}`, 'error')
      return
    }
    markAttendance(student.id, 'present')
    toast(`تم تسجيل حضور: ${student.student_name}`)
  }

  const groupById = (id) => groups.find((g) => g.id === id)

  const markAttendance = async (studentId, status) => {
    try {
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('date', todayStr)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('attendance')
          .update({ status })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const studentObj = students.find((s) => s.id === studentId)
        const { error } = await supabase.from('attendance').insert([
          {
            teacher_id: teacherId,
            user_id: teacherId,
            student_id: studentId,
            group_id: studentObj?.group_id || null,
            status,
            date: todayStr,
          },
        ])
        if (error) throw error
      }

      setAttendanceToday((prev) => ({ ...prev, [studentId]: status }))
    } catch (err) {
      console.error('Attendance error:', err)
      toast('تعذر تسجيل الحضور', 'error')
    }
  }

  const handleManualScan = () => {
    if (!manualCode.trim()) {
      toast('أدخل كود الطالب', 'error')
      return
    }
    handleScannedCode(manualCode)
    setManualCode('')
    setScannerOpen(false)
    setCameraActive(false)
  }

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchGroup = groupFilter === 'all' || s.group_id === groupFilter
      const matchSearch =
        !search.trim() ||
        s.student_name.toLowerCase().includes(search.trim().toLowerCase()) ||
        s.student_code?.toLowerCase().includes(search.trim().toLowerCase())
      return matchGroup && matchSearch
    })
  }, [students, groupFilter, search])

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
          <h1 className="text-2xl font-extrabold text-slate-800">إدارة الحضور بـ QR Code</h1>
          <p className="mt-1 text-sm text-slate-500">امسح الكود بالكاميرا أو اضغط لتسجيل حضور حصة اليوم ({todayStr})</p>
        </div>
        <button
          onClick={() => {
            setScannerOpen(true)
            setCameraActive(true)
          }}
          className="btn-primary w-full sm:w-auto justify-center"
        >
          <Camera className="h-5 w-5" /> فتح قارئ الباركود (الكاميرا)
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            className="input pr-10"
            placeholder="ابحث باسم الطالب أو كود QR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-52"
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

      {/* Students list */}
      {filteredStudents.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Users className="h-12 w-12 text-slate-300" />
          <p className="font-bold text-slate-600">لا توجد نتائج مطابقة للبحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStudents.map((s) => {
            const grp = groupById(s.group_id)
            const status = attendanceToday[s.id]
            return (
              <div key={s.id} className="card p-4 space-y-3 relative overflow-hidden transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-extrabold text-lg shadow-sm"
                      style={{ backgroundColor: grp?.color_code || '#2547eb' }}
                    >
                      {s.student_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800">{s.student_name}</h3>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">
                        {grp?.group_name || 'بدون مجموعة'}
                      </p>
                      <code className="mt-1 inline-block bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] text-slate-600" dir="ltr">
                        QR: {s.student_code}
                      </code>
                    </div>
                  </div>

                  <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(s.student_code || s.id)}`}
                      alt="QR Code"
                      className="h-14 w-14 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      markAttendance(s.id, 'present')
                      toast('تم تسجيل الحضور بنجاح')
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                      status === 'present'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" /> حاضر
                  </button>
                  <button
                    onClick={() => {
                      markAttendance(s.id, 'absent')
                      toast('تم تسجيل الغياب')
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                      status === 'absent'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <XCircle className="h-4 w-4" /> غائب
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Camera & Manual Scanner Modal */}
      <Modal
        open={scannerOpen}
        onClose={() => {
          setScannerOpen(false)
          setCameraActive(false)
        }}
        title="قارئ كود الـ QR والباركود"
        footer={
          <>
            <button
              onClick={() => {
                setScannerOpen(false)
                setCameraActive(false)
              }}
              className="btn-outline"
            >
              إغلاق
            </button>
            <button onClick={handleManualScan} className="btn-primary">
              تسجيل الكود يدوياً
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {cameraActive ? (
            <div className="relative overflow-hidden rounded-2xl bg-black p-2">
              <div id="qr-reader" className="w-full"></div>
              <button
                onClick={() => setCameraActive(false)}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white"
              >
                <StopCircle className="h-4 w-4" /> إيقاف الكاميرا
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCameraActive(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50 py-6 text-sm font-bold text-primary-700 transition hover:bg-primary-100"
            >
              <Camera className="h-6 w-6" /> اضغط هنا لتشغيل الكاميرا للمسح
            </button>
          )}

          <div>
            <label className="label">أو أدخل كود الطالب يدوياً / جهاز الباركود</label>
            <input
              className="input font-mono text-center text-lg uppercase"
              dir="ltr"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="std-xxxxxx"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualScan()
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
