'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4',
      scrolled ? 'bg-[#3E2723] shadow-lg' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-['Playfair_Display'] text-2xl font-bold text-white">
          Attick &amp; Keller
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/reservar"
            className="px-5 py-2 bg-[#6B2737] text-white rounded-full font-semibold hover:bg-[#8B3747] transition-colors text-sm"
          >
            Reservar Mesa
          </Link>
          <ProfileLink />
        </div>
      </div>
    </nav>
  )
}

function ProfileLink() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth-status', { method: 'GET' }).then(() => {
      // We'll use client-side check instead
    })
    // Simple client-side check
    const check = async () => {
      const { createBrowserClient } = await import('@supabase/ssr')
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { session } } = await sb.auth.getSession()
      setLoggedIn(!!session)
      if (session?.user) {
        const role = session.user.app_metadata?.role || session.user.user_metadata?.role
        setIsAdmin(role === 'super_admin')
      }
    }
    check()
  }, [])

  if (loggedIn) {
    return (
      <Link
        href={isAdmin ? '/admin' : '/perfil'}
        className="text-white hover:text-[#C9A94E] transition-colors text-sm font-medium"
      >
        {isAdmin ? 'Admin' : 'Mi Perfil'}
      </Link>
    )
  }

  return (
    <Link
      href="/auth/login"
      className="text-white hover:text-[#C9A94E] transition-colors text-sm font-medium"
    >
      Ingresar
    </Link>
  )
}