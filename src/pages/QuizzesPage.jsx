import { useState, useEffect } from 'react'
import { MessageSquareText, Users, Wallet, Award, Send, Phone, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function QuizzesPage() {
  const { teacherId } = useAuth()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState('absence') // 'absence' | 'payments' | 'certificate'
  const [absentStudents, setAbsentStudents] = useState([])
  const [lateStudents, setLateStudents] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  
  // بيانات شهادة التقدير
  const [studentName, setStudentName] = useState('')
  const [achievement, setAchievement] = useState('الحصول على الدرجة النهائية في اختبار الشهر')

  useEffect(() => {
    if (teacherId) {
      fetchGroupsAndData()
    }
  }, [teacherId])

  const fetchGroupsAndData = async () => {
    // جلب المجاميع
    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .eq('teacher_id', teacherId)

    if (groupsData && groupsData.length > 0) {
      setGroups(groupsData)
      setSelectedGroup(groupsData[0].id)
    }

    // جلب الطلاب الغائبين (مثال تجريبي من سجل الحضور أو الطلاب)
    // يمكن ربطها لاحقاً بجدول الحضور الفعلي
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, student_name, phone, parent_phone, group_id')
      .eq('teacher_id', teacherId)

    if (studentsData) {
      // محاكاة فرز بعض الطلاب للغياب والمصاريف المتأخرة لتسهيل العرض الميداني
      setAbsentStudents(studentsData.slice(0, 3))
      setLateStudents(studentsData.slice(2, 5))
    }
  }

  // إرسال واتساب للغیاب
  const sendAbsenceWhatsApp = (student) => {
    const phone = student.parent_phone || student.phone || ''
    const cleanPhone = phone.startsWith('0') ? '+2' + phone : phone
    const message = `مرحباً ولي أمر الطالب/ة ${student.student_name}، نود إعلامكم بتغيب ابنكم/ابنتكم عن حضور الحصة الدراسية اليوم، نرجو المتابعة مع تحيات إدارة السنتر.`
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // إرسال واتساب للمصاريف المتأخرة
  const sendPaymentWhatsApp = (student) => {
    const phone = student.parent_phone || student.phone || ''
    const cleanPhone = phone.startsWith('0') ? '+2' + phone : phone
    const message = `مرحباً ولي أمر الطالب/ة ${student.student_name}، نود التذكير بوجود مصاريف دراسية متأخرة مستحقة للسداد. نرجو التفضل بالسداد في أقرب وقت. شكراً لحرصكم.`
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // إرسال شهادة تقدير عبر واتساب
  const sendCertificateWhatsApp = (e) => {
    e.preventDefault()
    if (!studentName.trim()) {
      toast('يرجى كتابة اسم الطالب', 'error')
      return
    }
    const message = `🌟 شهادة تقدير وتفوق 🌟\n\nتتقدم إدارة السنتر بخالص الشكر والتقدير للطالب/ة المتميز/ة: *${studentName}*\nوذلك نظراً لـ: *${achievement}*.\n\nنتمنى لك دوام التفوق والنجاح! 🎓✨`
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    toast('تم تجهيز شهادة التقدير للإرسال بنجاح!')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* رأس الصفحة */}
      <div className="card p-6 bg-white shadow-sm rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <MessageSquareText className="h-6 w-6 text-primary-600" />
            <span>مركز الإرسال والمتابعة عبر واتساب</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">تنبيهات الغياب، متابعة المصاريف المتأخرة، وإرسال شهادات التقدير للطلاب.</p>
        </div>
      </div>

      {/* تبويبات التنقل */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 gap-2">
        <button
          onClick={() => setActiveTab('absence')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'absence' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>تنبيهات الغياب</span>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'payments' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>المصاريف المتأخرة</span>
        </button>
        <button
          onClick={() => setActiveTab('certificate')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'certificate' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>شهادات التقدير</span>
        </button>
      </div>

      {/* محتوى التبويب الأول: تنبيهات الغياب */}
      {activeTab === 'absence' && (
        <div className="card p-6 bg-white shadow-sm rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-800">الطلاب الغائبون اليوم</h2>
            <span className="text-xs bg-rose-50 text-rose-600 px-3 py-1 rounded-full font-bold">
              {absentStudents.length} طلاب غائبين
            </span>
          </div>
          {absentStudents.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">لا توجد حالات غياب مسجلة اليوم</p>
          ) : (
            <div className="space-y-3">
              {absentStudents.map((st) => (
                <div key={st.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{st.student_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">رقم ولي الأمر: {st.parent_phone || st.phone || 'غير متوفر'}</p>
                  </div>
                  <button
                    onClick={() => sendAbsenceWhatsApp(st)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>إرسال واتساب للغياب</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* محتوى التبويب الثاني: المصاريف المتأخرة */}
      {activeTab === 'payments' && (
        <div className="card p-6 bg-white shadow-sm rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-800">متابعة المصاريف المتأخرة</h2>
            <span className="text-xs bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-bold">
              {lateStudents.length} طلاب لم يدفعوا
            </span>
          </div>
          {lateStudents.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">جميع الطلاب قاموا بسداد المصاريف</p>
          ) : (
            <div className="space-y-3">
              {lateStudents.map((st) => (
                <div key={st.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{st.student_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">رقم ولي الأمر: {st.parent_phone || st.phone || 'غير متوفر'}</p>
                  </div>
                  <button
                    onClick={() => sendPaymentWhatsApp(st)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>تذكير بالمصاريف واتساب</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* محتوى التبويب الثالث: شهادات التقدير */}
      {activeTab === 'certificate' && (
        <div className="card p-6 bg-white shadow-sm rounded-2xl space-y-4">
          <h2 className="text-base font-extrabold text-slate-800">إرسال شهادة تقدير أو تهنئة متفوق</h2>
          <form onSubmit={sendCertificateWhatsApp} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">اسم الطالب / الطالبة</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="مثال: أحمد محمد محمود"
                className="input text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">سبب التكريم أو التهنئة</label>
              <input
                type="text"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
                placeholder="مثال: الحصول على الدرجة النهائية في اختبار الشهر"
                className="input text-sm"
                required
              />
            </div>
            <div className="pt-2">
              <button type="submit" className="btn-primary px-6 py-2.5 text-sm font-bold flex items-center gap-1.5 w-full justify-center">
                <Award className="h-4 w-4" />
                <span>توليد وإرسال الشهادة عبر واتساب</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
