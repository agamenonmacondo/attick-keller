'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { Phone, Envelope, ArrowLeft, Check } from '@phosphor-icons/react'

type Step = 'method' | 'phone-input' | 'phone-verify' | 'email-input' | 'success'

export default function LoginClient() {
  const { signInWithPhone, verifyOTP, signInWithEmail, signInWithGoogle, signInWithFacebook } = useAuth()
  const [step, setStep] = useState<Step>('method')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSendOTP = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await signInWithPhone(phone)
    if (err) setError(err)
    else setStep('phone-verify')
    setLoading(false)
  }

  const handleVerifyOTP = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await verifyOTP(phone, otp)
    if (err) setError(err)
    else setStep('success')
    setLoading(false)
  }

  const handleEmailLogin = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await signInWithEmail(email, password)
    if (err) setError(err)
    else setStep('success')
    setLoading(false)
  }

  const wine = '#6B2737'
  const cream = '#F5EDE0'
  const charcoal = '#1E1E1E'
  const amber = '#D4922A'

  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ backgroundColor: cream }}>
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl tracking-tighter" style={{ fontFamily: '"Playfair Display", Georgia, serif', color: wine }}>
            Attick &amp; Keller
          </h1>
          <p className="mt-2 text-sm tracking-widest uppercase" style={{ color: amber }}>
            Wine and Beer Playground
          </p>
        </div>

        {/* Method Selection */}
        {step === 'method' && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-center" style={{ color: charcoal }}>
              Iniciar sesión
            </h2>
            <p className="text-sm text-center" style={{ color: '#8B5E3C' }}>
              Elige cómo quieres acceder
            </p>

            <button
              onClick={() => setStep('phone-input')}
              className="w-full flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
              style={{ borderColor: wine, color: wine }}
            >
              <Phone size={24} />
              <div className="text-left">
                <div className="font-medium">WhatsApp / SMS</div>
                <div className="text-xs opacity-70">Código de verificación</div>
              </div>
            </button>

            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
              style={{ borderColor: '#4285F4', color: '#4285F4' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <div className="text-left">
                <div className="font-medium">Continuar con Google</div>
              </div>
            </button>
          </div>
        )}

        {/* Phone Input */}
        {step === 'phone-input' && (
          <div className="space-y-4">
            <button onClick={() => setStep('method')} className="flex items-center gap-2 text-sm" style={{ color: '#8B5E3C' }}>
              <ArrowLeft size={16} /> Volver
            </button>
            <h2 className="text-xl font-medium" style={{ color: charcoal }}>Ingresa tu teléfono</h2>
            <p className="text-sm" style={{ color: '#8B5E3C' }}>Te enviaremos un código de verificación</p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+57 310 577 2708"
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all"
              style={{ borderColor: wine + '40', color: charcoal }}
              onFocus={(e) => e.currentTarget.style.borderColor = wine}
              onBlur={(e) => e.currentTarget.style.borderColor = wine + '40'}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleSendOTP}
              disabled={loading || !phone}
              className="w-full py-4 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 active:scale-[0.97]"
              style={{ backgroundColor: wine }}
            >
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
          </div>
        )}

        {/* OTP Verification */}
        {step === 'phone-verify' && (
          <div className="space-y-4">
            <button onClick={() => setStep('phone-input')} className="flex items-center gap-2 text-sm" style={{ color: '#8B5E3C' }}>
              <ArrowLeft size={16} /> Volver
            </button>
            <h2 className="text-xl font-medium" style={{ color: charcoal }}>Verifica tu código</h2>
            <p className="text-sm" style={{ color: '#8B5E3C' }}>Ingresa el código enviado a {phone}</p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl border-2 text-center text-2xl tracking-widest focus:outline-none transition-all"
              style={{ borderColor: wine + '40', color: charcoal }}
              onFocus={(e) => e.currentTarget.style.borderColor = wine}
              onBlur={(e) => e.currentTarget.style.borderColor = wine + '40'}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full py-4 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 active:scale-[0.97]"
              style={{ backgroundColor: wine }}
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        )}

        {/* Email Login */}
        {step === 'email-input' && (
          <div className="space-y-4">
            <button onClick={() => setStep('method')} className="flex items-center gap-2 text-sm" style={{ color: '#8B5E3C' }}>
              <ArrowLeft size={16} /> Volver
            </button>
            <h2 className="text-xl font-medium" style={{ color: charcoal }}>Iniciar sesión</h2>
            <p className="text-sm" style={{ color: '#8B5E3C' }}>Para administradores del restaurante</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@attickkeller.com"
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all"
              style={{ borderColor: charcoal + '30', color: charcoal }}
              onFocus={(e) => e.currentTarget.style.borderColor = charcoal}
              onBlur={(e) => e.currentTarget.style.borderColor = charcoal + '30'}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all"
              style={{ borderColor: charcoal + '30', color: charcoal }}
              onFocus={(e) => e.currentTarget.style.borderColor = charcoal}
              onBlur={(e) => e.currentTarget.style.borderColor = charcoal + '30'}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleEmailLogin}
              disabled={loading || !email || !password}
              className="w-full py-4 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 active:scale-[0.97]"
              style={{ backgroundColor: charcoal }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#5C7A4D' }}>
              <Check size={32} color="white" weight="bold" />
            </div>
            <h2 className="text-xl font-medium" style={{ color: charcoal }}>¡Bienvenido!</h2>
            <p className="text-sm" style={{ color: '#8B5E3C' }}>Redirigiendo...</p>
          </div>
        )}

        <div className="mt-8 text-center text-xs" style={{ color: '#8B5E3C' }}>
          Al continuar, aceptas nuestros términos de servicio y política de privacidad
        </div>
      </div>
    </div>
  )
}