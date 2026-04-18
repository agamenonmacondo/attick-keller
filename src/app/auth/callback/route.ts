import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
  }

  // Create response first
  const response = NextResponse.redirect(new URL('/', request.url))

  // Exchange code for session using Supabase Auth API directly
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ auth_code: code }),
    })

    if (!res.ok) {
      console.error('Code exchange failed:', await res.text())
      return NextResponse.redirect(new URL('/auth/login?error=exchange_failed', request.url))
    }

    const data = await res.json()
    
    // Set auth cookies
    if (data.access_token) {
      response.cookies.set('sb-access-token', data.access_token, {
        path: '/',
        maxAge: data.expires_in || 3600,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }
    if (data.refresh_token) {
      response.cookies.set('sb-refresh-token', data.refresh_token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }
  } catch (error) {
    console.error('Code exchange error:', error)
    return NextResponse.redirect(new URL('/auth/login?error=unknown', request.url))
  }

  return response
}