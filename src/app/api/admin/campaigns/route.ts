import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  try {
    const body = await request.json()
    const { segment, channel, template } = body as {
      segment: 'dormant' | 'occasional' | 'vip_inactive' | 'all'
      channel: 'whatsapp' | 'email'
      template?: string
    }

    if (!segment || !channel) {
      return NextResponse.json({ error: 'segment y channel son requeridos' }, { status: 400 })
    }

    // Calculate audience size based on segment
    let audience = 0
    let segmentDescription = ''

    switch (segment) {
      case 'dormant': {
        // Customers with 1 visit
        const { count } = await sb
          .from('customer_stats')
          .select('id', { count: 'exact', head: true })
          .lte('total_visits', 1)
        audience = count || 0

        // Subtract those without the channel
        if (channel === 'whatsapp') {
          const { count: withPhone } = await sb
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', RESTAURANT_ID)
            .not('phone', 'is', null)
            .neq('phone', '')
          // Approximate: only those with phone
          audience = Math.min(audience, withPhone || 0)
        }

        segmentDescription = 'clientes dormant (1 sola visita)'
        break
      }
      case 'occasional': {
        // Customers with 2-5 visits
        const { count } = await sb
          .from('customer_stats')
          .select('id', { count: 'exact', head: true })
          .gte('total_visits', 2)
          .lte('total_visits', 5)
        audience = count || 0
        segmentDescription = 'clients ocasionals (2-5 visitas)'
        break
      }
      case 'vip_inactive': {
        // VIP customers who haven't visited in 30+ days
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)
        const cutoffStr = cutoff.toISOString().split('T')[0]
        const { count } = await sb
          .from('customer_stats')
          .select('id', { count: 'exact', head: true })
          .eq('loyalty_tier', 'vip')
          .lt('last_visit_date', cutoffStr)
        audience = count || 0
        segmentDescription = 'clients VIP inactius (30+ días sin visita)'
        break
      }
      case 'all': {
        const { count } = await sb
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', RESTAURANT_ID)
        audience = count || 0
        segmentDescription = 'todos los clientes'
        break
      }
    }

    // Default templates
    const defaultTemplates = {
      dormant: 'Hola {name}, hace tiempo no te vemos en Attick & Keller 💚 Tu última visita fue el {last_visit}. Te esperamos de vuelta con un 10% de descuento. Reserva: https://attick-keller.com/reservar',
      occasional: 'Hola {name}, gracias por visitarnos {visits} veces 💚 Cada visita suma. Ven por la {visits_plus_1} y te regalamos un postre. Reserva: https://attick-keller.com/reservar',
      vip_inactive: 'Hola {name}, te extrañamos en Attick & Keller 💚 Como cliente VIP, tu mesa preferida te espera. ¿Te animas a volver esta semana? Reserva: https://attick-keller.com/reservar',
      all: 'Hola {name}, te esperamos en Attick & Keller 💚 Reserva tu mesa: https://attick-keller.com/reservar',
    }

    const message = template || defaultTemplates[segment]

    return NextResponse.json({
      segment,
      channel,
      audience,
      message,
      note: 'Copia este mensaje y envíalo por WhatsApp Business. Variables: {name}, {last_visit}, {visits}, {visits_plus_1}. Para envío automático, integra WhatsApp Business API en v2.',
      status: 'template_ready' as const,
    })
  } catch (err) {
    console.error('[campaigns] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}