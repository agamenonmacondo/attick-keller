import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { RESTAURANT_ID } from '@/lib/utils/constants'

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // CSP: allow Supabase auth (including OAuth callbacks), Realtime, fonts, and Vercel assets
  response.headers.set('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://api.resend.com; " +
    "frame-src https://accounts.google.com https://*.supabase.co; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'")
  return response
}

export async function middleware(request: NextRequest) {
  let response = addSecurityHeaders(NextResponse.next({ request }))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = addSecurityHeaders(NextResponse.next({ request }))
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Helper: check if user has ANY of the given roles
  async function hasAnyRole(roles: string[]): Promise<boolean> {
    if (!user) return false
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: roleData } = await sb
      .from('user_roles')
      .select('role')
      .eq('auth_user_id', user.id)
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true)
      .in('role', roles)

    return (roleData && roleData.length > 0) ? true : false
  }

  // Protect /api/admin/* — require staff auth as a safety net
  // Individual handlers still call requireStaff/requireAdmin, but this
  // catches any route that forgets the check.
  if (request.nextUrl.pathname.startsWith('/api/admin/')) {
    if (!user) {
      return addSecurityHeaders(NextResponse.json({ error: 'No autorizado' }, { status: 403 }))
    }
    const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area', 'colaborador'])
    if (!allowed) {
      return addSecurityHeaders(NextResponse.json({ error: 'No autorizado' }, { status: 403 }))
    }
  }

  // Protect /admin — store_admin, super_admin, host, lider_area, or colaborador
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/auth/login', request.url)))
    }
    const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area', 'colaborador'])
    if (!allowed) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/host', request.url)))
    }
  }

  // Protect /host — host, store_admin, or super_admin
  if (request.nextUrl.pathname.startsWith('/host')) {
    if (!user) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/auth/login', request.url)))
    }
    const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host'])
    if (!allowed) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/perfil', request.url)))
    }
  }

  // Protect /perfil, /reservar — authenticated only
  if (
    (request.nextUrl.pathname.startsWith('/perfil') || request.nextUrl.pathname.startsWith('/reservar')) &&
    !user
  ) {
    return addSecurityHeaders(NextResponse.redirect(new URL('/auth/login', request.url)))
  }

  // Redirect /mi-turno to /admin (old route, now a tab in admin panel)
  if (request.nextUrl.pathname.startsWith('/mi-turno')) {
    return addSecurityHeaders(NextResponse.redirect(new URL('/admin', request.url)))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
