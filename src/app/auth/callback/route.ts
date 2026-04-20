import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Read and validate redirect path — only allow safe relative paths
  let redirectPath = requestUrl.searchParams.get('redirect') || '/'
  if (!redirectPath.startsWith('/') || redirectPath.startsWith('//')) {
    redirectPath = '/'
  }

  // If there's a code (PKCE flow), exchange it
  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Dynamic import to avoid SSR issues
    const { createServerClient } = await import('@supabase/ssr')

    let response = NextResponse.redirect(new URL(redirectPath, request.url))

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Code exchange error:', error.message)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, request.url)
      )
    }

    return response
  }

  // If no code, redirect to the intended page or home
  // the client-side auth-provider will pick up hash fragment tokens (#access_token=...)
  return NextResponse.redirect(new URL(redirectPath, request.url))
}