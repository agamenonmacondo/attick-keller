import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST - Send welcome email after signup
export async function POST(request: NextRequest) {
  const sb = getServiceClient()
  const { email, name } = await request.json()

  const { sendWelcomeEmail } = await import('@/lib/email/send')
  const result = await sendWelcomeEmail(email, name)

  return NextResponse.json(result)
}

// PUT - Send password reset email
export async function PUT(request: NextRequest) {
  const sb = getServiceClient()
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  // Find user by email
  const { data: customers } = await sb
    .from('customers')
    .select('email, full_name')
    .eq('email', email)
    .limit(1)

  // Generate password reset link via Supabase
  const { data, error } = await sb.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error || !data?.properties?.action_link) {
    // Don't reveal if email exists for security
    return NextResponse.json({ success: true, message: 'Si el correo existe, recibiras un enlace' })
  }

  const { sendPasswordResetEmail } = await import('@/lib/email/send')
  await sendPasswordResetEmail(email, data.properties.action_link)

  return NextResponse.json({ success: true, message: 'Enlace enviado' })
}