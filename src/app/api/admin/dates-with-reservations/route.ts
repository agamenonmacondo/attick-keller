import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const url = new URL(request.url)
  const center = url.searchParams.get('center') || new Date().toISOString().split('T')[0]
  const range = Math.min(parseInt(url.searchParams.get('range') || '7', 10), 30)

  const centerDate = new Date(center + 'T00:00:00')
  const from = new Date(centerDate)
  from.setDate(from.getDate() - range)
  const to = new Date(centerDate)
  to.setDate(to.getDate() + range)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const { data, error } = await sb
    .from('reservations')
    .select('date')
    .eq('restaurant_id', RESTAURANT_ID)
    .gte('date', fmt(from))
    .lte('date', fmt(to))
    .in('status', ['pending', 'pre_paid', 'confirmed', 'seated'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const dates = [...new Set((data || []).map(r => r.date))]
  return NextResponse.json({ dates })
}