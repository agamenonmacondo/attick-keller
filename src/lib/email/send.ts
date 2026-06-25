import { getWeekStr, getWeekDates, dayIndexToDateIndex } from '@/lib/utils/costCalculator'

// Email templates for reservation status changes
// Uses Resend API

const RESEND_API_KEY = () => process.env.RESEND_API_KEY!
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://web-rosy-nine-64.vercel.app'
const FROM = 'Attick & Keller <ventas@ccs724.com>'

interface EmailData {
  to: string
  customerName: string
  date: string
  timeStart: string
  timeEnd: string
  partySize: number
  zoneName: string
  specialRequests?: string | null
}

const statusConfig: Record<string, {
  statusBgColor: string
  statusTextColor: string
  statusTitle: string
  statusMessage: string
  ctaText?: string
  ctaUrl?: string
}> = {
  pending: {
    statusBgColor: '#FFF8E1',
    statusTextColor: '#F57F17',
    statusTitle: 'Reserva Recibida',
    statusMessage: 'Tu reserva ha sido registrada exitosamente. Te confirmaremos pronto.',
    ctaText: 'Ver Mi Reserva',
    ctaUrl: `${BASE_URL}/perfil`,
  },
  confirmed: {
    statusBgColor: '#E8F5E9',
    statusTextColor: '#2E7D32',
    statusTitle: 'Reserva Confirmada',
    statusMessage: 'Tu mesa esta lista! Te esperamos en Attick & Keller.',
    ctaText: 'Ver Detalles',
    ctaUrl: `${BASE_URL}/perfil`,
  },
  cancelled: {
    statusBgColor: '#FFEBEE',
    statusTextColor: '#C62828',
    statusTitle: 'Reserva Cancelada',
    statusMessage: 'Tu reserva ha sido cancelada. Si crees que es un error, contactanos.',
    ctaText: 'Hacer Nueva Reserva',
    ctaUrl: `${BASE_URL}/reservar`,
  },
  completed: {
    statusBgColor: '#E3F2FD',
    statusTextColor: '#1565C0',
    statusTitle: 'Gracias por Visitarnos!',
    statusMessage: 'Esperamos que hayas disfrutado tu experiencia. Vuelve pronto!',
    ctaText: 'Reservar de Nuevo',
    ctaUrl: `${BASE_URL}/reservar`,
  },
  seated: {
    statusBgColor: '#E8F5E9',
    statusTextColor: '#2E7D32',
    statusTitle: 'Tu Mesa Esta Lista',
    statusMessage: 'Te hemos asignado una mesa. Bienvenido a Attick & Keller!',
    ctaText: 'Ver Mi Reserva',
    ctaUrl: `${BASE_URL}/perfil`,
  },
  no_show: {
    statusBgColor: '#FFF3E0',
    statusTextColor: '#E65100',
    statusTitle: 'Reserva No Atendida',
    statusMessage: 'Lamentamos que no hayas podido asistir. Te esperamos en tu proxima visita!',
    ctaText: 'Hacer Nueva Reserva',
    ctaUrl: `${BASE_URL}/reservar`,
  },
}

function buildHtml(data: EmailData, status: string): string {
  const config = statusConfig[status] || statusConfig.pending
  const specialRequestsBlock = data.specialRequests
    ? '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#F2EBE1;border-radius:12px;overflow:hidden;">'
      + '<tr><td style="padding:16px 24px;">'
      + '<p style="color:#9BA8B7;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;">Peticiones Especiales</p>'
      + '<p style="color:#0D1015;font-size:15px;margin:0;">' + data.specialRequests + '</p>'
      + '</td></tr></table>'
    : ''
  const ctaBlock = config.ctaUrl
    ? '<div style="text-align:center;margin-top:32px;">'
      + '<a href="' + config.ctaUrl + '" style="display:inline-block;background:#8C4434;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">' + config.ctaText + '</a>'
      + '</div>'
    : ''

  return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n<body style="margin:0;padding:0;background:#F4ECE4;font-family:&apos;Inter&apos;,Arial,sans-serif;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n    <tr>\n      <td style="background:#0D1015;padding:32px 40px;text-align:center;">\n        <h1 style="color:#FCCC04;font-family:&apos;Playfair Display&apos;,Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>\n        <p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;text-align:center;background:' + config.statusBgColor + ';">\n        <h2 style="color:' + config.statusTextColor + ';font-size:20px;margin:0;">' + config.statusTitle + '</h2>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:32px 40px;">\n        <p style="color:#0D1015;font-size:16px;margin:0 0 24px 0;">Hola ' + data.customerName + ',</p>\n        <p style="color:#0D1015;font-size:15px;margin:0 0 24px 0;">' + config.statusMessage + '</p>\n        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;border-radius:12px;overflow:hidden;">\n          <tr><td style="padding:20px 24px;">\n            <table width="100%" cellpadding="0" cellspacing="0">\n              <tr>\n                <td style="color:#9BA8B7;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Fecha</td>\n                <td style="color:#9BA8B7;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Hora</td>\n              </tr>\n              <tr>\n                <td style="color:#0D1015;font-size:18px;font-weight:bold;padding-bottom:12px;">' + data.date + '</td>\n                <td style="color:#0D1015;font-size:18px;font-weight:bold;padding-bottom:12px;">' + data.timeStart + ' - ' + data.timeEnd + '</td>\n              </tr>\n              <tr>\n                <td style="color:#9BA8B7;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Personas</td>\n                <td style="color:#9BA8B7;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Zona</td>\n              </tr>\n              <tr>\n                <td style="color:#0D1015;font-size:18px;font-weight:bold;">' + data.partySize + '</td>\n                <td style="color:#0D1015;font-size:18px;font-weight:bold;">' + data.zoneName + '</td>\n              </tr>\n            </table>\n          </td></tr>\n        </table>\n        ' + specialRequestsBlock + '\n        ' + ctaBlock + '\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;background:#0D1015;text-align:center;">\n        <p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n        <p style="color:#9BA8B7;font-size:12px;margin:0 0 4px 0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; &#x1F4F7; @attic_keller</p>\n        <p style="color:#3C4C5C;font-size:11px;margin:12px 0 0 0;">Este correo fue enviado automaticamente. No respondas a este mensaje.</p>\n      </td>\n    </tr>\n  </table>\n</body></html>'
}

const statusSubjects: Record<string, string> = {
  pending: 'Tu reserva en Attick & Keller fue recibida',
  confirmed: 'Tu reserva en Attick & Keller esta confirmada!',
  cancelled: 'Tu reserva en Attick & Keller fue cancelada',
  completed: 'Gracias por visitar Attick & Keller!',
  seated: 'Tu mesa esta lista - Attick & Keller',
  no_show: 'Tu reserva fue marcada como no atendida - Attick & Keller',
}

