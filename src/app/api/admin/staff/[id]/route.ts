import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// PATCH /api/admin/staff/[id] — activate/deactivate a staff role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()
  const body = await request.json()
  const { is_active } = body

  if (typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active debe ser true o false' }, { status: 400 })
  }

  // Prevent self-deactivation
  if (admin.id === id && !is_active) {
    return NextResponse.json({ error: 'No puedes desactivar tu propio rol' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('user_roles')
    .update({ is_active })
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .select('id, auth_user_id, role, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })

  return NextResponse.json({ staff: data })
}

// DELETE /api/admin/staff/[id] — remove a staff role assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()

  // Prevent self-deletion
  const { data: roleData } = await sb
    .from('user_roles')
    .select('auth_user_id')
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  if (!roleData) return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })

  if (roleData.auth_user_id === admin.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propio rol' }, { status: 400 })
  }

  const { error } = await sb
    .from('user_roles')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}