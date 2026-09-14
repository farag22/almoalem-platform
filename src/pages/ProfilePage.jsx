import { useState, useEffect } from 'react'
import { User, Camera, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function ProfilePage() {
  const { profile, teacherId, user, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [email, setEmail] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // جلب البيانات من الجدول مباشرة فور فتح الصفحة لضمان ملء الحقول والإيميل
  useEffect(() => {
    async function loadTeacherProfile() {
      const targetId = teacherId || profile?.id
      const targetEmail = user?.email || profile?.email

      if (!targetId && !targetEmail) return

      let query = supabase.from('teachers').select('*')
      if (targetId) {
        query = query.eq('id', targetId)
      } else if (targetEmail) {
        query = query.eq('email', targetEmail)
      }

      const { data } = await query.maybeSingle()

      if (data) {
        setFullName(data.full_name || '')
        setAvatarUrl(data.avatar_url || '')
        setEmail(data.email || targetEmail || '')
      } else if (profile) {
        setFullName(profile.full_name || '')
        setAvatarUrl(profile.avatar_url || '')
        setEmail(profile.email || targetEmail || '')
      } else if (targetEmail) {
        setEmail(targetEmail)
      }
    }

    loadTeacherProfile()
  }, [profile, teacherId, user])

  // رفع الصورة الشخصية إلى Supabase Storage
  const handleImageUpload = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const currentId = teacherId || profile?.id || 'teacher'
      const fileName = `${currentId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
      toast('تم رفع الصورة بنجاح')
    } catch (error) {
      console.error(error)
      toast('حدث خطأ أثناء رفع الصورة، تأكد من إعدادات الـ Bucket', 'error')
    } finally {
      setUploading(false)
    }
  }

  // حفظ التعديلات
  const handleSave = async (e) => {
    e.preventDefault()
    const currentId = teacherId || profile?.id
    const targetEmail = email || user?.email || profile?.email

    if (!currentId && !targetEmail) {
      toast('بيانات المعلم غير متوفرة، يرجى إعادة تسجيل الدخول', 'error')
      return
    }

    setSaving(true)
    try {
      let query = supabase.from('teachers').update({ 
        full_name: fullName, 
        avatar_url: avatarUrl 
      })

      if (currentId) {
        query = query.eq('id', currentId)
      } else {
        query = query.eq('email', targetEmail)
      }

      const { error } = await query

      if (error) throw error

      toast('تم تحديث الملف الشخصي بنجاح')
      
      if (refreshProfile) {
        await refreshProfile()
      }

      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)

    } catch (error) {
      console.error(error)
      toast('تعذر حفظ البيانات', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card p-6 bg-white shadow-sm rounded-2xl">
        <h1 className="text-xl font-extrabold text-slate-800 mb-6">الملف الشخصي للمعلم</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* معاينة الصورة ورفعها */}
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-slate-400" />
              )}
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-600 transition hover:bg-primary-100">
                <Camera className="h-4 w-4" />
                {uploading ? 'جاري الرفع...' : 'تغيير الصورة الشخصية'}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <p className="text-xs text-slate-400 mt-1">يُفضل استخدام صورة مربعة واضحة</p>
            </div>
          </div>

          {/* تعديل الاسم */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none"
              placeholder="اكتب اسمك هنا"
              required
            />
          </div>

          {/* البريد (للعرض فقط) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </form>
      </div>
    </div>
  )
}