export async function sendReservationEmail(data: EmailData, status: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = RESEND_API_KEY()
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set, skipping email')
    return { success: false, error: 'No API key' }
  }

  const html = buildHtml(data, status)
  const subject = statusSubjects[status] || 'Actualizacion de tu reserva - Attick & Keller'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: data.to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return { success: false, error: err }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// --- Auth emails ---

const AUTH_FROM = 'Attick & Keller <ventas@ccs724.com>'

export async function sendWelcomeEmail(to: string, name: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = RESEND_API_KEY()
  if (!apiKey) return { success: false, error: 'No API key' }

  const html = '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n<body style="margin:0;padding:0;background:#F4ECE4;font-family:&apos;Inter&apos;,Arial,sans-serif;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n    <tr>\n      <td style="background:#0D1015;padding:32px 40px;text-align:center;">\n        <h1 style="color:#FCCC04;font-family:&apos;Playfair Display&apos;,Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>\n        <p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;text-align:center;background:#E8F5E9;">\n        <h2 style="color:#2E7D32;font-size:20px;margin:0;">Cuenta creada exitosamente</h2>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:32px 40px;">\n        <p style="color:#0D1015;font-size:16px;margin:0 0 16px 0;">Hola ' + name + ',</p>\n        <p style="color:#0D1015;font-size:15px;margin:0 0 24px 0;">Tu cuenta ha sido creada exitosamente. Ya puedes hacer reservas en Attick &amp; Keller.</p>\n        <div style="text-align:center;">\n          <a href="' + BASE_URL + '/reservar" style="display:inline-block;background:#8C4434;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Hacer una Reserva</a>\n        </div>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;background:#0D1015;text-align:center;">\n        <p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n        <p style="color:#9BA8B7;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>\n      </td>\n    </tr>\n  </table>\n</body></html>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: AUTH_FROM, to, subject: 'Bienvenido a Attick & Keller', html }),
    })
    return res.ok ? { success: true } : { success: false, error: await res.text() }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = RESEND_API_KEY()
  if (!apiKey) return { success: false, error: 'No API key' }

  const html = '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n<body style="margin:0;padding:0;background:#F4ECE4;font-family:&apos;Inter&apos;,Arial,sans-serif;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n    <tr>\n      <td style="background:#0D1015;padding:32px 40px;text-align:center;">\n        <h1 style="color:#FCCC04;font-family:&apos;Playfair Display&apos;,Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>\n        <p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;text-align:center;background:#FFF8E1;">\n        <h2 style="color:#F57F17;font-size:20px;margin:0;">Recuperar contrasena</h2>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:32px 40px;">\n        <p style="color:#0D1015;font-size:15px;margin:0 0 24px 0;">Recibimos una solicitud para restablecer tu contrasena. Haz clic en el boton para crear una nueva:</p>\n        <div style="text-align:center;">\n          <a href="' + resetUrl + '" style="display:inline-block;background:#8C4434;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Restablecer Contrasena</a>\n        </div>\n        <p style="color:#9BA8B7;font-size:13px;margin:24px 0 0 0;text-align:center;">Este enlace expira en 24 horas. Si no solicitaste este cambio, ignora este correo.</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;background:#0D1015;text-align:center;">\n        <p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n        <p style="color:#9BA8B7;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>\n      </td>\n    </tr>\n  </table>\n</body></html>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: AUTH_FROM, to, subject: 'Restablece tu contrasena - Attick & Keller', html }),
    })
    return res.ok ? { success: true } : { success: false, error: await res.text() }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function sendFirstLoginEmail(to: string, name: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = RESEND_API_KEY()
  if (!apiKey) return { success: false, error: 'No API key' }

  const html = '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n<body style="margin:0;padding:0;background:#F4ECE4;font-family:&apos;Inter&apos;,Arial,sans-serif;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n    <tr>\n      <td style="background:#0D1015;padding:32px 40px;text-align:center;">\n        <h1 style="color:#FCCC04;font-family:&apos;Playfair Display&apos;,Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>\n        <p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;text-align:center;background:#E8F5E9;">\n        <h2 style="color:#2E7D32;font-size:20px;margin:0;">Bienvenido de vuelta</h2>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:32px 40px;">\n        <p style="color:#0D1015;font-size:16px;margin:0 0 16px 0;">Hola ' + name + ',</p>\n        <p style="color:#0D1015;font-size:15px;margin:0 0 24px 0;">Que alegría tenerte de vuelta en Attick &amp; Keller. Tu cuenta esta lista y puedes hacer reservas cuando quieras.</p>\n        <div style="text-align:center;">\n          <a href="' + BASE_URL + '/reservar" style="display:inline-block;background:#8C4434;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Hacer una Reserva</a>\n        </div>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;background:#0D1015;text-align:center;">\n        <p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n        <p style="color:#9BA8B7;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>\n      </td>\n    </tr>\n  </table>\n</body></html>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: AUTH_FROM, to, subject: 'Bienvenido de vuelta a Attick & Keller', html }),
    })
    return res.ok ? { success: true } : { success: false, error: await res.text() }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ================================================================
// Campaign Emails (nuevo - sistema de etiquetas + campanas)
// ================================================================

const CAMPAIGN_FROM = 'Attick & Keller <ventas@ccs724.com>'

interface CampaignEmailData {
  to: string
  customerName: string
  subject: string
  bodyHtml: string
  loyaltyTier: string
  tagNames: string[]
}

function buildCampaignHtml(params: CampaignEmailData): string {
  const tagChips = params.tagNames.length === 0 ? '' :
    '<div style="margin-top:16px;text-align:center;">' +
    params.tagNames.map(function(t) {
      return '<span style="display:inline-block;background:#F2EBE1;color:#8C4434;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin:0 4px;">' + t + '</span>'
    }).join('') +
    '</div>'

  return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n<body style="margin:0;padding:0;background:#F4ECE4;font-family:&apos;Inter&apos;,Arial,sans-serif;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n    <tr>\n      <td style="background:#0D1015;padding:32px 40px;text-align:center;">\n        <h1 style="color:#FCCC04;font-family:&apos;Playfair Display&apos;,Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>\n        <p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:32px 40px;">\n        <p style="color:#0D1015;font-size:16px;margin:0 0 24px 0;">Hola ' + params.customerName + ',</p>\n        <div style="color:#0D1015;font-size:15px;line-height:1.6;">\n' + params.bodyHtml + '\n        </div>\n' + tagChips + '\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;background:#0D1015;text-align:center;">\n        <p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n        <p style="color:#9BA8B7;font-size:12px;margin:0 0 4px 0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; &#x1F4F7; @attic_keller</p>\n        <p style="color:#3C4C5C;font-size:11px;margin:12px 0 0 0;">Este correo es parte de nuestra comunicacion de fidelizacion.</p>\n      </td>\n    </tr>\n  </table>\n</body></html>'
}

