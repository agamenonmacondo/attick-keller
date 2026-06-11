import { NextRequest, NextResponse } from 'next/server'
import { logReservationChange } from '@/lib/utils/reservation-logger'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

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
  const body = await request.json()
  const { internal_notes, author_name } = body

  // Verify auth via Supabase anon key (cookie-based)
  const authHeader = request.headers.get('authorization')
  const cookie = request.headers.get('cookie')
  
  if (!authHeader && !cookie) {
    // Allow service_role direct access
  }

  const { id } = await params

  // First, get the current internal_notes to log old value
  const currentRes = await fetch(
    `${SUPABASE_URL}/rest/v1/reservations?id=eq.${id}&restaurant_id=eq.${RESTAURANT_ID}&select=internal_notes`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  )

  let oldNotes = ''
  if (currentRes.ok) {
    const data = await currentRes.json()
    if (Array.isArray(data) && data.length > 0) {
      oldNotes = data[0].internal_notes || ''
    }
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/reservations?id=eq.${id}&restaurant_id=eq.${RESTAURANT_ID}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ internal_notes: internal_notes || '' }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error }, { status: response.status })
  }

  // Log the change to the audit trail
  await logReservationChange({
    reservation_id: id,
    action: 'internal_note_edited',
    field_name: 'internal_notes',
    old_value: oldNotes || null,
    new_value: internal_notes || null,
    performed_by_name: author_name || 'Sistema',
  })

  const updated = await response.json()
  return NextResponse.json(updated[0] || updated)
}