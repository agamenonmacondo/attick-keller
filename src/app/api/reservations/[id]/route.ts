import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Authenticate the caller
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // 2. Fetch reservation with related data
    const resRes = await fetch(
      `${SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(id)}&select=id,date,time_start,time_end,party_size,status,special_requests,customer_id,table_zones(name)&limit=1`,
      {
        headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
      }
    )

    if (!resRes.ok) {
      console.error('Reservation fetch error:', await resRes.text())
      return NextResponse.json({ error: 'Failed to fetch reservation' }, { status: 500 })
    }

    const reservations = await resRes.json()
    const reservation = reservations?.[0]

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // 3. Verify the reservation belongs to this user
    const custRes = await fetch(
      `${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(reservation.customer_id)}&select=auth_user_id,full_name,phone,email&limit=1`,
      {
        headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
      }
    )

    if (!custRes.ok) {
      console.error('Customer fetch error:', await custRes.text())
      return NextResponse.json({ error: 'Failed to verify ownership' }, { status: 500 })
    }

    const customers = await custRes.json()
    const customer = customers?.[0]

    // Allow admin users to view any reservation
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    const isAdmin = roleData && (roleData.role === 'super_admin' || roleData.role === 'store_admin')

    if (!isAdmin && customer?.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Build response (remove internal customer_id, add customer info)
    const { customer_id, ...safeReservation } = reservation
    safeReservation.customer = {
      full_name: customer?.full_name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
    }

    return NextResponse.json({ reservation: safeReservation })
  } catch (error) {
    console.error('Get reservation error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}