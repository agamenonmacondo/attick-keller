'use client'

import { useAuth } from '@/lib/auth/auth-provider'
import { useTheme } from '@/lib/ThemeProvider'
import Link from 'next/link'
import { SignOut, Clock, Sun, Moon } from '@phosphor-icons/react'
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
    <header className="bg-[var(--color-ak-madera)] text-[var(--bg-primary)] px-4 md:px-6 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-['Playfair_Display'] text-lg md:text-xl font-bold">Attick & Keller</h1>
          <span className="hidden sm:inline-block px-2.5 py-1 text-xs font-medium bg-[var(--color-ak-oliva)]/30 text-[var(--color-ak-oliva)] rounded-full border border-[var(--color-ak-oliva)]/40">
            Host
          </span>
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden sm:inline text-xs text-[var(--text-secondary)] hover:text-white transition-colors duration-200"
            >
              Panel
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center h-8 w-8 rounded-full border border-[var(--border-light)]/40 text-[var(--bg-primary)] hover:bg-[var(--bg-primary)]/10 active:scale-[0.97]"
            style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} weight="fill" /> : <Moon size={18} weight="fill" />}
          </button>
          <div className="flex items-center gap-2 text-[var(--border-default)]">
            <Clock size={18} />
            <span className="font-mono text-base md:text-lg font-bold text-[var(--bg-primary)]">{timeStr}</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-[var(--border-default)] hover:text-white transition-colors"
          >
            <SignOut size={18} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}