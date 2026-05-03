import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// GET /api/admin/inventory/tables — list all tables with zone info
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const zoneId = searchParams.get('zone_id')

  const sb = getServiceClient()
  let query = sb
    .from('tables')
    .select('*, zone:zone_id(name, description, sort_order)')
    .eq('restaurant_id', RESTAURANT_ID)

  if (zoneId) {
    query = query.eq('zone_id', zoneId)
  }

  query = query.order('sort_order', { ascending: true })

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort by zone name then sort_order
  const sorted = (data || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const zoneA = (a.zone as Record<string, unknown> | null)?.name as string || ''
    const zoneB = (b.zone as Record<string, unknown> | null)?.name as string || ''
    if (zoneA < zoneB) return -1
    if (zoneA > zoneB) return 1
    return (a.sort_order as number || 0) - (b.sort_order as number || 0)
  })

  return NextResponse.json({ tables: sorted })
}

// PATCH /api/admin/inventory/tables — batch update tables
export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const body = await request.json()
    const { updates } = body

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Se requiere un arreglo de actualizaciones' }, { status: 400 })
    }

    const sb = getServiceClient()
    const results: Array<Record<string, unknown>> = []

    for (const item of updates) {
      const { id, ...fields } = item
      if (!id) {
        return NextResponse.json({ error: 'Cada actualización debe incluir un ID' }, { status: 400 })
      }

      const updateFields: Record<string, unknown> = {}
      const allowedFields = ['number', 'capacity', 'capacity_min', 'name_attick', 'is_active', 'can_combine', 'combine_group', 'zone_id', 'sort_order']
      for (const field of allowedFields) {
        if (fields[field] !== undefined) {
          updateFields[field] = fields[field]
        }
      }

      if (Object.keys(updateFields).length === 0) continue

      const { data, error } = await sb
        .from('tables')
        .update(updateFields)
        .eq('id', id)
        .eq('restaurant_id', RESTAURANT_ID)
        .select('*, zone:zone_id(name)')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (data) results.push(data as Record<string, unknown>)
    }

    return NextResponse.json({ tables: results })
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
}