export async function sendCampaignEmail(params: CampaignEmailData): Promise<{ success: boolean; error?: string }> {
  const apiKey = RESEND_API_KEY()
  if (!apiKey) return { success: false, error: 'No API key' }

  const html = buildCampaignHtml(params)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CAMPAIGN_FROM,
        to: params.to,
        subject: params.subject,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: err }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ================================================================
// Campaign Batch Emails (escalable - usa Resend Batch API)
// ================================================================

interface CampaignBatchRecipient {
  to: string
  customerName: string
  loyaltyTier: string
  tagNames: string[]
}

interface CampaignBatchResult {
  succeeded: number
  failed: number
  errors: string[]
}

const BATCH_SIZE = 100 // Resend batch limit

export async function sendCampaignEmailBatch(
  recipients: CampaignBatchRecipient[],
  subject: string,
  bodyHtml: string
): Promise<CampaignBatchResult> {
  const apiKey = RESEND_API_KEY()
  if (!apiKey) {
    return { succeeded: 0, failed: recipients.length, errors: ['No API key'] }
  }

  const results: CampaignBatchResult = { succeeded: 0, failed: 0, errors: [] }

  // Split into chunks of BATCH_SIZE
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE)
    const batchPayload = chunk.map(r => {
      const html = buildCampaignHtml({
        to: r.to,
        customerName: r.customerName,
        subject,
        bodyHtml,
        loyaltyTier: r.loyaltyTier,
        tagNames: r.tagNames,
      })
      return {
        from: CAMPAIGN_FROM,
        to: [r.to],
        subject,
        html,
      }
    })

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchPayload),
      })

      if (!res.ok) {
        const err = await res.text()
        results.failed += chunk.length
        results.errors.push(`Batch ${i / BATCH_SIZE + 1}: ${err}`)
        continue
      }

      // Resend batch returns an array of { id: string } objects, one per email
      const data = await res.json()
      if (Array.isArray(data?.data)) {
        results.succeeded += data.data.length
      } else {
        // Fallback: assume all succeeded if response is OK but shape is unexpected
        results.succeeded += chunk.length
      }
    } catch (err: any) {
      results.failed += chunk.length
      results.errors.push(`Batch ${i / BATCH_SIZE + 1}: ${err.message}`)
    }
  }

  return results
}

const SHIFTS_FROM = 'Attick & Keller <ventas@ccs724.com>'

const AREA_LABELS: Record<string, string> = {
  cocina: 'Cocina',
  barra: 'Barra',
  servicio: 'Servicio',
}

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

interface ShiftScheduleAssignmentData {
  dayIndex: number
  shiftCode: string
  shiftName: string
  entrada: string
  salida: string
  hours: number
}

interface ShiftScheduleData {
  weekStr: string
  area: string
  areaLabel: string
  assignments: {
    dayName: string
    date: string
    shiftCode: string
    shiftName: string
    entrada: string
    salida: string
    hours: number
  }[]
}

function buildShiftScheduleHtml(data: ShiftScheduleData, employeeName: string): string {
  const rows = data.assignments.map(a =>
    '<tr>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #F2EBE1;color:#0D1015;font-size:14px;font-weight:600;">' + a.dayName + ' ' + a.date + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #F2EBE1;color:#0D1015;font-size:14px;">' + a.shiftCode + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #F2EBE1;color:#0D1015;font-size:14px;">' + a.shiftName + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #F2EBE1;color:#0D1015;font-size:14px;">' + a.entrada + ' - ' + a.salida + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #F2EBE1;color:#9BA8B7;font-size:14px;text-align:right;">' + a.hours + 'h</td>' +
    '</tr>'
  ).join('')

  const accentColor: Record<string, string> = { cocina: '#8C4434', barra: '#D4A843', servicio: '#22c55e' }
  const color = accentColor[data.area] || '#8C4434'

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#F4ECE4;font-family:\'Inter\',Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">' +
    '<tr><td style="background:#0D1015;padding:32px 40px;text-align:center;">' +
    '<h1 style="color:#FCCC04;font-family:\'Playfair Display\',Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>' +
    '<p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;text-align:center;background:#E8F5E9;">' +
    '<h2 style="color:#2E7D32;font-size:20px;margin:0;">Tu cronograma esta listo</h2>' +
    '</td></tr>' +
    '<tr><td style="padding:32px 40px;">' +
    '<p style="color:#0D1015;font-size:16px;margin:0 0 8px 0;">Hola ' + employeeName + ',</p>' +
    '<p style="color:#0D1015;font-size:15px;margin:0 0 20px 0;">Se ha publicado el cronograma de <strong style="color:' + color + ';">' + data.areaLabel + '</strong> para la semana <strong>' + data.weekStr + '</strong>.</p>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;border-radius:12px;overflow:hidden;">' +
    '<tr style="background:#0D1015;">' +
    '<td style="padding:10px 16px;color:#FCCC04;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Dia</td>' +
    '<td style="padding:10px 16px;color:#FCCC04;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Codigo</td>' +
    '<td style="padding:10px 16px;color:#FCCC04;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Turno</td>' +
    '<td style="padding:10px 16px;color:#FCCC04;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Horario</td>' +
    '<td style="padding:10px 16px;color:#FCCC04;font-size:11px;text-transform:uppercase;letter-spacing:1px;text-align:right;">Horas</td>' +
    '</tr>' + rows +
    '</table>' +
    '<div style="text-align:center;margin-top:24px;">' +
    '<a href="' + BASE_URL + '/admin" style="display:inline-block;background:#8C4434;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Ver Mi Turno</a>' +
    '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;background:#0D1015;text-align:center;">' +
    '<p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>' +
    '<p style="color:#9BA8B7;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>' +
    '</td></tr>' +
    '</table></body></html>'
}

interface ShiftReminderData {
  employeeName: string
  shiftCode: string
  shiftName: string
  entrada: string
  salida: string
  hours: number
  dayName: string
  date: string
  area: string
  areaLabel: string
}

