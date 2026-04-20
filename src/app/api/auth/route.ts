import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/auth/signup - Auto-confirm user after Supabase signup
export async function POST(request: NextRequest) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { email, name } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  // Auto-confirm the user if they exist but aren't confirmed
  const { data: { users } } = await sb.auth.admin.listUsers()

  const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (existingUser) {
    // Auto-confirm if not confirmed
    if (!existingUser.email_confirmed_at) {
      await sb.auth.admin.updateUserById(existingUser.id, { email_confirm: true })
    }

    // Create customer record if missing
    const { data: existingCustomer } = await sb
      .from('customers')
      .select('id')
      .eq('auth_user_id', existingUser.id)
      .single()

    if (!existingCustomer) {
      await sb.from('customers').insert({
        auth_user_id: existingUser.id,
        email: existingUser.email,
        full_name: name || existingUser.user_metadata?.full_name || existingUser.email?.split('@')[0],
        phone: existingUser.user_metadata?.phone || '',
        restaurant_id: 'a0000000-0000-0000-0000-000000000001',
      })
    }
  }

  // Send welcome email
  const { sendWelcomeEmail } = await import('@/lib/email/send')
  await sendWelcomeEmail(email, name || 'Cliente')

  return NextResponse.json({ success: true })
}

// PUT /api/auth - Password reset
export async function PUT(request: NextRequest) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  const { data, error } = await sb.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ success: true, message: 'Si el correo existe, recibiras un enlace' })
  }

  const { sendPasswordResetEmail } = await import('@/lib/email/send')
  await sendPasswordResetEmail(email, data.properties.action_link)

  return NextResponse.json({ success: true, message: 'Enlace enviado' })
}