import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

/**
 * GET /api/admin/reservation-notes?reservation_id=xxx
 * Fetch notes for a specific reservation.
 * 
 * POST /api/admin/reservation-notes
 * Add a note to a reservation.
 * Body: { reservation_id, note, author_name, author_id? }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reservationId = searchParams.get('reservation_id')

  if (!reservationId) {
    return NextResponse.json(
      { error: 'reservation_id is required' },
      { status: 400 }
    )
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/reservation_notes?reservation_id=eq.${reservationId}&order=created_at.asc`,
    {
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

  const notes = await response.json()
  return NextResponse.json(notes)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { reservation_id, note, author_name, author_id } = body

  if (!reservation_id || !note || !author_name) {
    return NextResponse.json(
      { error: 'reservation_id, note, and author_name are required' },
      { status: 400 }
    )
  }

  // Insert the note
  const insertBody = {
    reservation_id,
    note,
    author_name,
    author_id: author_id || null,
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/reservation_notes`, {
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

  const savedNote = await response.json()

  // Also log this in the audit trail
  await fetch(`${SUPABASE_URL}/rest/v1/reservation_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      reservation_id,
      action: 'internal_note_added',
      field_name: 'internal_notes',
      new_value: note,
      performed_by: author_id || null,
      performed_by_name: author_name,
    }),
  })

  return NextResponse.json(savedNote[0] || savedNote, { status: 201 })
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

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/reservation_notes?id=eq.${id}`,
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

  return NextResponse.json({ success: true })
}