function buildShiftReminderHtml(data: ShiftReminderData): string {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#F4ECE4;font-family:\'Inter\',Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">' +
    '<tr><td style="background:#0D1015;padding:32px 40px;text-align:center;">' +
    '<h1 style="color:#FCCC04;font-family:\'Playfair Display\',Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>' +
    '<p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;text-align:center;background:#FFF8E1;">' +
    '<h2 style="color:#F57F17;font-size:20px;margin:0;">Tu turno empieza pronto</h2>' +
    '</td></tr>' +
    '<tr><td style="padding:32px 40px;">' +
    '<p style="color:#0D1015;font-size:16px;margin:0 0 20px 0;">Hola ' + data.employeeName + ',</p>' +
    '<p style="color:#0D1015;font-size:15px;margin:0 0 24px 0;">Tu turno de <strong>' + data.areaLabel + '</strong> esta programado para hoy:</p>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;border-radius:12px;overflow:hidden;">' +
    '<tr><td style="padding:16px 24px;">' +
    '<p style="color:#0D1015;font-size:20px;font-weight:bold;margin:0 0 8px 0;">' + data.shiftCode + ' — ' + data.shiftName + '</p>' +
    '<p style="color:#9BA8B7;font-size:15px;margin:0 0 4px 0;">' + data.dayName + ' ' + data.date + ' · ' + data.areaLabel + '</p>' +
    '<p style="color:#0D1015;font-size:16px;margin:0;">' + data.entrada + ' — ' + data.salida + ' <span style="color:#9BA8B7;font-size:14px;">(' + data.hours + 'h)</span></p>' +
    '</td></tr>' +
    '</table>' +
    '<div style="text-align:center;margin-top:24px;">' +
    '<a href="' + BASE_URL + '/admin" style="display:inline-block;background:#8C4434;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Registrar Entrada</a>' +
    '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;background:#0D1015;text-align:center;">' +
    '<p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>' +
    '<p style="color:#9BA8B7;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>' +
    '</td></tr>' +
    '</table></body></html>'
}

interface ShiftCheckoutData {
  employeeName: string
  shiftCode: string
  shiftName: string
  salida: string
  dayName: string
  date: string
  area: string
  areaLabel: string
}

function buildShiftCheckoutHtml(data: ShiftCheckoutData): string {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#F4ECE4;font-family:\'Inter\',Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">' +
    '<tr><td style="background:#0D1015;padding:32px 40px;text-align:center;">' +
    '<h1 style="color:#FCCC04;font-family:\'Playfair Display\',Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>' +
    '<p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;text-align:center;background:#FFF3E0;">' +
    '<h2 style="color:#E65100;font-size:20px;margin:0;">No olvides registrar tu salida</h2>' +
    '</td></tr>' +
    '<tr><td style="padding:32px 40px;">' +
    '<p style="color:#0D1015;font-size:16px;margin:0 0 20px 0;">Hola ' + data.employeeName + ',</p>' +
    '<p style="color:#0D1015;font-size:15px;margin:0 0 24px 0;">Tu turno de <strong>' + data.areaLabel + '</strong> debio terminar a las <strong>' + data.salida + '</strong>. Registra tu salida:</p>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;border-radius:12px;overflow:hidden;">' +
    '<tr><td style="padding:16px 24px;">' +
    '<p style="color:#0D1015;font-size:20px;font-weight:bold;margin:0 0 8px 0;">' + data.shiftCode + ' — ' + data.shiftName + '</p>' +
    '<p style="color:#9BA8B7;font-size:15px;margin:0 0 4px 0;">' + data.dayName + ' ' + data.date + ' · ' + data.areaLabel + '</p>' +
    '<p style="color:#0D1015;font-size:16px;margin:0;">Hora de salida programada: <strong>' + data.salida + '</strong></p>' +
    '</td></tr>' +
    '</table>' +
    '<div style="text-align:center;margin-top:24px;">' +
    '<a href="' + BASE_URL + '/admin" style="display:inline-block;background:#8C4434;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Registrar Salida</a>' +
    '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;background:#0D1015;text-align:center;">' +
    '<p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>' +
    '<p style="color:#9BA8B7;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>' +
    '</td></tr>' +
    '</table></body></html>'
}

// ================================================================
// Cambio de cronograma — HTML builder (re-publicacion)
// ================================================================

function buildShiftChangeHtml(data: ShiftScheduleData, employeeName: string): string {
  const rows = data.assignments.map(a =>
    '<tr>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #F2EBE1;color:#0D1015;font-size:14px;font-weight:600;">' + a.dayName + ' ' + a.date + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #F2EBE1;color:#0D1015;font-size:14px;">' + a.shiftCode + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #F2EBE1;color:#0D1015;font-size:14px;">' + a.shiftName + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #F2EBE1;color:#0D1015;font-size:14px;">' + a.entrada + ' - ' + a.salida + '</td>' +
      '<td style="padding:10px 16px;border-bottom:1px solid #F2EBE1;color:#9BA8B7;font-size:14px;text-align:right;">' + a.hours + 'h</td>' +
    '</tr>'
  ).join('')

  const accentColor: Record<string, string> = { cocina: '#8C4434', barra: '#D4A843', servicio: '#22c55e' }
  const color = accentColor[data.area] || '#8C4434'

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#F4ECE4;font-family:\'Inter\',Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">' +
    '<tr><td style="background:#0D1015;padding:32px 40px;text-align:center;">' +
    '<h1 style="color:#FCCC04;font-family:\'Playfair Display\',Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>' +
    '<p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;text-align:center;background:#FFF8E1;">' +
    '<h2 style="color:#F57F17;font-size:20px;margin:0;">Actualizacion de tu cronograma</h2>' +
    '</td></tr>' +
    '<tr><td style="padding:32px 40px;">' +
    '<p style="color:#0D1015;font-size:16px;margin:0 0 8px 0;">Hola ' + employeeName + ',</p>' +
    '<p style="color:#0D1015;font-size:15px;margin:0 0 20px 0;">Se ha actualizado el cronograma de <strong style="color:' + color + ';">' + data.areaLabel + '</strong> para la semana <strong>' + data.weekStr + '</strong>.</p>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;border-radius:12px;overflow:hidden;">' +
    '<tr style="background:#0D1015;">' +
    '<td style="padding:10px 16px;color:#FCCC04;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Dia</td>' +
    '<td style="padding:10px 16px;color:#FCCC04;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Codigo</td>' +
    '<td style="padding:10px 16px;color:#FCCC04;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Turno</td>' +
    '<td style="padding:10px 16px;color:#FCCC04;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Horario</td>' +
    '<td style="padding:10px 16px;color:#FCCC04;font-size:11px;text-transform:uppercase;letter-spacing:1px;text-align:right;">Horas</td>' +
    '</tr>' + rows +
    '</table>' +
    '<div style="text-align:center;margin-top:24px;">' +
    '<a href="' + BASE_URL + '/admin" style="display:inline-block;background:#8C4434;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Ver Mi Turno</a>' +
    '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;background:#0D1015;text-align:center;">' +
    '<p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>' +
    '<p style="color:#9BA8B7;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>' +
    '</td></tr>' +
    '</table></body></html>'
}

