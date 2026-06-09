import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

/**
 * GET /api/admin/table-blocks?date=2026-06-09
 * Fetch table blocks for a specific date.
 * 
 * POST /api/admin/table-blocks
 * Create a new table block (host blocks a table for walk-in).
 * Body: { table_id, date, time_start, time_end, reason, created_by_name }
 * 
 * DELETE /api/admin/table-blocks?id=xxx
 * Remove a table block.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  let query = `${SUPABASE_URL}/rest/v1/table_blocks?restaurant_id=eq.${RESTAURANT_ID}&order=created_at.asc`
  if (date) {
    query += `&date=eq.${date}`
  }

  const response = await fetch(query, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error }, { status: response.status })
  }

  // Enrich with table info
  const blocks = await response.json()

  // Fetch table names if we have blocks
  if (blocks.length > 0) {
    const tableIds = [...new Set(blocks.map((b: any) => b.table_id))]
    const tablesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/tables?id=in.(${tableIds.join(',')})&select=id,number,name_attick,zone_id`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    )

    if (tablesResponse.ok) {
      const tables = await tablesResponse.json()
      const tableMap = Object.fromEntries(tables.map((t: any) => [t.id, t]))
      blocks.forEach((b: any) => {
        b.table = tableMap[b.table_id] || null
      })
    }
  }

  return NextResponse.json(blocks)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { table_id, date, time_start, time_end, reason, created_by, created_by_name } = body

  if (!table_id || !date || !time_start || !time_end) {
    return NextResponse.json(
      { error: 'table_id, date, time_start, and time_end are required' },
      { status: 400 }
    )
  }

  // Check for overlapping blocks on the same table
  const overlapQuery = `${SUPABASE_URL}/rest/v1/table_blocks?table_id=eq.${table_id}&date=eq.${date}&time_start=lt.${time_end}&time_end=gt.${time_start}&restaurant_id=eq.${RESTAURANT_ID}`
  const overlapResponse = await fetch(overlapQuery, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })

  if (overlapResponse.ok) {
    const overlaps = await overlapResponse.json()
    if (overlaps.length > 0) {
      return NextResponse.json(
        { error: 'Esta mesa ya tiene un bloqueo que se superpone con el horario solicitado', overlaps },
        { status: 409 }
      )
    }
  }

  const insertBody = {
    table_id,
    restaurant_id: RESTAURANT_ID,
    date,
    time_start,
    time_end,
    reason: reason || 'Reservado para walk-in',
    created_by: created_by || null,
    created_by_name: created_by_name || 'Sistema',
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/table_blocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(insertBody),
  })

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error }, { status: response.status })
  }

  const block = await response.json()

  // Log the block creation
  await fetch(`${SUPABASE_URL}/rest/v1/reservation_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      reservation_id: '00000000-0000-0000-0000-000000000000', // system log
      action: 'table_block_created',
      field_name: 'table_id',
      new_value: table_id,
      notes: `Mesa bloqueada: ${time_start}-${time_end} el ${date}. Motivo: ${reason || 'Walk-in'}`,
      performed_by_name: created_by_name || 'Sistema',
    }),
  })

  return NextResponse.json(block[0] || block, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'id is required' },
      { status: 400 }
    )
  }

  // Fetch the block before deleting for logging
  const blockResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/table_blocks?id=eq.${id}`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  )

  let blockData: any = null
  if (blockResponse.ok) {
    const blocks = await blockResponse.json()
    blockData = blocks[0] || null
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/table_blocks?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error }, { status: response.status })
  }

  // Log the block removal
  if (blockData) {
    await fetch(`${SUPABASE_URL}/rest/v1/reservation_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        reservation_id: '00000000-0000-0000-0000-000000000000',
        action: 'table_block_removed',
        field_name: 'table_id',
        old_value: blockData.table_id,
        notes: `Bloqueo removido: ${blockData.time_start}-${blockData.time_end} el ${blockData.date}`,
        performed_by_name: blockData.created_by_name || 'Sistema',
      }),
    })
  }

  return NextResponse.json({ success: true })
}