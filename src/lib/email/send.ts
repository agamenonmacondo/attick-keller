// Email templates for reservation status changes
// Uses Resend API

const RESEND_API_KEY = () => process.env.RESEND_API_KEY!
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
    ctaUrl: 'https://web-rosy-nine-64.vercel.app/perfil',
  },
  confirmed: {
    statusBgColor: '#E8F5E9',
    statusTextColor: '#2E7D32',
    statusTitle: 'Reserva Confirmada',
    statusMessage: 'Tu mesa esta lista! Te esperamos en Attick & Keller.',
    ctaText: 'Ver Detalles',
    ctaUrl: 'https://web-rosy-nine-64.vercel.app/perfil',
  },
  cancelled: {
    statusBgColor: '#FFEBEE',
    statusTextColor: '#C62828',
    statusTitle: 'Reserva Cancelada',
    statusMessage: 'Tu reserva ha sido cancelada. Si crees que es un error, contactanos.',
    ctaText: 'Hacer Nueva Reserva',
    ctaUrl: 'https://web-rosy-nine-64.vercel.app/reservar',
  },
  completed: {
    statusBgColor: '#E3F2FD',
    statusTextColor: '#1565C0',
    statusTitle: 'Gracias por Visitarnos!',
    statusMessage: 'Esperamos que hayas disfrutado tu experiencia. Vuelve pronto!',
    ctaText: 'Reservar de Nuevo',
    ctaUrl: 'https://web-rosy-nine-64.vercel.app/reservar',
  },
}

function buildHtml(data: EmailData, status: string): string {
  const config = statusConfig[status] || statusConfig.pending
  const specialRequestsBlock = data.specialRequests
    ? '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#EFEBE9;border-radius:12px;overflow:hidden;">'
      + '<tr><td style="padding:16px 24px;">'
      + '<p style="color:#8D6E63;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;">Peticiones Especiales</p>'
      + '<p style="color:#3E2723;font-size:15px;margin:0;">' + data.specialRequests + '</p>'
      + '</td></tr></table>'
    : ''
  const ctaBlock = config.ctaUrl
    ? '<div style="text-align:center;margin-top:32px;">'
      + '<a href="' + config.ctaUrl + '" style="display:inline-block;background:#6B2737;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">' + config.ctaText + '</a>'
      + '</div>'
    : ''

  return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n<body style="margin:0;padding:0;background:#F5EDE0;font-family:&apos;DM Sans&apos;,Arial,sans-serif;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n    <tr>\n      <td style="background:#3E2723;padding:32px 40px;text-align:center;">\n        <h1 style="color:#C9A94E;font-family:&apos;Playfair Display&apos;,Georgia,serif;font-size:28px;margin:0;">Attick &amp; Keller</h1>\n        <p style="color:#D7CCC8;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;text-align:center;background:' + config.statusBgColor + ';">\n        <h2 style="color:' + config.statusTextColor + ';font-size:20px;margin:0;">' + config.statusTitle + '</h2>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:32px 40px;">\n        <p style="color:#3E2723;font-size:16px;margin:0 0 24px 0;">Hola ' + data.customerName + ',</p>\n        <p style="color:#3E2723;font-size:15px;margin:0 0 24px 0;">' + config.statusMessage + '</p>\n        <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFEBE9;border-radius:12px;overflow:hidden;">\n          <tr><td style="padding:20px 24px;">\n            <table width="100%" cellpadding="0" cellspacing="0">\n              <tr>\n                <td style="color:#8D6E63;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Fecha</td>\n                <td style="color:#8D6E63;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Hora</td>\n              </tr>\n              <tr>\n                <td style="color:#3E2723;font-size:18px;font-weight:bold;padding-bottom:12px;">' + data.date + '</td>\n                <td style="color:#3E2723;font-size:18px;font-weight:bold;padding-bottom:12px;">' + data.timeStart + ' - ' + data.timeEnd + '</td>\n              </tr>\n              <tr>\n                <td style="color:#8D6E63;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Personas</td>\n                <td style="color:#8D6E63;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Zona</td>\n              </tr>\n              <tr>\n                <td style="color:#3E2723;font-size:18px;font-weight:bold;">' + data.partySize + '</td>\n                <td style="color:#3E2723;font-size:18px;font-weight:bold;">' + data.zoneName + '</td>\n              </tr>\n            </table>\n          </td></tr>\n        </table>\n        ' + specialRequestsBlock + '\n        ' + ctaBlock + '\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;background:#3E2723;text-align:center;">\n        <p style="color:#D7CCC8;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n        <p style="color:#8D6E63;font-size:12px;margin:0 0 4px 0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; &#x1F4F7; @attic_keller</p>\n        <p style="color:#5D4037;font-size:11px;margin:12px 0 0 0;">Este correo fue enviado automaticamente. No respondas a este mensaje.</p>\n      </td>\n    </tr>\n  </table>\n</body></html>'
}

