export const fmtWaNumber = (phone) => {
  if (!phone) return ''
  let digits = String(phone).replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = '20' + digits.slice(1)
  return digits
}

export const waLink = (phone, message) =>
  phone ? `https://wa.me/${fmtWaNumber(phone)}?text=${encodeURIComponent(message)}` : ''

export const absentMsg = ({ studentName, dateLabel, groupName, teacherName }) =>
  `السلام عليكم، نود إحاطتكم بتغيب الطالب/ة ${studentName} عن حصة اليوم ${dateLabel} في مجموعة ${groupName}. تحياتنا، أستاذ ${teacherName}.`

export const paymentReminderMsg = ({ studentName, amount, teacherName }) =>
  `السلام عليكم، نذكركم بوجوب سداد مصاريف الشهر للطالب/ة ${studentName} بقيمة ${amount}. تحياتنا، أستاذ ${teacherName}.`
