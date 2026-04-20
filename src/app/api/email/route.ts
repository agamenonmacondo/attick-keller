import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, type, data } = body

    if (!to || !type) {
      return NextResponse.json({ error: 'Missing to or type' }, { status: 400 })
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const FROM_EMAIL = 'Attick & Keller <ventas@ccs724.com>'

    const templates: Record<string, { subject: string; html: string }> = {
      pending: {
        subject: '⏳ Reserva pendiente — Attick & Keller',
        html: buildEmail('pending', data),
      },
      confirmed: {
        subject: '✅ Reserva confirmada — Attick & Keller',
        html: buildEmail('confirmed', data),
      },
      reminder: {
        subject: '🔔 Recordatorio: tu reserva es mañana — Attick & Keller',
        html: buildEmail('reminder', data),
      },
      cancelled: {
        subject: '❌ Reserva cancelada — Attick & Keller',
        html: buildEmail('cancelled', data),
      },
    }

    const template = templates[type]
    if (!template) {
      return NextResponse.json({ error: `Unknown template: ${type}` }, { status: 400 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: template.subject,
        html: template.html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
    }

    const result = await res.json()
    return NextResponse.json({ success: true, id: result.id })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function buildEmail(type: string, data: Record<string, any>): string {
  const { name, date, time, party_size, zone, special_requests } = data
  const dateFormatted = date ? new Date(date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) : ''

  // HTML-escape user-provided values to prevent XSS in email
  const esc = (s: string | undefined | null) => {
    if (!s) return ''
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
  const safeName = esc(name)
  const safeZone = esc(zone)
  const safeRequests = esc(special_requests)
  const safeTime = esc(time)
  const safePartySize = esc(String(party_size))
  
  const colors = {
    bg: '#F5EDE0',
    card: '#FFFFFF',
    primary: '#6B2737',
    text: '#3E2723',
    accent: '#D4922A',
    muted: '#3E272399',
    green: '#5C7A4D',
  }

  const statusInfo: Record<string, { title: string; message: string; color: string }> = {
    pending: {
      title: 'Reserva Pendiente',
      message: 'Hemos recibido tu solicitud de reserva. Te confirmaremos pronto por WhatsApp.',
      color: colors.accent,
    },
    confirmed: {
      title: 'Reserva Confirmada',
      message: '¡Tu reserva está confirmada! Te esperamos en Attick & Keller.',
      color: colors.green,
    },
    reminder: {
      title: 'Recordatorio de Reserva',
      message: 'Te recordamos que tienes una reserva mañana. ¡Te esperamos!',
      color: colors.primary,
    },
    cancelled: {
      title: 'Reserva Cancelada',
      message: 'Tu reserva ha sido cancelada. Si crees que es un error, contáctanos.',
      color: '#B91C1C',
    },
  }

  const info = statusInfo[type] || statusInfo.pending

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${colors.bg};font-family:'DM Sans',system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:40px auto">
    <tr><td style="text-align:center;padding:20px 0">
      <h1 style="font-family:'Playfair Display',serif;color:${colors.text};font-size:24px;margin:0">Attick & Keller</h1>
      <p style="color:${colors.muted};font-size:14px;margin:4px 0 0">Wine and Beer Playground</p>
    </td></tr>
    <tr><td style="background:${colors.card};border-radius:16px;padding:32px;border:2px solid ${colors.text}0D">
      <h2 style="font-family:'Playfair Display',serif;color:${info.color};font-size:20px;margin:0 0 8px">${info.title}</h2>
      <p style="color:${colors.muted};font-size:14px;margin:0 0 24px;line-height:1.6">${info.message}</p>
      ${safeName ? `<p style="color:${colors.text};font-size:16px;font-weight:600;margin:0 0 16px">Hola, ${safeName}</p>` : ''}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bg};border-radius:12px;overflow:hidden">
        <tr><td style="padding:16px;border-bottom:1px solid ${colors.text}0A">
          <span style="color:${colors.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Fecha</span><br>
          <span style="color:${colors.text};font-size:15px;font-weight:600">${dateFormatted}</span>
        </td></tr>
        <tr><td style="padding:16px;border-bottom:1px solid ${colors.text}0A">
          <span style="color:${colors.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Hora</span><br>
          <span style="color:${colors.text};font-size:15px;font-weight:600">${safeTime || '—'}</span>
        </td></tr>
        <tr><td style="padding:16px;border-bottom:1px solid ${colors.text}0A">
          <span style="color:${colors.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Personas</span><br>
          <span style="color:${colors.text};font-size:15px;font-weight:600">${safePartySize || '—'}</span>
        </td></tr>
        ${safeZone ? `<tr><td style="padding:16px;border-bottom:1px solid ${colors.text}0A">
          <span style="color:${colors.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Zona</span><br>
          <span style="color:${colors.text};font-size:15px;font-weight:600">${safeZone}</span>
        </td></tr>` : ''}
        ${safeRequests ? `<tr><td style="padding:16px">
          <span style="color:${colors.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Solicitudes especiales</span><br>
          <span style="color:${colors.text};font-size:15px;font-style:italic">${safeRequests}</span>
        </td></tr>` : ''}
      </table>
    </td></tr>
    <tr><td style="text-align:center;padding:24px 0">
      <p style="color:${colors.muted};font-size:12px;margin:0">Carrera 13 #75-51, Bogotá</p>
      <p style="color:${colors.muted};font-size:12px;margin:4px 0 0">WhatsApp: +57 310 577 2708</p>
    </td></tr>
  </table>
</body>
</html>`
}