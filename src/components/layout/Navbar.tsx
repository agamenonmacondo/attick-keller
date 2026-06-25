'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { useAuth } from '@/lib/auth/auth-provider'
import { List, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [menuOpen])

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-4 md:px-6 py-4',
      scrolled
        ? 'bg-[var(--color-ak-madera)]/95 dark:bg-[var(--color-ak-night)]/95 shadow-lg backdrop-blur-sm'
        : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-heading)] text-xl md:text-2xl font-bold text-white transition-opacity duration-200 hover:opacity-80"
        >
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

      <AnimatePresence>
        {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </nav>
  )
}

function ProfileLink({ className }: { className?: string }) {
  const { user, loading, isAdmin } = useAuth()

  if (loading) return null

  const base =
    'group relative text-white dark:text-[var(--color-ak-cal)] hover:text-[var(--color-ak-dorado)] transition-colors duration-200 text-sm font-medium'

  if (user) {
    return (
      <Link
        href={isAdmin ? '/admin' : '/perfil'}
        className={cn(base, className)}
      >
        {isAdmin ? 'Admin' : 'Mi Perfil'}
        <span className="absolute -bottom-1 left-0 h-px w-0 bg-[var(--color-ak-dorado)] transition-all duration-300 group-hover:w-full" />
      </Link>
    )
  }

  return (
    <Link
      href="/auth/login"
      className={cn(base, className)}
    >
      Ingresar
      <span className="absolute -bottom-1 left-0 h-px w-0 bg-[var(--color-ak-dorado)] transition-all duration-300 group-hover:w-full" />
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
    <>
      {/* Backdrop */}
      <motion.div
        key="nav-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[60] md:hidden backdrop-blur-md"
        style={{ backgroundColor: 'rgba(62,39,35,0.6)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <motion.div
        key="nav-drawer"
        initial={{ transform: 'translateX(100%)' }}
        animate={{ transform: 'translateX(0%)' }}
        exit={{ transform: 'translateX(100%)' }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="fixed top-0 right-0 bottom-0 z-[70] md:hidden w-[min(300px,85vw)] shadow-2xl flex flex-col bg-[var(--color-ak-madera)] dark:bg-[var(--color-ak-night)] transition-colors duration-300"
        style={{
          paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <span
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-heading)", color: 'var(--color-ak-cal)' }}
            >
              Attick &amp; Keller
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--color-ak-cal)', backgroundColor: 'rgba(255,255,255,0.1)' }}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Gold divider */}
        <div className="mx-5 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--color-ak-dorado), transparent)' }} />

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-5 py-6 space-y-2" aria-label="Menú móvil">
          {links.map((link, i) => (
            <motion.div
              key={link.href + link.label}
              initial={{ opacity: 0, transform: 'translateX(20px)' }}
              animate={{ opacity: 1, transform: 'translateX(0px)' }}
              transition={{ duration: 0.3, delay: 0.08 + i * 0.06, ease: EASE_OUT }}
            >
              {link.primary ? (
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="block w-full text-center px-5 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.97]"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    backgroundColor: 'var(--color-ak-borgona)',
                    color: 'white',
                    minHeight: '48px',
                  }}
                >
                  {link.label}
                </Link>
              ) : (
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98]"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    color: 'var(--color-ak-cal)',
                    minHeight: '48px',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-ak-dorado)' }} />
                  <span className="font-medium text-[15px]">{link.label}</span>
                </Link>
              )}
            </motion.div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-5 pt-4">
          <div className="h-px mb-4" style={{ background: 'linear-gradient(to right, transparent, rgba(201,169,78,0.3), transparent)' }} />
          <p
            className="text-xs text-center"
            style={{ fontFamily: "'Caveat', cursive", color: 'var(--color-ak-ambar)', opacity: 0.7 }}
          >
            Cada visita, una historia
          </p>
        </div>
      </motion.div>
    </>
  )
}