const statusSubjects: Record<string, string> = {
  pending: 'Tu reserva en Attick & Keller fue recibida',
  confirmed: 'Tu reserva en Attick & Keller esta confirmada!',
  cancelled: 'Tu reserva en Attick & Keller fue cancelada',
  completed: 'Gracias por visitar Attick & Keller!',
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

  const html = '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n<body style="margin:0;padding:0;background:#F5EDE0;font-family:&apos;DM Sans&apos;,Arial,sans-serif;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n    <tr>\n      <td style="background:#3E2723;padding:32px 40px;text-align:center;">\n        <h1 style="color:#C9A94E;font-family:&apos;Playfair Display&apos;,Georgia,serif;font-size:28px;margin:0;">Attick &amp; Keller</h1>\n        <p style="color:#D7CCC8;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;text-align:center;background:#E8F5E9;">\n        <h2 style="color:#2E7D32;font-size:20px;margin:0;">Cuenta creada exitosamente</h2>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:32px 40px;">\n        <p style="color:#3E2723;font-size:16px;margin:0 0 16px 0;">Hola ' + name + ',</p>\n        <p style="color:#3E2723;font-size:15px;margin:0 0 24px 0;">Tu cuenta ha sido creada exitosamente. Ya puedes hacer reservas en Attick &amp; Keller.</p>\n        <div style="text-align:center;">\n          <a href="https://web-rosy-nine-64.vercel.app/reservar" style="display:inline-block;background:#6B2737;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Hacer una Reserva</a>\n        </div>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;background:#3E2723;text-align:center;">\n        <p style="color:#D7CCC8;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n        <p style="color:#8D6E63;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>\n      </td>\n    </tr>\n  </table>\n</body></html>'

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

  const html = '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n<body style="margin:0;padding:0;background:#F5EDE0;font-family:&apos;DM Sans&apos;,Arial,sans-serif;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n    <tr>\n      <td style="background:#3E2723;padding:32px 40px;text-align:center;">\n        <h1 style="color:#C9A94E;font-family:&apos;Playfair Display&apos;,Georgia,serif;font-size:28px;margin:0;">Attick &amp; Keller</h1>\n        <p style="color:#D7CCC8;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;text-align:center;background:#FFF8E1;">\n        <h2 style="color:#F57F17;font-size:20px;margin:0;">Recuperar contrasena</h2>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:32px 40px;">\n        <p style="color:#3E2723;font-size:15px;margin:0 0 24px 0;">Recibimos una solicitud para restablecer tu contrasena. Haz clic en el boton para crear una nueva:</p>\n        <div style="text-align:center;">\n          <a href="' + resetUrl + '" style="display:inline-block;background:#6B2737;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Restablecer Contrasena</a>\n        </div>\n        <p style="color:#8D6E63;font-size:13px;margin:24px 0 0 0;text-align:center;">Este enlace expira en 24 horas. Si no solicitaste este cambio, ignora este correo.</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;background:#3E2723;text-align:center;">\n        <p style="color:#D7CCC8;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n        <p style="color:#8D6E63;font-size:12px;margin:0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; @attic_keller</p>\n      </td>\n    </tr>\n  </table>\n</body></html>'

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
      return '<span style="display:inline-block;background:#EFEBE9;color:#6B2737;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin:0 4px;">' + t + '</span>'
    }).join('') +
    '</div>'

  return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n<body style="margin:0;padding:0;background:#F5EDE0;font-family:&apos;DM Sans&apos;,Arial,sans-serif;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">\n    <tr>\n      <td style="background:#3E2723;padding:32px 40px;text-align:center;">\n        <h1 style="color:#C9A94E;font-family:&apos;Playfair Display&apos;,Georgia,serif;font-size:28px;margin:0;">Attick &amp; Keller</h1>\n        <p style="color:#D7CCC8;font-size:14px;margin:8px 0 0 0;">Bogota</p>\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:32px 40px;">\n        <p style="color:#3E2723;font-size:16px;margin:0 0 24px 0;">Hola ' + params.customerName + ',</p>\n        <div style="color:#3E2723;font-size:15px;line-height:1.6;">\n' + params.bodyHtml + '\n        </div>\n' + tagChips + '\n      </td>\n    </tr>\n    <tr>\n      <td style="padding:24px 40px;background:#3E2723;text-align:center;">\n        <p style="color:#D7CCC8;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogota</p>\n        <p style="color:#8D6E63;font-size:12px;margin:0 0 4px 0;">&#x260E; +57 310 577 2708 &nbsp;|&nbsp; &#x1F4F7; @attic_keller</p>\n        <p style="color:#5D4037;font-size:11px;margin:12px 0 0 0;">Este correo es parte de nuestra comunicacion de fidelizacion.</p>\n      </td>\n    </tr>\n  </table>\n</body></html>'
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
