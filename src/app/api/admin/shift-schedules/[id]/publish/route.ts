import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// POST /api/admin/shift-schedules/[id]/publish
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  if (!['super_admin', 'store_admin', 'lider_area'].includes(admin.role)) {
    return NextResponse.json({ error: 'Rol sin permiso para publicar' }, { status: 403 })
  }

  const sb = getServiceClient()
  const { id } = await params

  // Verificar que el cronograma existe y esta en draft
  const { data: schedule, error: fetchError } = await sb
    .from('shift_schedules')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !schedule) {
    return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })
  }

  if (schedule.status !== 'draft') {
    return NextResponse.json({ error: 'Solo se pueden publicar cronogramas en borrador' }, { status: 400 })
  }

  // Verificar que tiene asignaciones
  const { count } = await sb
    .from('shift_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('schedule_id', id)

  if (!count || count === 0) {
    return NextResponse.json({ error: 'El cronograma no tiene asignaciones' }, { status: 400 })
  }

  // Publicar
  const { data: updated, error: updateError } = await sb
    .from('shift_schedules')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}