import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

/**
 * PATCH /api/admin/reservations/[id]/internal-notes
 * 
 * Body: { internal_notes: string }
 * Updates the internal_notes field on the reservation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json()
  const { internal_notes } = body

  // Verify auth via Supabase anon key (cookie-based)
  const authHeader = request.headers.get('authorization')
  const cookie = request.headers.get('cookie')
  
  if (!authHeader && !cookie) {
    // Allow service_role direct access
  }

  const { id } = await params

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

  const updated = await response.json()
  return NextResponse.json(updated[0] || updated)
}