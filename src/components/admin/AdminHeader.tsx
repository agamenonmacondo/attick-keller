'use client'

import { useAuth } from '@/lib/auth/auth-provider'
import { useTheme } from '@/lib/ThemeProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SignOut, Sun, Moon, House } from '@phosphor-icons/react'

export function AdminHeader() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <header
      className="sticky top-0 z-20 backdrop-blur-sm border-b border-[var(--border-default)]"
      style={{ backgroundColor: theme === 'dark' ? 'rgba(13,16,21,0.95)' : 'rgba(255,255,255,0.95)' }}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--text-primary)]">ATTIC &amp; KELLER</h1>
          <span className="text-[10px] text-[var(--color-ak-cal)] bg-[var(--color-ak-rust)] px-2 py-0.5 rounded font-medium uppercase tracking-wider">Admin</span>
          <Link
            href="/host"
            className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--color-ak-rust)] transition-colors duration-200"
          >
            <House size={16} className="sm:hidden" />
            <span className="hidden sm:inline">Piso</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-ak-dorado)] hover:bg-[var(--bg-hover)] transition-all duration-200 active:scale-[0.95]"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} weight="duotone" /> : <Moon size={18} weight="duotone" />}
          </button>
          <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--color-ak-rust)] transition-colors active:scale-[0.97]"
            style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
          >
            <SignOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}