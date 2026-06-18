import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { requireStaff, handleApiError, validateUUID } from '@/lib/utils/api-security'

/**
 * GET /api/admin/table-blocks?date=2026-06-09
 * POST /api/admin/table-blocks
 * DELETE /api/admin/table-blocks?id=xxx
 * All require: host, store_admin, or super_admin
 */
export async function GET(request: NextRequest) {
  const authResult = await requireStaff(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  try {
    const sb = getServiceClient()

    let query = sb
      .from('table_blocks')
      .select('id, table_id, date, time_start, time_end, reason, created_by, created_by_name, created_at')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('created_at', { ascending: true })

    if (date) {
      query = query.eq('date', date)
    }

    const { data: blocks, error } = await query

    if (error) throw error

    // Enrich with table info
    if (blocks && blocks.length > 0) {
      const tableIds = [...new Set(blocks.map((b: any) => b.table_id).filter(Boolean))]
      if (tableIds.length > 0) {
        const { data: tables } = await sb
          .from('tables')
          .select('id, number, name_attick, zone_id')
          .in('id', tableIds)

        if (tables) {
          const tableMap = Object.fromEntries(tables.map((t: any) => [t.id, t]))
          blocks.forEach((b: any) => {
            b.table = tableMap[b.table_id] || null
          })
        }
      }
    }

    return NextResponse.json(blocks || [])
  } catch (err) {
    return handleApiError(err, 'table-blocks GET')
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireStaff(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { table_id, date, time_start, time_end, reason, created_by, created_by_name } = body

    if (!table_id || !validateUUID(table_id)) {
      return NextResponse.json({ error: 'table_id valido es requerido' }, { status: 400 })
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date valido (YYYY-MM-DD) es requerido' }, { status: 400 })
    }
    if (!time_start || !time_end) {
      return NextResponse.json({ error: 'time_start y time_end son requeridos' }, { status: 400 })
    }

    const sb = getServiceClient()

    // Check for overlapping blocks
    const { data: overlaps } = await sb
      .from('table_blocks')
      .select('id')
      .eq('table_id', table_id)
      .eq('date', date)
      .eq('restaurant_id', RESTAURANT_ID)
      .lt('time_start', time_end)
      .gt('time_end', time_start)

    if (overlaps && overlaps.length > 0) {
      return NextResponse.json(
        { error: 'Esta mesa ya tiene un bloqueo que se superpone con el horario solicitado', overlaps },
        { status: 409 }
      )
    }

    const { data: block, error } = await sb
      .from('table_blocks')
      .insert({
        table_id,
        restaurant_id: RESTAURANT_ID,
        date,
        time_start,
        time_end,
        reason: reason || 'Reservado para walk-in',
        created_by: created_by || null,
        created_by_name: created_by_name || 'Sistema',
      })
      .select()
      .single()

    if (error) throw error

    // Log the block creation to reservation_logs
    await sb.from('reservation_logs').insert({
      reservation_id: '00000000-0000-0000-0000-000000000000',
      action: 'table_block_created',
      field_name: 'table_id',
      new_value: table_id,
      notes: `Mesa bloqueada: ${time_start}-${time_end} el ${date}. Motivo: ${reason || 'Walk-in'}`,
      performed_by_name: created_by_name || 'Sistema',
    })

    return NextResponse.json(block, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'table-blocks POST')
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireStaff(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id || !validateUUID(id)) {
    return NextResponse.json(
      { error: 'id valido es requerido' },
      { status: 400 }
    )
  }

  try {
    const sb = getServiceClient()

    // Fetch the block before deleting (for audit log + verify ownership)
    const { data: blockData, error: fetchError } = await sb
      .from('table_blocks')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', RESTAURANT_ID)
      .single()

    if (fetchError || !blockData) {
      return NextResponse.json({ error: 'Bloqueo no encontrado' }, { status: 404 })
    }

    const { error: deleteError } = await sb
      .from('table_blocks')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', RESTAURANT_ID)

    if (deleteError) throw deleteError

    // Log the block removal
    await sb.from('reservation_logs').insert({
      reservation_id: '00000000-0000-0000-0000-000000000000',
      action: 'table_block_removed',
      field_name: 'table_id',
      old_value: blockData.table_id,
      notes: `Bloqueo removido: ${blockData.time_start}-${blockData.time_end} el ${blockData.date}`,
      performed_by_name: blockData.created_by_name || 'Sistema',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, 'table-blocks DELETE')
  }
}