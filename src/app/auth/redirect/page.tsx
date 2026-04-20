'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@phosphor-icons/react'

export default function AuthRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/role')
      .then(res => res.ok ? res.json() : { role: null })
      .then(({ role }) => {
        const admin = role === 'store_admin' || role === 'super_admin'
        router.replace(admin ? '/admin' : '/perfil')
      })
      .catch(() => router.replace('/perfil'))
  }, [router])

  return (
    <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center">
      <div className="text-center">
        <Spinner size={32} className="animate-spin text-[#8D6E63] mx-auto" />
        <p className="mt-3 text-sm text-[#8D6E63]">Redirigiendo...</p>
      </div>
    </div>
  )
}