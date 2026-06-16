'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { useAuth } from '@/lib/auth/auth-provider'
import { List, X } from '@phosphor-icons/react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-4 md:px-6 py-4',
      scrolled ? 'bg-[var(--color-ak-madera)] shadow-lg' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-bold text-white">
          Attick &amp; Keller
        </Link>

        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/reservar"
            className="hidden sm:inline-flex px-5 py-2 bg-[var(--color-ak-borgona)] text-white rounded-full font-semibold hover:bg-[var(--color-ak-ladrillo)] active:scale-[0.97] transition-all duration-200 text-sm"
          >
            Reservar Mesa
          </Link>
          <ProfileLink className="hidden md:inline-flex" />

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-[var(--color-ak-dorado)] transition-colors rounded-lg"
            aria-label="Abrir menú"
          >
            <List size={28} />
          </button>
        </div>
      </div>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </nav>
  )
}

function ProfileLink({ className }: { className?: string }) {
  const { user, loading, isAdmin } = useAuth()

  if (loading) return null

  if (user) {
    return (
      <Link
        href={isAdmin ? '/admin' : '/perfil'}
        className={cn(
          'text-white hover:text-[var(--color-ak-dorado)] transition-colors text-sm font-medium',
          className
        )}
      >
        {isAdmin ? 'Admin' : 'Mi Perfil'}
      </Link>
    )
  }

  return (
    <Link
      href="/auth/login"
      className={cn(
        'text-white hover:text-[var(--color-ak-dorado)] transition-colors text-sm font-medium',
        className
      )}
    >
      Ingresar
    </Link>
  )
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { user, isAdmin } = useAuth()

  const links = [
    { href: '/reservar', label: 'Reservar Mesa', primary: true },
    { href: '/host', label: 'Panel de Host', adminOnly: true },
    { href: '/admin', label: 'Panel Admin', adminOnly: true },
    { href: user ? (isAdmin ? '/admin' : '/perfil') : '/auth/login', label: user ? (isAdmin ? 'Admin' : 'Mi Perfil') : 'Ingresar' },
  ].filter(l => !l.adminOnly || isAdmin)

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute top-0 right-0 bottom-0 w-[min(280px,80vw)] bg-[var(--bg-card)] shadow-2xl flex flex-col"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
          <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)]">
            Menú
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg"
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2" aria-label="Menú móvil">
          {links.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              onClick={onClose}
              className={cn(
                'block w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                link.primary
                  ? 'bg-[var(--color-ak-borgona)] text-white hover:bg-[var(--color-ak-ladrillo)] text-center'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}