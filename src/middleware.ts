import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const protectedPaths = ['/admin', '/perfil', '/reservar']
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  if (!isProtected) {
    return NextResponse.next()
  }

  // Create a Supabase server client to verify the session
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const redirectUrl = new URL('/auth/login', request.url)
    if (pathname !== '/auth/login') {
      redirectUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(redirectUrl)
  }

  // For admin routes, check role
  if (pathname.startsWith('/admin')) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    const isAdmin = roleData && (roleData.role === 'super_admin' || roleData.role === 'store_admin')
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/perfil/:path*', '/reservar/:path*']
}