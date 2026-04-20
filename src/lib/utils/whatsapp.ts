export function whatsappLink(phone: string, message?: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    digits = '57' + digits
  } else if (digits.startsWith('0')) {
    digits = '57' + digits.slice(1)
  }
  const base = `https://wa.me/${digits}`
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`
  }
  return base
}

export function emailLink(email: string, subject?: string): string {
  if (subject) {
    return `mailto:${email}?subject=${encodeURIComponent(subject)}`
  }
  return `mailto:${email}`
}