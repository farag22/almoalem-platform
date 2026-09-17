import { Wallet, MessageCircle, ShieldAlert, LogOut, CheckCircle, Database } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function SubscriptionExpiredPage() {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()

  const whatsappNumber = '201115413154'
  const message = encodeURIComponent(
    `مرحباً، أرغب في تفعيل اشتراك منصة السنتر التعليمي لحسابي (البريد: ${profile?.email || ''}) بعد انتهاء التجربة المجانية. سددت مبلغ 100 جنيه، برجاء التفعيل وحفظ بيانات السنتر.`
  )
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl space-y-6">
        
        {/* أيقونة التنبيه */}
        <div className="mx-auto w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
          <Database className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">انتهت فترة التجربة المجانية (30 يوماً)</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            نود إعلامك بأن <span className="text-emerald-400 font-bold">جميع بيانات سنترك، طلابك، ومجاميعك محفوظة بأمان تام</span> ولن يتم حذفها أبداً طوال مدة تصل إلى <span className="text-white font-bold">6 أشهر</span> لحين التفعيل.
          </p>
        </div>

        {/* تفاصيل التكلفة والتفعيل */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-5 space-y-3 text-right">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">قيمة تفعيل الاشتراك:</span>
            <span className="text-emerald-400 font-extrabold text-lg">100 جنيه مصري</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">مدة الاشتراك الجديد:</span>
            <span className="text-white font-bold">30 يوماً كاملة</span>
          </div>
          <div className="border-t border-slate-700 pt-3 text-xs text-slate-400 space-y-1.5">
            <p className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>دفع 100 جنيه عبر وسائل الدفع المتاحة</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>إرسال إيصال الدفع عبر واتساب للتفعيل الفوري</span>
            </p>
          </div>
        </div>

        {/* زر الواتساب للتفعيل */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-base"
        >
          <MessageCircle className="w-5 h-5" />
          <span>تواصل عبر الواتساب للتفعيل (01115413154)</span>
        </a>

        {/* زر تسجيل الخروج */}
        <button
          onClick={async () => {
            await signOut()
            navigate('/teacher/login')
          }}
          className="w-full bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الدخول بحساب آخر</span>
        </button>

      </div>
    </div>
  )
}
