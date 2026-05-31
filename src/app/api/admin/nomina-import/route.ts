import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getAdminUser } from '@/lib/utils/admin-auth'

// ── Nómina Import API ──────────────────────────────────
// Accepts imports via X-Import-Token header (for scripts) or admin session cookie
// Secret token for script access (not the Supabase key)

const IMPORT_TOKEN = 'nomina-import-ak-2026'

function isAuthorized(request: NextRequest): boolean {
  // Check import token header (for scripts)
  const token = request.headers.get('X-Import-Token')
  if (token === IMPORT_TOKEN) return true
  
  // Could also check admin session cookie for browser access
  // but for now, token is enough
  return false
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    // Also try admin auth as fallback
    const admin = await getAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado. Use X-Import-Token header.' }, { status: 403 })
    }
  }

  const body = await request.json()
  const { action, data } = body

  const sb = getServiceClient()

  try {
    switch (action) {
      case 'upsert_staff': {
        const results = []
        for (const emp of data) {
          // Try to find by cedula first
          const { data: existing } = await sb
            .from('pos_nomina_staff')
            .select('id')
            .eq('cedula', emp.cedula)
            .single()

          if (existing) {
            const { error } = await sb
              .from('pos_nomina_staff')
              .update({
                nombre_completo: emp.nombre_completo,
                salario: emp.salario,
                cargo: emp.cargo,
                modalidad: emp.modalidad,
                sede: emp.sede,
                aplica_propinas: emp.aplica_propinas,
                fecha_ingreso: emp.fecha_ingreso || null,
                es_medio_tiempo: emp.es_medio_tiempo,
                auxilio_no_salarial: emp.auxilio_no_salarial || 0,
              })
              .eq('id', existing.id)
            if (error) {
              console.error(`Error updating staff ${emp.cedula}:`, error)
              results.push({ cedula: emp.cedula, status: 'error', error: error.message })
            } else {
              results.push({ cedula: emp.cedula, id: existing.id, status: 'updated' })
            }
          } else {
            const { data: inserted, error } = await sb
              .from('pos_nomina_staff')
              .insert({
                cedula: emp.cedula,
                nombre_completo: emp.nombre_completo,
                salario: emp.salario,
                cargo: emp.cargo,
                modalidad: emp.modalidad,
                sede: emp.sede,
                aplica_propinas: emp.aplica_propinas,
                fecha_ingreso: emp.fecha_ingreso || null,
                es_medio_tiempo: emp.es_medio_tiempo,
                auxilio_no_salarial: emp.auxilio_no_salarial || 0,
              })
              .select('id, cedula')
              .single()
            if (error) {
              console.error(`Error inserting staff ${emp.cedula}:`, error)
              results.push({ cedula: emp.cedula, status: 'error', error: error.message })
            } else {
              results.push({ cedula: emp.cedula, id: inserted.id, status: 'inserted' })
            }
          }
        }
        return NextResponse.json({ action: 'upsert_staff', results })
      }

      case 'insert_detalle': {
        const { data: inserted, error } = await sb
          .from('nomina_detalle')
          .insert(data)
          .select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ action: 'insert_detalle', count: inserted?.length || 0 })
      }

      case 'insert_he_recargos': {
        const { data: inserted, error } = await sb
          .from('nomina_he_recargos')
          .insert(data)
          .select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ action: 'insert_he_recargos', count: inserted?.length || 0 })
      }

      case 'insert_novedades': {
        const { data: inserted, error } = await sb
          .from('nomina_novedades')
          .insert(data)
          .select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ action: 'insert_novedades', count: inserted?.length || 0 })
      }

      case 'insert_provisiones': {
        const { data: inserted, error } = await sb
          .from('nomina_provisiones')
          .insert(data)
          .select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ action: 'insert_provisiones', count: inserted?.length || 0 })
      }

      case 'insert_propinas': {
        const { data: inserted, error } = await sb
          .from('nomina_propinas')
          .insert(data)
          .select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ action: 'insert_propinas', count: inserted?.length || 0 })
      }

      case 'update_periodo': {
        const { id, ...updates } = data
        const { error } = await sb
          .from('nomina_periodos')
          .update(updates)
          .eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ action: 'update_periodo', id, status: 'ok' })
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  } catch (err) {
    console.error('Nomina import error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// GET: verify tables exist and list data
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    const admin = await getAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado. Use X-Import-Token header.' }, { status: 403 })
    }
  }

  const sb = getServiceClient()

  const tables = [
    'pos_nomina_staff',
    'nomina_periodos',
    'nomina_detalle',
    'nomina_he_recargos',
    'nomina_novedades',
    'nomina_provisiones',
    'nomina_propinas',
  ]
  const status: Record<string, any> = {}

  for (const table of tables) {
    const { data, error, count } = await sb
      .from(table)
      .select('*', { count: 'exact', head: true })
    if (error) {
      status[table] = { exists: false, error: error.message }
    } else {
      status[table] = { exists: true, count }
    }
  }

  // Get staff list for matching
  const { data: staff } = await sb
    .from('pos_nomina_staff')
    .select('id, cedula, nombre_completo')
    .order('nombre_completo')
  status.staff_list = staff || []

  // Get periodos
  const { data: periodos } = await sb
    .from('nomina_periodos')
    .select('*')
    .order('fecha_inicio')
  status.periodos = periodos || []

  return NextResponse.json(status)
}