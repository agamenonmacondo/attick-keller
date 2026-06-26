import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIP } from '@/lib/utils/api-security'

// POST /api/auth/signup - Auto-confirm user after Supabase signup
// Security: requires userId from Supabase signUp response (proves caller just created the account)
// Rate limited: 5 requests per minute per IP
export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  if (!rateLimit(`auth:signup:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Intenta de nuevo en un minuto.' }, { status: 429 })
  }
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { email, name, userId } = await request.json()

  if (!email || !userId) {
    return NextResponse.json({ error: 'Email y userId requeridos' }, { status: 400 })
  }

  // Verify the userId exists and matches the email (proof of possession)
  const { data: userData, error: userError } = await sb.auth.admin.getUserById(userId)

  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })
  }

  if (userData.user.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: 'Email no coincide con el usuario' }, { status: 403 })
  }

  // Auto-confirm if not confirmed
  if (!userData.user.email_confirmed_at) {
    const { error: confirmError } = await sb.auth.admin.updateUserById(userId, { email_confirm: true })
    if (confirmError) {
      console.error('[auth] Auto-confirm failed:', confirmError.message)
      return NextResponse.json({ error: 'Error al confirmar usuario' }, { status: 500 })
    }
  }

  // Create customer record if missing
  const { data: existingCustomer } = await sb
    .from('customers')
    .select('id')
    .eq('auth_user_id', userId)
    .single()

  if (!existingCustomer) {
    const phoneValue = userData.user.user_metadata?.phone || userData.user.phone || ''
    const { error: insertError } = await sb.from('customers').insert({
      auth_user_id: userId,
      email: userData.user.email,
      full_name: name || userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0],
      phone: phoneValue || `pending_${userId}`,
      restaurant_id: 'a0000000-0000-0000-0000-000000000001',
    })
    if (insertError) {
      console.error('[auth] Customer insert failed:', insertError.message)
    }
  }

  // Send welcome email
  try {
    const { sendWelcomeEmail } = await import('@/lib/email/send')
    await sendWelcomeEmail(email, name || 'Cliente')
  } catch (err) {
    console.error('[auth] Welcome email failed:', err instanceof Error ? err.message : String(err))
    // Don't fail the whole request if email fails
  }

  return NextResponse.json({ success: true })
}

// PUT /api/auth - Password reset
// Rate limited: 3 requests per minute per IP
export async function PUT(request: NextRequest) {
  const ip = getClientIP(request)
  if (!rateLimit(`auth:reset:${ip}`, 3, 60_000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Intenta de nuevo en un minuto.' }, { status: 429 })
  }
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