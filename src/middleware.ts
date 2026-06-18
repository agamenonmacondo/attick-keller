import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { RESTAURANT_ID } from '@/lib/utils/constants'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area'])
    if (!allowed) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  // Protect /admin — store_admin, super_admin, host, or lider_area
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host', 'lider_area'])
    if (!allowed) {
      return NextResponse.redirect(new URL('/host', request.url))
    }
  }

  // Protect /host — host, store_admin, or super_admin
  if (request.nextUrl.pathname.startsWith('/host')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    const allowed = await hasAnyRole(['store_admin', 'super_admin', 'host'])
    if (!allowed) {
      return NextResponse.redirect(new URL('/perfil', request.url))
    }
  }

  // Protect /perfil, /reservar — authenticated only
  if (
    (request.nextUrl.pathname.startsWith('/perfil') || request.nextUrl.pathname.startsWith('/reservar')) &&
    !user
  ) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Protect /mi-turno — employee only
  if (request.nextUrl.pathname.startsWith('/mi-turno')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    const allowed = await hasAnyRole(['lider_area', 'colaborador', 'reservante', 'store_admin', 'super_admin'])
    if (!allowed) {
      return NextResponse.redirect(new URL('/perfil', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
