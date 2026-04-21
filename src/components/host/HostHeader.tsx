'use client'

import { useAuth } from '@/lib/auth/auth-provider'
import Link from 'next/link'
import { SignOut, Clock } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'

export function HostHeader() {
  const { signOut, isAdmin } = useAuth()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  return (
    <header className="bg-[#3E2723] text-[#F5EDE0] px-4 md:px-6 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-['Playfair_Display'] text-lg md:text-xl font-bold">Attick & Keller</h1>
          <span className="hidden sm:inline-block px-2.5 py-1 text-xs font-medium bg-[#5C7A4D]/30 text-[#8FBF6A] rounded-full border border-[#5C7A4D]/40">
            Host
          </span>
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden sm:inline text-xs text-[#8D6E63] hover:text-white transition-colors duration-200"
            >
              Panel
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 text-[#D7CCC8]">
            <Clock size={18} />
            <span className="font-mono text-base md:text-lg font-bold text-[#F5EDE0]">{timeStr}</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-[#D7CCC8] hover:text-white transition-colors"
          >
            <SignOut size={18} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}