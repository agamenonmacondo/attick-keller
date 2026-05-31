import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id: periodoId } = await params
  const sede = request.nextUrl.searchParams.get('sede') || 'C75'

  const sb = getServiceClient()

  const { data, error } = await sb
    .from('nomina_propinas')
    .select('*')
    .eq('periodo_id', periodoId)
    .eq('sede', sede)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data || [] })
}