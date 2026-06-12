import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// GET /api/admin/staff — list all staff members with roles
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  // Get all user_roles for this restaurant
  const { data: roles, error } = await sb
    .from('user_roles')
    .select('id, auth_user_id, role, is_active, created_at, pos_nomina_staff_id, area')
    .eq('restaurant_id', RESTAURANT_ID)
    .in('role', ['host', 'store_admin', 'super_admin', 'lider_area', 'colaborador', 'reservante'])
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  // Look up emails via Supabase admin API
  const { data: { users } } = await sb.auth.admin.listUsers()
  const emailMap = new Map(users.map(u => [u.id, u.email]))

  const staff = (roles || []).map(r => ({
    id: r.id,
    auth_user_id: r.auth_user_id,
    email: emailMap.get(r.auth_user_id) || null,
    role: r.role,
    is_active: r.is_active,
    created_at: r.created_at,
    pos_nomina_staff_id: r.pos_nomina_staff_id,
    area: r.area,
  }))

  return NextResponse.json({ staff })
}

// POST /api/admin/staff — assign a role to a user by email
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { email, role, pos_nomina_staff_id, area } = body

  if (!email || !role) {
    return NextResponse.json({ error: 'Email y rol son requeridos' }, { status: 400 })
  }

  if (!['host', 'store_admin', 'super_admin', 'lider_area', 'colaborador', 'reservante'].includes(role)) {
    return NextResponse.json({ error: 'Rol invalido. Use host, store_admin, super_admin, lider_area, colaborador o reservante' }, { status: 400 })
  }

  // For lider_area/colaborador/reservante, pos_nomina_staff_id is required
  if ((role === 'lider_area' || role === 'colaborador' || role === 'reservante') && !pos_nomina_staff_id) {
    return NextResponse.json({ error: 'Empleado de nomina es requerido para este rol' }, { status: 400 })
  }

  // Look up user by email via Supabase admin API
  const { data: { users } } = await sb.auth.admin.listUsers()
  let user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  // Auto-create user if not found — they can sign in with Google later
  if (!user) {
    const { data: newUser, error: createError } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (createError || !newUser) {
      return NextResponse.json({ error: 'Error al crear usuario: ' + (createError?.message || 'intente de nuevo') }, { status: 500 })
    }
    user = newUser.user
  }

  // Check if role already exists for this user
  const { data: existing } = await sb
    .from('user_roles')
    .select('id, is_active')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('role', role)
    .single()

  if (existing) {
    // Reactivate if inactive
    if (!existing.is_active) {
      const updateData: Record<string, unknown> = { is_active: true }
      if (pos_nomina_staff_id) updateData.pos_nomina_staff_id = pos_nomina_staff_id
      if (area) updateData.area = area

      const { data, error } = await sb
        .from('user_roles')
        .update(updateData)
        .eq('id', existing.id)
        .select('id, auth_user_id, role, is_active, created_at, pos_nomina_staff_id, area')
        .single()
      if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
      return NextResponse.json({ staff: { ...data, email: user.email } })
    }
    return NextResponse.json({ error: 'Este usuario ya tiene este rol' }, { status: 409 })
  }

  // Create new role
  const insertData: Record<string, unknown> = {
    auth_user_id: user.id,
    restaurant_id: RESTAURANT_ID,
    role,
    is_active: true,
  }
  if (pos_nomina_staff_id) insertData.pos_nomina_staff_id = pos_nomina_staff_id
  if (area) insertData.area = area

  const { data, error } = await sb
    .from('user_roles')
    .insert(insertData)
    .select('id, auth_user_id, role, is_active, created_at, pos_nomina_staff_id, area')
    .single()

  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  return NextResponse.json({ staff: { ...data, email: user.email } }, { status: 201 })
}