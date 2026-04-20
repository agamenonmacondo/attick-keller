'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle, user, isAdmin } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  if (user) {
    router.replace(isAdmin ? '/admin' : '/perfil')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (resetMode) {
      try {
        const res = await fetch('/api/auth', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (res.ok) {
          setResetSent(true)
        } else {
          setError('Error al enviar el enlace')
        }
      } catch {
        setError('Error de conexion')
      }
      setLoading(false)
      return
    }

    const { error: err } = await signInWithEmail(email, password)
    if (err) setError(err)
    else {
      try {
        const res = await fetch('/api/auth/role')
        if (res.ok) {
          const { role } = await res.json()
          router.push(role === 'store_admin' || role === 'super_admin' ? '/admin' : '/perfil')
        } else {
          router.push('/perfil')
        }
      } catch {
        router.push('/perfil')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="font-['Playfair_Display'] text-3xl font-bold text-[#3E2723] text-center mb-2">
          {resetMode ? 'Recuperar Contrasena' : 'Iniciar Sesion'}
        </h1>
        <p className="text-center mb-6">
          <Link href="/" className="text-sm text-[#8D6E63] hover:text-[#6B2737] transition-colors">
            &larr; Volver al inicio
          </Link>
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {resetSent ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-50 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round"><path d="M2.5 12L9.5 19L21.5 5" /></svg>
            </div>
            <p className="text-[#3E2723] font-medium mb-2">Enlace enviado</p>
            <p className="text-sm text-[#8D6E63]">Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena.</p>
            <button onClick={() => { setResetMode(false); setResetSent(false) }}
              className="mt-4 text-sm text-[#6B2737] font-semibold hover:underline">
              Volver a iniciar sesion
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3E2723] mb-1">Correo</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-4 py-3 rounded-lg border border-[#D7CCC8] focus:border-[#6B2737] focus:ring-1 focus:ring-[#6B2737] outline-none" />
              </div>
              {!resetMode && (
                <div>
                  <label className="block text-sm font-medium text-[#3E2723] mb-1">Contrasena</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full px-4 py-3 rounded-lg border border-[#D7CCC8] focus:border-[#6B2737] focus:ring-1 focus:ring-[#6B2737] outline-none" />
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-[#6B2737] text-white rounded-lg font-semibold hover:bg-[#8B3747] transition-colors disabled:opacity-50">
                {loading ? 'Cargando...' : resetMode ? 'Enviar enlace' : 'Iniciar Sesion'}
              </button>
            </form>

            {!resetMode && (
              <>
                <div className="my-6 flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#D7CCC8]" />
                  <span className="text-sm text-[#8D6E63]">o</span>
                  <div className="flex-1 h-px bg-[#D7CCC8]" />
                </div>

                <button onClick={() => signInWithGoogle()}
                  className="w-full py-3 border border-[#D7CCC8] rounded-lg font-medium hover:bg-[#EFEBE9] transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continuar con Google
                </button>
              </>
            )}

            <div className="mt-4 text-center space-y-2">
              {!resetMode && (
                <button onClick={() => setResetMode(true)}
                  className="text-sm text-[#6B2737] font-semibold hover:underline block w-full">
                  Olvidaste tu contrasena?
                </button>
              )}
              {resetMode && (
                <button onClick={() => setResetMode(false)}
                  className="text-sm text-[#6B2737] font-semibold hover:underline block w-full">
                  Volver a iniciar sesion
                </button>
              )}
              <p className="text-sm text-[#8D6E63]">
                No tienes cuenta?{' '}
                <Link href="/auth/signup" className="text-[#6B2737] font-semibold hover:underline">
                  Crear cuenta
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}