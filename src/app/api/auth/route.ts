import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// POST /api/auth/signup - Auto-confirm user after Supabase signup
// SECURITY: Requires authenticated session — the caller must be the same user being confirmed.
// Unauthenticated requests are rejected to prevent unauthorized email confirmation bypass.
export async function POST(request: NextRequest) {
  // Verify authenticated session
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() { /* read-only in this context */ },
      },
    }
  )

  const { data: { user: authUser } } = await supabaseAuth.auth.getUser()

  if (!authUser) {
    return NextResponse.json(
      { error: 'Se requiere sesión autenticada para confirmar el correo', requiresVerification: true },
      { status: 403 }
    )
  }

  const { email, name } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  // Ensure the authenticated user is confirming their own email
  if (authUser.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { error: 'Solo puedes confirmar tu propia cuenta' },
      { status: 403 }
    )
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
      const phoneValue = existingUser.user_metadata?.phone || existingUser.phone || ''
      await sb.from('customers').insert({
        auth_user_id: existingUser.id,
        email: existingUser.email,
        full_name: name || existingUser.user_metadata?.full_name || existingUser.email?.split('@')[0],
        phone: phoneValue || `pending_${existingUser.id}`,
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