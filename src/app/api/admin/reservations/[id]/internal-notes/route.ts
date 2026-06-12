import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { logReservationChange } from '@/lib/utils/reservation-logger'

/**
 * PATCH /api/admin/reservations/[id]/internal-notes
 *
 * Body: { internal_notes: string, author_name?: string }
 * Updates the internal_notes field on the reservation.
 * Logs the change to the audit trail.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const { internal_notes, author_name } = body

  const { id } = await params
  const sb = getServiceClient()

  // First, get the current internal_notes to log old value
  const { data: currentData } = await sb
    .from('reservations')
    .select('internal_notes')
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  const oldNotes = currentData?.internal_notes || ''

  const { data: updated, error } = await sb
    .from('reservations')
    .update({ internal_notes: internal_notes || '' })
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  // Log the change to the audit trail
  await logReservationChange({
    reservation_id: id,
    action: 'internal_note_edited',
    field_name: 'internal_notes',
    old_value: oldNotes || null,
    new_value: internal_notes || null,
    performed_by_name: author_name || staff.email || 'Sistema',
  })

  return NextResponse.json(updated)
}
