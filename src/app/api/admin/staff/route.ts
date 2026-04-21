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
    .select('id, auth_user_id, role, is_active, created_at')
    .eq('restaurant_id', RESTAURANT_ID)
    .in('role', ['host', 'store_admin', 'super_admin'])
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
  }))

  return NextResponse.json({ staff })
}

// POST /api/admin/staff — assign a role to a user by email
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { email, role } = body

  if (!email || !role) {
    return NextResponse.json({ error: 'Email y rol son requeridos' }, { status: 400 })
  }

  if (!['host', 'store_admin'].includes(role)) {
    return NextResponse.json({ error: 'Rol invalido. Use host o store_admin' }, { status: 400 })
  }

  // Look up user by email via Supabase admin API
  const { data: { users } } = await sb.auth.admin.listUsers()
  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado. El usuario debe registrarse primero.' }, { status: 404 })
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
      const { data, error } = await sb
        .from('user_roles')
        .update({ is_active: true })
        .eq('id', existing.id)
        .select('id, auth_user_id, role, is_active, created_at')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ staff: { ...data, email: user.email } })
    }
    return NextResponse.json({ error: 'Este usuario ya tiene este rol' }, { status: 409 })
  }

  // Create new role
  const { data, error } = await sb
    .from('user_roles')
    .insert({
      auth_user_id: user.id,
      restaurant_id: RESTAURANT_ID,
      role,
      is_active: true,
    })
    .select('id, auth_user_id, role, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ staff: { ...data, email: user.email } }, { status: 201 })
}