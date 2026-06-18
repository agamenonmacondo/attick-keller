import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { requireStaff, handleApiError, validateUUID } from '@/lib/utils/api-security'
import { logReservationChange } from '@/lib/utils/reservation-logger'

/**
 * GET /api/admin/reservation-notes?reservation_id=xxx
 * POST /api/admin/reservation-notes
 * DELETE /api/admin/reservation-notes?id=xxx
 * All require: host, store_admin, or super_admin
 */
export async function GET(request: NextRequest) {
  const authResult = await requireStaff(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const reservationId = searchParams.get('reservation_id')

  if (!reservationId || !validateUUID(reservationId)) {
    return NextResponse.json(
      { error: 'reservation_id es requerido y debe ser UUID valido' },
      { status: 400 }
    )
  }

  try {
    const sb = getServiceClient()

    // Verify reservation belongs to this restaurant
    const { data: reservation } = await sb
      .from('reservations')
      .select('id')
      .eq('id', reservationId)
      .eq('restaurant_id', RESTAURANT_ID)
      .single()

    if (!reservation) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    const { data, error } = await sb
      .from('reservation_notes')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return handleApiError(err, 'reservation-notes GET')
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireStaff(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { reservation_id, note, author_name, author_id } = body

    if (!reservation_id || !validateUUID(reservation_id)) {
      return NextResponse.json(
        { error: 'reservation_id valido es requerido' },
        { status: 400 }
      )
    }
    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json({ error: 'note es requerido' }, { status: 400 })
    }
    if (!author_name || typeof author_name !== 'string') {
      return NextResponse.json({ error: 'author_name es requerido' }, { status: 400 })
    }

    const sb = getServiceClient()

    // Verify reservation belongs to this restaurant
    const { data: reservation } = await sb
      .from('reservations')
      .select('id')
      .eq('id', reservation_id)
      .eq('restaurant_id', RESTAURANT_ID)
      .single()

    if (!reservation) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    const { data: savedNote, error } = await sb
      .from('reservation_notes')
      .insert({
        reservation_id,
        note: note.trim(),
        author_name,
        author_id: author_id || null,
      })
      .select()
      .single()

    if (error) throw error

    // Log to audit trail
    await logReservationChange({
      reservation_id,
      action: 'internal_note_added',
      field_name: 'internal_notes',
      new_value: note.trim(),
      performed_by: author_id || null,
      performed_by_name: author_name,
    })

    return NextResponse.json(savedNote, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'reservation-notes POST')
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

    // Fetch the note before deleting (for audit log + verify ownership)
    const { data: noteInfo, error: fetchError } = await sb
      .from('reservation_notes')
      .select('reservation_id, note, author_name')
      .eq('id', id)
      .single()

    if (fetchError || !noteInfo) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }

    // Verify the reservation belongs to this restaurant
    const { data: reservation } = await sb
      .from('reservations')
      .select('id')
      .eq('id', noteInfo.reservation_id)
      .eq('restaurant_id', RESTAURANT_ID)
      .single()

    if (!reservation) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    const { error: deleteError } = await sb
      .from('reservation_notes')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // Log the deletion to audit trail
    await logReservationChange({
      reservation_id: noteInfo.reservation_id,
      action: 'internal_note_deleted',
      field_name: 'internal_notes',
      old_value: noteInfo.note || null,
      performed_by_name: noteInfo.author_name || 'Sistema',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, 'reservation-notes DELETE')
  }
}