'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { useAuth } from '@/lib/auth/auth-provider'

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
      scrolled ? 'bg-[var(--color-ak-madera)] shadow-lg' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-['Playfair_Display'] text-2xl font-bold text-white">
          Attick &amp; Keller
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/reservar"
            className="px-5 py-2 bg-[var(--color-ak-borgona)] text-white rounded-full font-semibold hover:bg-[var(--color-accent)] transition-colors text-sm"
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
  const { user, loading, isAdmin } = useAuth()

  if (loading) return null

  if (user) {
    return (
      <Link
        href={isAdmin ? '/admin' : '/perfil'}
        className="text-white hover:text-[var(--color-ak-dorado)] transition-colors text-sm font-medium"
      >
        {isAdmin ? 'Admin' : 'Mi Perfil'}
      </Link>
    )
  }

  return (
    <Link
      href="/auth/login"
      className="text-white hover:text-[var(--color-ak-dorado)] transition-colors text-sm font-medium"
    >
      Ingresar
    </Link>
  )
}