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
    statusTitle: '⏳ Reserva Recibida',
    statusMessage: 'Tu reserva ha sido registrada exitosamente. Te confirmaremos pronto.',
    ctaText: 'Ver Mi Reserva',
    ctaUrl: 'https://web-rosy-nine-64.vercel.app/perfil',
  },
  confirmed: {
    statusBgColor: '#E8F5E9',
    statusTextColor: '#2E7D32',
    statusTitle: '✅ Reserva Confirmada',
    statusMessage: '¡Tu mesa está lista! Te esperamos en Attick & Keller.',
    ctaText: 'Ver Detalles',
    ctaUrl: 'https://web-rosy-nine-64.vercel.app/perfil',
  },
  cancelled: {
    statusBgColor: '#FFEBEE',
    statusTextColor: '#C62828',
    statusTitle: '❌ Reserva Cancelada',
    statusMessage: 'Tu reserva ha sido cancelada. Si crees que es un error, contáctanos.',
    ctaText: 'Hacer Nueva Reserva',
    ctaUrl: 'https://web-rosy-nine-64.vercel.app/reservar',
  },
  completed: {
    statusBgColor: '#E3F2FD',
    statusTextColor: '#1565C0',
    statusTitle: '🎉 ¡Gracias por Visitarnos!',
    statusMessage: 'Esperamos que hayas disfrutado tu experiencia. ¡Vuelve pronto!',
    ctaText: 'Reservar de Nuevo',
    ctaUrl: 'https://web-rosy-nine-64.vercel.app/reservar',
  },
}

function buildHtml(data: EmailData, status: string): string {
  const config = statusConfig[status] || statusConfig.pending
  const specialRequestsBlock = data.specialRequests
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#EFEBE9;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:16px 24px;">
          <p style="color:#8D6E63;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;">Peticiones Especiales</p>
          <p style="color:#3E2723;font-size:15px;margin:0;">${data.specialRequests}</p>
        </td></tr>
      </table>`
    : ''
  const ctaBlock = config.ctaUrl
    ? `<div style="text-align:center;margin-top:32px;">
        <a href="${config.ctaUrl}" style="display:inline-block;background:#6B2737;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">${config.ctaText}</a>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EDE0;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;">
    <tr>
      <td style="background:#3E2723;padding:32px 40px;text-align:center;">
        <h1 style="color:#C9A94E;font-family:'Playfair Display',Georgia,serif;font-size:28px;margin:0;">Attick &amp; Keller</h1>
        <p style="color:#D7CCC8;font-size:14px;margin:8px 0 0 0;">Bogotá</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 40px;text-align:center;background:${config.statusBgColor};">
        <h2 style="color:${config.statusTextColor};font-size:20px;margin:0;">${config.statusTitle}</h2>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px;">
        <p style="color:#3E2723;font-size:16px;margin:0 0 24px 0;">Hola ${data.customerName},</p>
        <p style="color:#3E2723;font-size:15px;margin:0 0 24px 0;">${config.statusMessage}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFEBE9;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#8D6E63;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Fecha</td>
                <td style="color:#8D6E63;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Hora</td>
              </tr>
              <tr>
                <td style="color:#3E2723;font-size:18px;font-weight:bold;padding-bottom:12px;">${data.date}</td>
                <td style="color:#3E2723;font-size:18px;font-weight:bold;padding-bottom:12px;">${data.timeStart} - ${data.timeEnd}</td>
              </tr>
              <tr>
                <td style="color:#8D6E63;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Personas</td>
                <td style="color:#8D6E63;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Zona</td>
              </tr>
              <tr>
                <td style="color:#3E2723;font-size:18px;font-weight:bold;">${data.partySize}</td>
                <td style="color:#3E2723;font-size:18px;font-weight:bold;">${data.zoneName}</td>
              </tr>
            </table>
          </td></tr>
        </table>
        ${specialRequestsBlock}
        ${ctaBlock}
      </td>
    </tr>
    <tr>
      <td style="padding:24px 40px;background:#3E2723;text-align:center;">
        <p style="color:#D7CCC8;font-size:13px;margin:0 0 8px 0;">Carrera 13 #75-51, Bogotá</p>
        <p style="color:#8D6E63;font-size:12px;margin:0 0 4px 0;">📞 +57 310 577 2708 &nbsp;|&nbsp; 📸 @attic_keller</p>
        <p style="color:#5D4037;font-size:11px;margin:12px 0 0 0;">Este correo fue enviado automáticamente. No respondas a este mensaje.</p>
      </td>
    </tr>
  </table>
</body></html>`
}

const statusSubjects: Record<string, string> = {
  pending: '⏳ Tu reserva en Attick & Keller fue recibida',
  confirmed: '✅ ¡Tu reserva en Attick & Keller está confirmada!',
  cancelled: '❌ Tu reserva en Attick & Keller fue cancelada',
  completed: '🎉 ¡Gracias por visitar Attick & Keller!',
}

export async function sendReservationEmail(data: EmailData, status: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = RESEND_API_KEY()
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set, skipping email')
    return { success: false, error: 'No API key' }
  }

  const html = buildHtml(data, status)
  const subject = statusSubjects[status] || 'Actualización de tu reserva — Attick & Keller'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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