// Helper: enviar correo individual con Resend
async function sendResendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set, skipping email')
    return { success: false, error: 'No API key' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SHIFTS_FROM,
        to,
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[email] Resend error:', err)
      return { success: false, error: err }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ================================================================
// Correo 1: Cronograma publicado — enviar a cada colaborador
// ================================================================

interface ScheduleEmailRecipient {
  email: string
  name: string
  employeeId: string
  assignments: ShiftScheduleAssignmentData[]
}

export async function sendShiftScheduleEmail(
  weekStr: string,
  area: string,
  scheduleId: string,
  recipients: ScheduleEmailRecipient[],
  sb: any // Supabase service client
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }

  for (const r of recipients) {
    // Deduplicar
    const { data: existing } = await sb
      .from('email_log')
      .select('id')
      .eq('type', 'schedule_published')
      .eq('recipient_email', r.email)
      .eq('schedule_id', scheduleId)
      .is('assignment_id', null)
      .maybeSingle()

    if (existing) {
      console.log(`[email] Skipping schedule_published for ${r.email} (already sent)`)
      continue
    }

    // Calcular fechas de la semana
    const weekDates = getWeekDates(weekStr)
    const assignments = r.assignments
      .sort((a, b) => a.dayIndex - b.dayIndex)
      .map(a => {
        const dateIdx = dayIndexToDateIndex(a.dayIndex)
        const date = weekDates[dateIdx]
        return {
          dayName: DAY_NAMES_SHORT[a.dayIndex],
          date: date ? date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '',
          shiftCode: a.shiftCode,
          shiftName: a.shiftName,
          entrada: a.entrada,
          salida: a.salida,
          hours: a.hours,
        }
      })

    const html = buildShiftScheduleHtml({
      weekStr,
      area,
      areaLabel: AREA_LABELS[area] || area,
      assignments,
    }, r.name)

    const subject = `Tu cronograma de ${AREA_LABELS[area] || area} — Semana ${weekStr}`
    const result = await sendResendEmail(r.email, subject, html)

    // Log
    await sb.from('email_log').insert({
      type: 'schedule_published',
      recipient_email: r.email,
      recipient_name: r.name,
      schedule_id: scheduleId,
      assignment_id: null,
      status: result.success ? 'sent' : 'failed',
      error: result.error || null,
    }).then(({ error }: any) => { if (error) console.error('[email] Error logging email_log:', error) })

    if (result.success) results.sent++
    else { results.failed++; results.errors.push(`${r.email}: ${result.error}`) }
  }

  return results
}

// ================================================================
// Correo 1b: Cronograma actualizado (re-publicacion) — notificar a afectados
// ================================================================

export async function sendShiftChangeEmail(
  weekStr: string,
  area: string,
  scheduleId: string,
  recipients: ScheduleEmailRecipient[],
  sb: any // Supabase service client
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }

  for (const r of recipients) {
    // Deduplicar con tipo 'schedule_updated'
    const { data: existing } = await sb
      .from('email_log')
      .select('id')
      .eq('type', 'schedule_updated')
      .eq('recipient_email', r.email)
      .eq('schedule_id', scheduleId)
      .is('assignment_id', null)
      .maybeSingle()

    if (existing) {
      console.log(`[email] Skipping schedule_updated for ${r.email} (already sent)`)
      continue
    }

    // Calcular fechas de la semana
    const weekDates = getWeekDates(weekStr)
    const assignments = r.assignments
      .sort((a, b) => a.dayIndex - b.dayIndex)
      .map(a => {
        const dateIdx = dayIndexToDateIndex(a.dayIndex)
        const date = weekDates[dateIdx]
        return {
          dayName: DAY_NAMES_SHORT[a.dayIndex],
          date: date ? date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '',
          shiftCode: a.shiftCode,
          shiftName: a.shiftName,
          entrada: a.entrada,
          salida: a.salida,
          hours: a.hours,
        }
      })

    const html = buildShiftChangeHtml({
      weekStr,
      area,
      areaLabel: AREA_LABELS[area] || area,
      assignments,
    }, r.name)

    const subject = `Tu horario cambio — ${AREA_LABELS[area] || area}, Semana ${weekStr}`
    const result = await sendResendEmail(r.email, subject, html)

    // Log
    await sb.from('email_log').insert({
      type: 'schedule_updated',
      recipient_email: r.email,
      recipient_name: r.name,
      schedule_id: scheduleId,
      assignment_id: null,
      status: result.success ? 'sent' : 'failed',
      error: result.error || null,
    }).then(({ error }: any) => { if (error) console.error('[email] Error logging email_log:', error) })

    if (result.success) results.sent++
    else { results.failed++; results.errors.push(`${r.email}: ${result.error}`) }
  }

  return results
}

// ================================================================
// Correo 2: Recordatorio de turno (2h antes)
// ================================================================

