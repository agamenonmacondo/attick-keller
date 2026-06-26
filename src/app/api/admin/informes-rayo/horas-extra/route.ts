import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 })
  }

  const sb = getServiceClient()
  // v_horas_extra has 'dia' (int 0-6 = day of week) and 'semana' (string "2026-W26")
  // Can't filter by date range — return all rows
  const { data, error } = await sb
    .from('v_horas_extra')
    .select('*')
    .order('semana', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  const totalHE = rows.reduce((s: number, r: any) => s + Number(r.horas_extra ?? 0), 0)
  const totalCosto = rows.reduce((s: number, r: any) => s + Number(r.costo_he ?? 0), 0)
  const empleados = new Set(rows.map((r: any) => r.empleado_nombre)).size

  const summary = {
    total_he: totalHE,
    total_costo: totalCosto,
    promedio_por_empleado: empleados > 0 ? totalHE / empleados : 0,
    empleados_afectados: empleados,
  }

  return NextResponse.json({ data: rows, summary })
}