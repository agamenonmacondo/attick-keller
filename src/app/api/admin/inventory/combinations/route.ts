import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// GET /api/admin/inventory/combinations — list all combinations
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('table_combinations')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ combinations: data || [] })
}

// POST /api/admin/inventory/combinations — create a new combination
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const body = await request.json()
    const { table_ids, name } = body

    if (!Array.isArray(table_ids) || table_ids.length < 2) {
      return NextResponse.json({ error: 'Se requieren al menos 2 mesas para crear una combinación' }, { status: 400 })
    }

    const sb = getServiceClient()

    // Validate all tables exist and belong to this restaurant
    const { data: tables, error: tablesError } = await sb
      .from('tables')
      .select('id, capacity')
      .eq('restaurant_id', RESTAURANT_ID)
      .in('id', table_ids)

    if (tablesError) return NextResponse.json({ error: tablesError.message }, { status: 500 })

    if (!tables || tables.length !== table_ids.length) {
      const foundIds = new Set((tables || []).map((t: Record<string, unknown>) => t.id))
      const missing = table_ids.filter((tid: string) => !foundIds.has(tid))
      return NextResponse.json(
        { error: `Mesas no encontradas: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const combinedCapacity = (tables as Array<{ capacity: number }>).reduce(
      (sum: number, t: { capacity: number }) => sum + t.capacity,
      0
    )

    const { data, error } = await sb
      .from('table_combinations')
      .insert({
        restaurant_id: RESTAURANT_ID,
        table_ids,
        combined_capacity: combinedCapacity,
        name: name?.trim() || null,
        is_active: true,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ combination: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
}

// PATCH /api/admin/inventory/combinations — update a combination
export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const body = await request.json()
    const { id, table_ids, name, is_active } = body

    if (!id) return NextResponse.json({ error: 'ID de combinación requerido' }, { status: 400 })

    const sb = getServiceClient()
    const updates: Record<string, unknown> = {}

    if (name !== undefined) updates.name = name?.trim() || null
    if (is_active !== undefined) updates.is_active = is_active

    if (table_ids !== undefined) {
      if (!Array.isArray(table_ids) || table_ids.length < 2) {
        return NextResponse.json({ error: 'Se requieren al menos 2 mesas para una combinación' }, { status: 400 })
      }

      // Validate tables exist
      const { data: tables, error: tablesError } = await sb
        .from('tables')
        .select('id, capacity')
        .eq('restaurant_id', RESTAURANT_ID)
        .in('id', table_ids)

      if (tablesError) return NextResponse.json({ error: tablesError.message }, { status: 500 })

      if (!tables || tables.length !== table_ids.length) {
        const foundIds = new Set((tables || []).map((t: Record<string, unknown>) => t.id))
        const missing = table_ids.filter((tid: string) => !foundIds.has(tid))
        return NextResponse.json(
          { error: `Mesas no encontradas: ${missing.join(', ')}` },
          { status: 400 }
        )
      }

      updates.table_ids = table_ids
      updates.combined_capacity = (tables as Array<{ capacity: number }>).reduce(
        (sum: number, t: { capacity: number }) => sum + t.capacity,
        0
      )
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await sb
      .from('table_combinations')
      .update(updates)
      .eq('id', id)
      .eq('restaurant_id', RESTAURANT_ID)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Combinación no encontrada' }, { status: 404 })

    return NextResponse.json({ combination: data })
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
}

// DELETE /api/admin/inventory/combinations — delete a combination
export async function DELETE(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const body = await request.json()
    const { id } = body

    if (!id) return NextResponse.json({ error: 'ID de combinación requerido' }, { status: 400 })

    const sb = getServiceClient()

    // Get combination to find affected tables
    const { data: combo, error: getError } = await sb
      .from('table_combinations')
      .select('table_ids')
      .eq('id', id)
      .eq('restaurant_id', RESTAURANT_ID)
      .single()

    if (getError) return NextResponse.json({ error: 'Combinación no encontrada' }, { status: 404 })

    // Delete the combination
    const { error: deleteError } = await sb
      .from('table_combinations')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', RESTAURANT_ID)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    // Reset can_combine and combine_group on affected tables
    const tableIds = (combo as Record<string, unknown>).table_ids as string[]
    if (tableIds && tableIds.length > 0) {
      await sb
        .from('tables')
        .update({ can_combine: false, combine_group: null })
        .in('id', tableIds)
        .eq('restaurant_id', RESTAURANT_ID)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
}