export async function sendShiftReminderEmails(
  sb: any
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }

  // Hora actual en Colombia (UTC-5)
  const now = new Date()
  const colombiaNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const colombiaMs = colombiaNow.getTime()
  // Ventana de 30 min (15 min antes, 15 min después del momento exacto del recordatorio)
  const windowStart = colombiaMs - 15 * 60 * 1000
  const windowEnd = colombiaMs + 15 * 60 * 1000

  const dayIndex = colombiaNow.getDay() // 0=Dom, 1=Lun, etc.
  const weekStr = getWeekStr(colombiaNow)

  // Buscar schedules publicados para esta semana
  const { data: schedules } = await sb
    .from('shift_schedules')
    .select('id, area')
    .eq('week_str', weekStr)
    .eq('status', 'published')

  if (!schedules || schedules.length === 0) return results

  for (const schedule of schedules) {
    const { data: shiftTypes } = await sb
      .from('shift_types')
      .select('code, name, entrada, salida, ordinarias, nocturnas')
      .eq('area', schedule.area)

    const shiftTypeMap: Map<string, any> = new Map((shiftTypes || []).map((st: any) => [st.code, st]))

    const { data: assignments } = await sb
      .from('shift_assignments')
      .select('id, employee_id, shift_code, day_index')
      .eq('schedule_id', schedule.id)
      .eq('day_index', dayIndex)

    if (!assignments || assignments.length === 0) continue

    for (const assignment of assignments) {
      const st = shiftTypeMap.get(assignment.shift_code)
      if (!st) continue

      // Hora de entrada del turno en Colombia
      const [entryHour, entryMin] = st.entrada.split(':').map(Number)
      const turnoStartMs = new Date(colombiaNow.getFullYear(), colombiaNow.getMonth(), colombiaNow.getDate(), entryHour, entryMin, 0, 0).getTime()

      // Momento del recordatorio = 2h antes de la entrada
      const reminderMs = turnoStartMs - 2 * 60 * 60 * 1000

      // Verificar si estamos en la ventana
      if (reminderMs < windowStart || reminderMs > windowEnd) continue

      // Obtener datos del empleado
      const { data: employee } = await sb
        .from('pos_nomina_staff')
        .select('id, nombre_completo, correo, area')
        .eq('id', assignment.employee_id)
        .single()

      if (!employee) continue
      let email = employee.correo
      if (!email) {
        const { data: userRole } = await sb
          .from('user_roles')
          .select('auth_user_id')
          .eq('pos_nomina_staff_id', assignment.employee_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        if (userRole) {
          const { data: { users } } = await sb.auth.admin.listUsers()
          const authUser = users.find((u: any) => u.id === userRole.auth_user_id)
          email = authUser?.email || ''
        }
      }
      if (!email) continue

      // Nombre (preferir alias)
      const { data: aliasData } = await sb
        .from('staff_aliases')
        .select('alias')
        .eq('employee_id', assignment.employee_id)
        .limit(1)
      const employeeName = aliasData?.[0]?.alias || employee.nombre_completo.split(' ')[0]

      // Deduplicar
      const { data: existing } = await sb
        .from('email_log')
        .select('id')
        .eq('type', 'shift_reminder')
        .eq('recipient_email', email)
        .eq('assignment_id', assignment.id)
        .maybeSingle()

      if (existing) continue

      const dateStr = colombiaNow.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
      const hours = (st.ordinarias || 0) + (st.nocturnas || 0)

      const html = buildShiftReminderHtml({
        employeeName,
        shiftCode: st.code,
        shiftName: st.name,
        entrada: st.entrada,
        salida: st.salida,
        hours,
        dayName: DAY_NAMES_SHORT[dayIndex],
        date: dateStr,
        area: schedule.area,
        areaLabel: AREA_LABELS[schedule.area] || schedule.area,
      })

      const subject = `Recordatorio: Tu turno de ${AREA_LABELS[schedule.area] || schedule.area} empieza a las ${st.entrada}`
      const result = await sendResendEmail(email, subject, html)

      await sb.from('email_log').insert({
        type: 'shift_reminder',
        recipient_email: email,
        recipient_name: employeeName,
        schedule_id: schedule.id,
        assignment_id: assignment.id,
        status: result.success ? 'sent' : 'failed',
        error: result.error || null,
      }).then(({ error }: any) => { if (error) console.error('[email] Error logging email_log:', error) })

      if (result.success) results.sent++
      else { results.failed++; results.errors.push(`${email}: ${result.error}`) }
    }
  }

  return results
}

// ================================================================
// Correo 3: Recordatorio de checkout (30min después de la hora de salida)
// ================================================================

export async function sendShiftCheckoutReminders(
  sb: any
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }

  const now = new Date()
  const colombiaNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const colombiaMs = colombiaNow.getTime()
  const windowStart = colombiaMs - 15 * 60 * 1000
  const windowEnd = colombiaMs + 15 * 60 * 1000

  const dayIndex = colombiaNow.getDay()
  const weekStr = getWeekStr(colombiaNow)

  const { data: schedules } = await sb
    .from('shift_schedules')
    .select('id, area')
    .eq('week_str', weekStr)
    .eq('status', 'published')

  if (!schedules || schedules.length === 0) return results

  for (const schedule of schedules) {
    const { data: shiftTypes } = await sb
      .from('shift_types')
      .select('code, name, entrada, salida, ordinarias, nocturnas')
      .eq('area', schedule.area)

    const shiftTypeMap: Map<string, any> = new Map((shiftTypes || []).map((st: any) => [st.code, st]))

    // Asignaciones de hoy SIN checkout
    const { data: assignments } = await sb
      .from('shift_assignments')
      .select('id, employee_id, shift_code, day_index, checkin_at, checkout_at')
      .eq('schedule_id', schedule.id)
      .eq('day_index', dayIndex)
      .is('checkout_at', null)

    if (!assignments || assignments.length === 0) continue

    for (const assignment of assignments) {
      const st = shiftTypeMap.get(assignment.shift_code)
      if (!st) continue

      // Hora de salida del turno + 30 min
      const [exitHour, exitMin] = st.salida.split(':').map(Number)
      const turnoEndMs = new Date(colombiaNow.getFullYear(), colombiaNow.getMonth(), colombiaNow.getDate(), exitHour, exitMin, 0, 0).getTime()
      const reminderMs = turnoEndMs + 30 * 60 * 1000 // 30min después de salida

      // Verificar ventana
      if (reminderMs < windowStart || reminderMs > windowEnd) continue

      // Obtener datos del empleado
      const { data: employee } = await sb
        .from('pos_nomina_staff')
        .select('id, nombre_completo, correo, area')
        .eq('id', assignment.employee_id)
        .single()

      if (!employee) continue
      let email = employee.correo
      if (!email) {
        const { data: userRole } = await sb
          .from('user_roles')
          .select('auth_user_id')
          .eq('pos_nomina_staff_id', assignment.employee_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        if (userRole) {
          const { data: { users } } = await sb.auth.admin.listUsers()
          const authUser = users.find((u: any) => u.id === userRole.auth_user_id)
          email = authUser?.email || ''
        }
      }
      if (!email) continue

      const { data: aliasData } = await sb
        .from('staff_aliases')
        .select('alias')
        .eq('employee_id', assignment.employee_id)
        .limit(1)
      const employeeName = aliasData?.[0]?.alias || employee.nombre_completo.split(' ')[0]

      // Deduplicar
      const { data: existing } = await sb
        .from('email_log')
        .select('id')
        .eq('type', 'shift_checkout_reminder')
        .eq('recipient_email', email)
        .eq('assignment_id', assignment.id)
        .maybeSingle()

      if (existing) continue

      const dateStr = colombiaNow.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

      const html = buildShiftCheckoutHtml({
        employeeName,
        shiftCode: st.code,
        shiftName: st.name,
        salida: st.salida,
        dayName: DAY_NAMES_SHORT[dayIndex],
        date: dateStr,
        area: schedule.area,
        areaLabel: AREA_LABELS[schedule.area] || schedule.area,
      })

      const subject = `No olvides registrar tu salida — ${AREA_LABELS[schedule.area] || schedule.area}`
      const result = await sendResendEmail(email, subject, html)

      await sb.from('email_log').insert({
        type: 'shift_checkout_reminder',
        recipient_email: email,
        recipient_name: employeeName,
        schedule_id: schedule.id,
        assignment_id: assignment.id,
        status: result.success ? 'sent' : 'failed',
        error: result.error || null,
      }).then(({ error }: any) => { if (error) console.error('[email] Error logging email_log:', error) })

      if (result.success) results.sent++
      else { results.failed++; results.errors.push(`${email}: ${result.error}`) }
    }
  }

  return results
}

