'use client'

import { useAuth } from '@/lib/auth/auth-provider'
import { useTheme } from '@/lib/ThemeProvider'
import Link from 'next/link'
import { SignOut, Clock, Sun, Moon, Gear } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'

export function HostHeader() {
  const { signOut, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  return (
    <header className="sticky top-0 z-20 bg-[var(--color-ak-madera)]/95 dark:bg-[var(--color-ak-madera-light)]/30 backdrop-blur-sm border-b border-[var(--border-default)]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-ak-dorado)]">Attick & Keller</h1>
          <span className="text-[10px] text-[var(--text-primary)] bg-[var(--color-ak-madera)]/60 dark:bg-[var(--color-ak-madera-light)]/20 px-2 py-0.5 rounded font-medium uppercase tracking-wider">
            Host
          </span>
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200"
            >
              <Gear size={16} className="sm:hidden" />
              <span className="hidden sm:inline">Panel</span>
            </Link>
          )}
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
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Clock size={16} />
            <span className="font-mono text-sm font-bold text-[var(--color-ak-dorado)]">{timeStr}</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-[0.97]"
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