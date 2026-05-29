import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'
import { sendShiftScheduleEmail, sendShiftChangeEmail } from '@/lib/email/send'

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

  // Verificar que el cronograma existe (draft o published — ambos permitidos)
  const { data: schedule, error: fetchError } = await sb
    .from('shift_schedules')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !schedule) {
    return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })
  }

  if (schedule.status !== 'draft' && schedule.status !== 'published') {
    return NextResponse.json({ error: 'Solo se pueden publicar cronogramas en borrador o ya publicados' }, { status: 400 })
  }

  const isRepublish = schedule.status === 'published'

  // Verificar que tiene asignaciones
  const { count } = await sb
    .from('shift_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('schedule_id', id)

  if (!count || count === 0) {
    return NextResponse.json({ error: 'El cronograma no tiene asignaciones' }, { status: 400 })
  }

  // Publicar / Re-publicar: siempre status = 'published', siempre actualizar updated_at
  const { data: updated, error: updateError } = await sb
    .from('shift_schedules')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Enviar correos (fire-and-forget)
  try {
    const { data: allAssignments } = await sb
      .from('shift_assignments')
      .select('employee_id, shift_code, day_index')
      .eq('schedule_id', updated.id)

    const { data: shiftTypes } = await sb
      .from('shift_types')
      .select('code, name, entrada, salida, ordinarias, nocturnas')
      .eq('area', updated.area)

    const shiftTypeMap: Map<string, any> = new Map((shiftTypes || []).map((st: any) => [st.code, st]))

    // Agrupar por empleado
    const employeeMap = new Map<string, { shiftCode: string; shiftName: string; entrada: string; salida: string; hours: number; dayIndex: number }[]>()
    for (const a of (allAssignments || [])) {
      const st = shiftTypeMap.get(a.shift_code)
      if (!st) continue
      if (!employeeMap.has(a.employee_id)) employeeMap.set(a.employee_id, [])
      employeeMap.get(a.employee_id)!.push({
        shiftCode: a.shift_code,
        shiftName: st.name,
        entrada: st.entrada,
        salida: st.salida,
        hours: (st.ordinarias || 0) + (st.nocturnas || 0),
        dayIndex: a.day_index,
      })
    }

    // Buscar auth users para obtener emails
    const { data: { users } } = await sb.auth.admin.listUsers()

    const recipients: any[] = []
    for (const [employeeId, assignments] of employeeMap) {
      const { data: emp } = await sb
        .from('pos_nomina_staff')
        .select('id, nombre_completo, correo')
        .eq('id', employeeId)
        .single()

      if (!emp) continue

      // Buscar email (preferir correo de pos_nomina, sino auth email)
      let email = emp.correo
      if (!email) {
        const { data: userRole } = await sb
          .from('user_roles')
          .select('auth_user_id')
          .eq('pos_nomina_staff_id', employeeId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        if (userRole) {
          const authUser = users.find((u: any) => u.id === userRole.auth_user_id)
          email = authUser?.email || ''
        }
      }
      if (!email) continue

      // Buscar alias
      const { data: aliasData } = await sb
        .from('staff_aliases')
        .select('alias')
        .eq('employee_id', employeeId)
        .limit(1)
      const name = (aliasData && aliasData[0]?.alias) || emp.nombre_completo.split(' ')[0]

      recipients.push({
        email,
        name,
        employeeId,
        assignments,
      })
    }

    // Elegir funcion de email segun si es primera publicacion o re-publicacion
    if (isRepublish) {
      // Re-publicacion: enviar correo de "Tu horario cambio" a todos los asignados
      sendShiftChangeEmail(updated.week_str, updated.area, updated.id, recipients, sb)
        .then(result => console.log('[email] Schedule updated emails:', result))
        .catch(err => console.error('[email] Error sending schedule update emails:', err))
    } else {
      // Primera publicacion: enviar correo de "Tu cronograma esta listo" a todos los asignados
      sendShiftScheduleEmail(updated.week_str, updated.area, updated.id, recipients, sb)
        .then(result => console.log('[email] Schedule published emails:', result))
        .catch(err => console.error('[email] Error sending schedule emails:', err))
    }
  } catch (emailErr) {
    // No fallar la publicación si el correo falla
    console.error('[email] Error preparing schedule emails:', emailErr)
  }

  return NextResponse.json(updated)
}