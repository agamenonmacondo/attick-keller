import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, phone, email, date, time, partySize, zone, specialRequests } = body

    if (!userId || !date || !time || !partySize || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Get or create customer (service role bypasses RLS)
    const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?auth_user_id=eq.${userId}&select=id`, {
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
    })
    const customers = await custRes.json()
    let customerId = customers?.[0]?.id

    if (!customerId) {
      const createRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers: {
          apikey: SRK,
          Authorization: `Bearer ${SRK}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          restaurant_id: RESTAURANT_ID,
          auth_user_id: userId,
          full_name: name || '',
          phone,
          email: email || null,
        }),
      })
      const created = await createRes.json()
      customerId = Array.isArray(created) ? created[0]?.id : created?.id
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }

    // 2. Create reservation
    const timeEnd = incrementTime(time, 120) // 2h default
    const resRes = await fetch(`${SUPABASE_URL}/rest/v1/reservations`, {
      method: 'POST',
      headers: {
        apikey: SRK,
        Authorization: `Bearer ${SRK}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        restaurant_id: RESTAURANT_ID,
        customer_id: customerId,
        date,
        time_start: time,
        time_end: timeEnd,
        party_size: partySize,
        status: 'pending',
        special_requests: specialRequests || null,
      }),
    })

    if (!resRes.ok) {
      const err = await resRes.text()
      console.error('Reservation insert error:', err)
      return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
    }

    const reservation = await resRes.json()

    // 3. Log initial status
    const resId = Array.isArray(reservation) ? reservation[0]?.id : reservation?.id
    if (resId) {
      await fetch(`${SUPABASE_URL}/rest/v1/reservation_status_log`, {
        method: 'POST',
        headers: {
          apikey: SRK,
          Authorization: `Bearer ${SRK}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservation_id: resId,
          old_status: null,
          new_status: 'pending',
          changed_by: userId,
        }),
      })
    }

    // 4. Send confirmation email (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : ''}${new URL(request.url).origin}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        type: 'pending',
        data: { name, date, time, party_size: partySize, zone, special_requests: specialRequests },
      }),
    }).catch(() => {}) // Don't block on email

    return NextResponse.json({ success: true, reservation: Array.isArray(reservation) ? reservation[0] : reservation })
  } catch (error) {
    console.error('Reservation API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Helper: add minutes to HH:MM time
function incrementTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMin = h * 60 + m + minutes
  const newH = Math.floor(totalMin / 60) % 24
  const newM = totalMin % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${id}&select=status`, {
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
    })
    const existing = await res.json()
    const oldStatus = existing?.[0]?.status

    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: SRK,
        Authorization: `Bearer ${SRK}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ status }),
    })

    if (!updateRes.ok) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    // Log status change
    await fetch(`${SUPABASE_URL}/rest/v1/reservation_status_log`, {
      method: 'POST',
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservation_id: id,
        old_status: oldStatus,
        new_status: status,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}