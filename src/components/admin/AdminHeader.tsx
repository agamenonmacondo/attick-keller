'use client'

import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SignOut } from '@phosphor-icons/react'

export function AdminHeader() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <header className="sticky top-0 z-20 bg-[#3E2723]/95 backdrop-blur-sm border-b border-[#5D4037]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-['Playfair_Display'] text-xl font-bold text-[#C9A94E]">Attick & Keller</h1>
          <span className="text-[10px] text-[#D7CCC8] bg-[#5D4037] px-2 py-0.5 rounded font-medium uppercase tracking-wider">Admin</span>
          <Link
            href="/host"
            className="hidden sm:inline text-xs text-[#8D6E63] hover:text-[#D7CCC8] transition-colors duration-200"
          >
            Piso
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#8D6E63] hidden sm:inline">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-[#8D6E63] hover:text-[#D7CCC8] transition-colors active:scale-[0.97]"
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