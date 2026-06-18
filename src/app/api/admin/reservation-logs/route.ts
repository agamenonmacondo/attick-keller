import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { requireStaff, handleApiError, validateUUID } from '@/lib/utils/api-security'

/**
 * GET /api/admin/reservation-logs?reservation_id=xxx
 * Fetch audit trail for a specific reservation.
 * Requires: host, store_admin, or super_admin
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
    const { data, error } = await sb
      .from('reservation_logs')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return handleApiError(err, 'reservation-logs GET')
  }
}