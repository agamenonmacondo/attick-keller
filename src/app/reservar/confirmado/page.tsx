'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  SealCheck,
  CalendarDots,
  Clock,
  Users,
  Note,
  Phone,
  House,
  ListBullets,
} from '@phosphor-icons/react'

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--border-light)] last:border-b-0">
      <span className="text-[var(--color-ak-borgona)] mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
        <p className="text-[var(--text-primary)] font-semibold">{value}</p>
      </div>
    </div>
  )
}

function ConfirmadoContent() {
  const searchParams = useSearchParams()

  const date = searchParams.get('date') ?? ''
  const time = searchParams.get('time') ?? ''
  const partySize = searchParams.get('party_size') ?? ''
  const phone = searchParams.get('phone') ?? ''
  const specialRequests = searchParams.get('special_requests') ?? ''

  const hasDetails = date || time || partySize

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr + 'T00:00:00')
      return d.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatPartySize = (size: string) => {
    const n = parseInt(size, 10)
    if (isNaN(n) || n < 1) return size
    return `${n} ${n === 1 ? 'persona' : 'personas'}`
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Success icon */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--color-success)]/10 mb-5">
            <SealCheck size={44} weight="fill" className="text-[var(--color-success)]" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--color-ak-madera)] mb-2">
            Reserva Confirmada
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            {hasDetails
              ? 'Tu mesa ha sido reservada exitosamente.'
              : 'Tu reserva ha sido creada exitosamente.'}
          </p>
        </div>

        {/* Reservation details card */}
        {hasDetails && (
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-[var(--shadow-md)] p-6 mb-6 animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-4">
              <ListBullets size={18} weight="bold" className="text-[var(--color-ak-borgona)]" />
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-ak-madera)]">
                Detalles de la Reserva
              </h2>
            </div>

            {date && (
              <DetailRow
                icon={<CalendarDots size={20} weight="duotone" />}
                label="Fecha"
                value={formatDate(date)}
              />
            )}
            {time && (
              <DetailRow
                icon={<Clock size={20} weight="duotone" />}
                label="Hora"
                value={time}
              />
            )}
            {partySize && (
              <DetailRow
                icon={<Users size={20} weight="duotone" />}
                label="Personas"
                value={formatPartySize(partySize)}
              />
            )}
            {phone && (
              <DetailRow
                icon={<Phone size={20} weight="duotone" />}
                label="Telefono"
                value={phone}
              />
            )}
            {specialRequests && (
              <DetailRow
                icon={<Note size={20} weight="duotone" />}
                label="Peticiones especiales"
                value={specialRequests}
              />
            )}
          </div>
        )}

        {/* Note */}
        <p className="text-center text-sm text-[var(--text-muted)] mb-8 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          Recibiras confirmacion por correo o mensaje de texto.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <Link
            href="/perfil"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--color-ak-borgona)] text-[var(--color-ak-cal)] rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            <ListBullets size={18} />
            Ver Mis Reservas
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 border border-[var(--border-default)] rounded-full font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors"
          >
            <House size={18} />
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmadoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmadoContent />
    </Suspense>
  )
}