// ================================================================
// Correo 4: Confirmacion de check-in
// ================================================================

export async function sendShiftCheckinEmail(
  scheduleId: string,
  shiftCode: string,
  dayIndex: number,
  employeeId: string,
  sb: any
): Promise<{ sent: number; failed: number }> {
  const { data: schedule } = await sb
    .from('shift_schedules')
    .select('id, area, week_str')
    .eq('id', scheduleId)
    .single()
  if (!schedule) return { sent: 0, failed: 0 }

  const { data: shiftType } = await sb
    .from('shift_types')
    .select('code, name, entrada, salida, ordinarias, nocturnas')
    .eq('area', schedule.area)
    .eq('code', shiftCode)
    .single()
  if (!shiftType) return { sent: 0, failed: 0 }

  const { data: employee } = await sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, correo, area')
    .eq('id', employeeId)
    .single()
  if (!employee) return { sent: 0, failed: 0 }

  let email = employee.correo
  if (!email) {
    const { data: userRole } = await sb
      .from('user_roles')
      .select('auth_user_id')
      .eq('pos_nomina_staff_id', employeeId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (userRole) {
      const { data: { users } } = await sb.auth.admin.listUsers()
      const authUser = users.find((u: any) => u.id === userRole.auth_user_id)
      email = authUser?.email || ''
    }
  }
  if (!email) return { sent: 0, failed: 0 }

  const { data: aliasData } = await sb
    .from('staff_aliases')
    .select('alias')
    .eq('employee_id', employeeId)
    .limit(1)
  const employeeName = aliasData?.[0]?.alias || employee.nombre_completo.split(' ')[0]
  const areaLabel = AREA_LABELS[schedule.area] || schedule.area
  const hours = (shiftType.ordinarias || 0) + (shiftType.nocturnas || 0)

  const now = new Date()
  const colombiaNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const dateStr = colombiaNow.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = colombiaNow.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#F4ECE4;font-family:\'Inter\',Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">' +
    '<tr><td style="background:#0D1015;padding:32px 40px;text-align:center;">' +
    '<h1 style="color:#FCCC04;font-family:\'Playfair Display\',Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>' +
    '<p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;text-align:center;background:#E8F5E9;">' +
    '<h2 style="color:#2E7D32;font-size:20px;margin:0;">Entrada registrada</h2>' +
    '</td></tr>' +
    '<tr><td style="padding:32px 40px;">' +
    '<p style="color:#0D1015;font-size:16px;margin:0 0 8px 0;">Hola ' + employeeName + ',</p>' +
    '<p style="color:#0D1015;font-size:15px;margin:0 0 24px 0;">Tu entrada ha sido registrada correctamente.</p>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;border-radius:12px;overflow:hidden;">' +
    '<tr><td style="padding:16px 24px;">' +
    '<p style="color:#0D1015;font-size:20px;font-weight:bold;margin:0 0 8px 0;">' + shiftType.code + ' \u2014 ' + shiftType.name + '</p>' +
    '<p style="color:#9BA8B7;font-size:15px;margin:0 0 4px 0;">' + dateStr + ' \u00b7 ' + areaLabel + '</p>' +
    '<p style="color:#0D1015;font-size:16px;margin:0;">Entrada: <strong>' + shiftType.entrada + '</strong> \u2014 Salida: <strong>' + shiftType.salida + '</strong> <span style="color:#9BA8B7;font-size:14px;">(' + hours + 'h)</span></p>' +
    '<p style="color:#2E7D32;font-size:14px;margin:8px 0 0 0;font-weight:600;">Check-in registrado a las ' + timeStr + '</p>' +
    '</td></tr>' +
    '</table>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;background:#0D1015;text-align:center;">' +
    '<p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>' +
    '<p style="color:#9BA8B7;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>' +
    '</td></tr>' +
    '</table></body></html>'

  const subject = `Entrada registrada \u2014 ${areaLabel} ${shiftType.code} ${dateStr}`
  const result = await sendResendEmail(email, subject, html)

  await sb.from('email_log').insert({
    type: 'shift_checkin',
    recipient_email: email,
    recipient_name: employeeName,
    schedule_id: scheduleId,
    assignment_id: null,
    status: result.success ? 'sent' : 'failed',
    error: result.error || null,
  }).then(({ error }: any) => { if (error) console.error('[email] Error logging email_log:', error) })

  return { sent: result.success ? 1 : 0, failed: result.success ? 0 : 1 }
}

// ================================================================
// Correo 5: Confirmacion de checkout
// ================================================================

export async function sendShiftCheckoutEmail(
  scheduleId: string,
  shiftCode: string,
  dayIndex: number,
  employeeId: string,
  sb: any
): Promise<{ sent: number; failed: number }> {
  const { data: schedule } = await sb
    .from('shift_schedules')
    .select('id, area, week_str')
    .eq('id', scheduleId)
    .single()
  if (!schedule) return { sent: 0, failed: 0 }

  const { data: shiftType } = await sb
    .from('shift_types')
    .select('code, name, entrada, salida, ordinarias, nocturnas')
    .eq('area', schedule.area)
    .eq('code', shiftCode)
    .single()
  if (!shiftType) return { sent: 0, failed: 0 }

  const { data: employee } = await sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, correo, area')
    .eq('id', employeeId)
    .single()
  if (!employee) return { sent: 0, failed: 0 }

  let email = employee.correo
  if (!email) {
    const { data: userRole } = await sb
      .from('user_roles')
      .select('auth_user_id')
      .eq('pos_nomina_staff_id', employeeId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (userRole) {
      const { data: { users } } = await sb.auth.admin.listUsers()
      const authUser = users.find((u: any) => u.id === userRole.auth_user_id)
      email = authUser?.email || ''
    }
  }
  if (!email) return { sent: 0, failed: 0 }

  const { data: aliasData } = await sb
    .from('staff_aliases')
    .select('alias')
    .eq('employee_id', employeeId)
    .limit(1)
  const employeeName = aliasData?.[0]?.alias || employee.nombre_completo.split(' ')[0]
  const areaLabel = AREA_LABELS[schedule.area] || schedule.area
  const hours = (shiftType.ordinarias || 0) + (shiftType.nocturnas || 0)

  const now = new Date()
  const colombiaNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const dateStr = colombiaNow.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = colombiaNow.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#F4ECE4;font-family:\'Inter\',Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">' +
    '<tr><td style="background:#0D1015;padding:32px 40px;text-align:center;">' +
    '<h1 style="color:#FCCC04;font-family:\'Playfair Display\',Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>' +
    '<p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;text-align:center;background:#E3F2FD;">' +
    '<h2 style="color:#1565C0;font-size:20px;margin:0;">Salida registrada</h2>' +
    '</td></tr>' +
    '<tr><td style="padding:32px 40px;">' +
    '<p style="color:#0D1015;font-size:16px;margin:0 0 8px 0;">Hola ' + employeeName + ',</p>' +
    '<p style="color:#0D1015;font-size:15px;margin:0 0 24px 0;">Tu salida ha sido registrada correctamente.</p>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;border-radius:12px;overflow:hidden;">' +
    '<tr><td style="padding:16px 24px;">' +
    '<p style="color:#0D1015;font-size:20px;font-weight:bold;margin:0 0 8px 0;">' + shiftType.code + ' \u2014 ' + shiftType.name + '</p>' +
    '<p style="color:#9BA8B7;font-size:15px;margin:0 0 4px 0;">' + dateStr + ' \u00b7 ' + areaLabel + '</p>' +
    '<p style="color:#0D1015;font-size:16px;margin:0;">Entrada: <strong>' + shiftType.entrada + '</strong> \u2014 Salida: <strong>' + shiftType.salida + '</strong> <span style="color:#9BA8B7;font-size:14px;">(' + hours + 'h)</span></p>' +
    '<p style="color:#1565C0;font-size:14px;margin:8px 0 0 0;font-weight:600;">Salida registrada a las ' + timeStr + '</p>' +
    '</td></tr>' +
    '</table>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 40px;background:#0D1015;text-align:center;">' +
    '<p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>' +
    '<p style="color:#9BA8B7;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>' +
    '</td></tr>' +
    '</table></body></html>'

  const subject = `Salida registrada \u2014 ${areaLabel} ${shiftType.code} ${dateStr}`
  const result = await sendResendEmail(email, subject, html)

  await sb.from('email_log').insert({
    type: 'shift_checkout',
    recipient_email: email,
    recipient_name: employeeName,
    schedule_id: scheduleId,
    assignment_id: null,
    status: result.success ? 'sent' : 'failed',
    error: result.error || null,
  }).then(({ error }: any) => { if (error) console.error('[email] Error logging email_log:', error) })

  return { sent: result.success ? 1 : 0, failed: result.success ? 0 : 1 }
}

// ================================================================
// Correo 6: Novedad reportada (falta, tardanza, permiso, incapacidad)
// Se envia al lider de area + admins
// ================================================================

const NOVEDAD_LABELS: Record<string, string> = {
  falta: 'Falta',
  tarde: 'Llegada tarde',
  permiso: 'Permiso',
  incapacidad: 'Incapacidad',
}

export async function sendShiftNovedadEmail(
  employeeId: string,
  novedadType: string,
  date: string,
  description: string | null,
  scheduleId: string | null,
  sb: any
): Promise<{ sent: number; failed: number }> {
  const { data: employee } = await sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, correo, area')
    .eq('id', employeeId)
    .single()
  if (!employee) return { sent: 0, failed: 0 }

  // Buscar lideres de area + admins
  const { data: leaders } = await sb
    .from('user_roles')
    .select('auth_user_id, pos_nomina_staff_id, role')
    .in('role', ['lider_area', 'super_admin', 'store_admin'])
    .eq('is_active', true)
    .limit(10)

  if (!leaders || leaders.length === 0) return { sent: 0, failed: 0 }

  const { data: { users } } = await sb.auth.admin.listUsers()
  const results = { sent: 0, failed: 0 }

  const novedadLabel = NOVEDAD_LABELS[novedadType] || novedadType
  const employeeName = employee.nombre_completo
  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  for (const leader of leaders) {
    const authUser = users.find((u: any) => u.id === leader.auth_user_id)
    const email = authUser?.email
    if (!email) continue

    const recipientName = authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'Administrador'

    const descHtml = description ? '<p style="color:#0D1015;font-size:14px;margin:8px 0 0 0;font-style:italic;">"' + description + '"</p>' : ''

    const html =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
      '<body style="margin:0;padding:0;background:#F4ECE4;font-family:\'Inter\',Arial,sans-serif;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">' +
      '<tr><td style="background:#0D1015;padding:32px 40px;text-align:center;">' +
      '<h1 style="color:#FCCC04;font-family:\'Playfair Display\',Georgia,serif;font-size:28px;margin:0;">ATTIC &amp; KELLER</h1>' +
      '<p style="color:#2D3748;font-size:14px;margin:8px 0 0 0;">Bogota</p>' +
      '</td></tr>' +
      '<tr><td style="padding:24px 40px;text-align:center;background:#FFF3E0;">' +
      '<h2 style="color:#E65100;font-size:20px;margin:0;">Novedad reportada</h2>' +
      '</td></tr>' +
      '<tr><td style="padding:32px 40px;">' +
      '<p style="color:#0D1015;font-size:16px;margin:0 0 8px 0;">Hola ' + recipientName + ',</p>' +
      '<p style="color:#0D1015;font-size:15px;margin:0 0 24px 0;">Se ha reportado una novedad:</p>' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;border-radius:12px;overflow:hidden;">' +
      '<tr><td style="padding:16px 24px;">' +
      '<p style="color:#0D1015;font-size:18px;font-weight:bold;margin:0 0 8px 0;">' + employeeName + '</p>' +
      '<p style="color:#E65100;font-size:15px;font-weight:600;margin:0 0 4px 0;">' + novedadLabel + '</p>' +
      '<p style="color:#9BA8B7;font-size:15px;margin:0 0 4px 0;">' + dateFormatted + '</p>' +
      descHtml +
      '</td></tr>' +
      '</table>' +
      '<div style="text-align:center;margin-top:24px;">' +
      '<a href="' + BASE_URL + '/admin/turnos" style="display:inline-block;background:#8C4434;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Ver Cronograma</a>' +
      '</div>' +
      '</td></tr>' +
      '<tr><td style="padding:24px 40px;background:#0D1015;text-align:center;">' +
      '<p style="color:#2D3748;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>' +
      '<p style="color:#9BA8B7;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>' +
      '</td></tr>' +
      '</table></body></html>'

    const subject = `Novedad: ${employeeName} \u2014 ${novedadLabel} ${dateFormatted}`
    const result = await sendResendEmail(email, subject, html)

    await sb.from('email_log').insert({
      type: 'shift_novedad',
      recipient_email: email,
      recipient_name: recipientName,
      schedule_id: scheduleId,
      assignment_id: null,
      status: result.success ? 'sent' : 'failed',
      error: result.error || null,
    }).then(({ error }: any) => { if (error) console.error('[email] Error logging email_log:', error) })

    if (result.success) results.sent++
    else results.failed++
  }

  return results
}
