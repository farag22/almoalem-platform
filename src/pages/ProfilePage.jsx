import { useState } from 'react'
import { User, Camera, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function ProfilePage() {
  const { profile, teacherId } = useAuth()
  const toast = useToast()
  
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // رفع الصورة الشخصية إلى Supabase Storage أو تخزين رابطها
  const handleImageUpload = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${teacherId}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // رفع الملف إلى Bucket باسم 'avatars' (يجب إنشاؤه مسبقاً في Supabase Storage)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // جلب الرابط العام للصورة
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
      toast('تم رفع الصورة بنجاح')
    } catch (error) {
      toast('حدث خطأ أثناء رفع الصورة، تأكد من إنشاء Bucket باسم avatars', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('teachers')
      .update({ full_name: fullName, avatar_url: avatarUrl })
      .eq('id', teacherId)

    if (error) {
      toast('تعذر حفظ البيانات', 'error')
    } else {
      toast('تم تحديث الملف الشخصي بنجاح')
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card p-6">
        <h1 className="text-xl font-extrabold text-slate-800 mb-6">الملف الشخصي للمعلم</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* معاينة الصورة ورفعها */}
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
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
              required
            />
          </div>

          {/* البريد (للعرض فقط) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-primary-700"
          >
            <Save className="h-4 w-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </form>
      </div>
    </div>
  )
}
