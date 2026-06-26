import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminUser } from '@/lib/utils/admin-auth'
import { handleApiError } from '@/lib/utils/api-security'

// Service-role client for Rodrigo's (Seadotec) database
function getRodriServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_RODRI_SUPABASE_URL!,
    process.env.RODRI_SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getRodriServiceClient()
  const action = request.nextUrl.searchParams.get('action') || 'all'

  try {
    if (action === 'all') {
      const [empRes, teamRes, turnoRes, schedRes, paramRes, pmRes, ventaRes] = await Promise.all([
        sb.from('employees').select('*').order('nombre'),
        sb.from('teams').select('*').order('nombre'),
        sb.from('turnos_config').select('*').order('code'),
        sb.from('schedules').select('*').order('week_str').order('day_index'),
        sb.from('params').select('*').order('key'),
        sb.from('product_mix').select('*').order('fecha'),
        sb.from('ventas').select('*').order('fecha'),
      ])

      return NextResponse.json({
        employees: empRes.data || [],
        teams: teamRes.data || [],
        turnosConfig: turnoRes.data || [],
        schedules: schedRes.data || [],
        params: paramRes.data || [],
        productMix: pmRes.data || [],
        ventas: ventaRes.data || [],
      })
    }

    // Individual table queries
    const table = action
    const allowed = ['employees', 'teams', 'turnos_config', 'schedules', 'params', 'product_mix', 'ventas']
    if (!allowed.includes(table)) {
      return NextResponse.json({ error: 'Tabla no permitida' }, { status: 400 })
    }

    const { data, error } = await sb.from(table).select('*').order('nombre')
    if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err, 'rodri')
  }
}