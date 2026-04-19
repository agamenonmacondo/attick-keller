import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/table_zones?select=id,name&order=sort_order`, {
    headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}