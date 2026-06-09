import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/admin/reservation-logs?reservation_id=xxx
 * Fetch audit trail for a specific reservation.
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
    `${SUPABASE_URL}/rest/v1/reservation_logs?reservation_id=eq.${reservationId}&order=created_at.asc`,
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

  const logs = await response.json()
  return NextResponse.json(logs)
}