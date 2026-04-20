import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] as const
type ValidStatus = typeof VALID_STATUSES[number]

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'a0000000-0000-0000-0000-000000000001'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the caller
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, email, date, time, partySize, zoneId, zone, specialRequests } = body

    // 2. Validate required fields
    if (!date || !time || !partySize || !phone) {
      return NextResponse.json({ error: 'Missing required fields: date, time, partySize, phone' }, { status: 400 })
    }

    // Validate date is not in the past
    const today = new Date().toISOString().split('T')[0]
    if (date < today) {
      return NextResponse.json({ error: 'Cannot create reservations in the past' }, { status: 400 })
    }

    // Validate time format HH:MM
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Invalid time format, expected HH:MM' }, { status: 400 })
    }

    // Validate partySize is a positive integer
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
      return NextResponse.json({ error: 'partySize must be between 1 and 20' }, { status: 400 })
    }

    const userId = user.id

    // 3. Get or create customer using service role (bypasses RLS for admin operations)
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?auth_user_id=eq.${encodeURIComponent(userId)}&select=id`, {
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
    })

    if (!custRes.ok) {
      console.error('Customer fetch error:', await custRes.text())
      return NextResponse.json({ error: 'Failed to look up customer' }, { status: 500 })
    }

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
      if (!createRes.ok) {
        console.error('Customer create error:', await createRes.text())
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
      }
      const created = await createRes.json()
      customerId = Array.isArray(created) ? created[0]?.id : created?.id
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }

    // 4. Create reservation
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
        ...(zoneId ? { table_id: zoneId } : {}),
      }),
    })

    if (!resRes.ok) {
      const err = await resRes.text()
      console.error('Reservation insert error:', err)
      return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
    }

    const reservation = await resRes.json()

    // 5. Log initial status
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

    // 6. Send confirmation email (fire and forget)
    if (email) {
      fetch(`${new URL(request.url).origin}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          type: 'pending',
          data: { name, date, time, party_size: partySize, zone, special_requests: specialRequests },
        }),
      }).catch(() => {}) // Don't block on email
    }

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
    // 1. Authenticate the caller
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    const isAdmin = roleData && (roleData.role === 'super_admin' || roleData.role === 'store_admin')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    // Validate status value
    if (!VALID_STATUSES.includes(status as ValidStatus)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // 3. Get current reservation status
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(id)}&select=status,customer_id`, {
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
    })
    const existing = await res.json()
    const oldStatus = existing?.[0]?.status
    const customerId = existing?.[0]?.customer_id

    // 4. Update reservation status
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(id)}`, {
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

    const updatedReservation = await updateRes.json()

    // 5. Log status change with changed_by
    await fetch(`${SUPABASE_URL}/rest/v1/reservation_status_log`, {
      method: 'POST',
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservation_id: id,
        old_status: oldStatus,
        new_status: status,
        changed_by: user.id,
      }),
    })

    // 6. Send notification email to customer on status change
    if (customerId && (status === 'confirmed' || status === 'cancelled')) {
      try {
        // Fetch customer email
        const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}&select=email,full_name`, {
          headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
        })
        const custData = await custRes.json()
        const customerEmail = custData?.[0]?.email
        const customerName = custData?.[0]?.full_name

        // Fetch reservation details for email
        const resDetail = await fetch(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(id)}&select=date,time_start,party_size,table_id`, {
          headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
        })
        const resDetailData = await resDetail.json()
        const detail = resDetailData?.[0]

        if (customerEmail) {
          fetch(`${new URL(request.url).origin}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: customerEmail,
              type: status,
              data: {
                name: customerName,
                date: detail?.date,
                time: detail?.time_start,
                party_size: detail?.party_size,
                zone: detail?.zone_id,
              },
            }),
          }).catch(() => {})
        }
      } catch {
        // Don't fail the status update if email notification fails
      }
    }

    return NextResponse.json({ success: true, reservation: Array.isArray(updatedReservation) ? updatedReservation[0] : updatedReservation })
  } catch (error) {
    console.error('Reservation PATCH error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}