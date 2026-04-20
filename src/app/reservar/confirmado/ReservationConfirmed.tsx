'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Calendar, Clock, Users, MapPin, Wine, ArrowRight } from '@phosphor-icons/react'

interface ReservationDetail {
  id: string
  date: string
  time_start: string
  time_end: string
  party_size: number
  status: string
  special_requests: string | null
  table_zones?: { name: string }[] | null
  customer?: { full_name: string; phone: string; email: string }
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No asistio',
}

function ReservationConfirmedInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [reservation, setReservation] = useState<ReservationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('id')
    if (!id) {
      setError('No se encontró la reserva.')
      setLoading(false)
      return
    }

    fetch(`/api/reservations/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => {
        if (data.reservation) {
          setReservation(data.reservation)
        } else {
          setError(data.error || 'No se pudo cargar la reserva.')
        }
      })
      .catch(() => setError('Error de conexión.'))
      .finally(() => setLoading(false))
  }, [searchParams])

  const whatsappNumber = process.env.NEXT_PUBLIC_RESTAURANT_PHONE ?? '+573105772708'

  const buildWhatsAppLink = () => {
    if (!reservation) return '#'
    const msg = `Hola, quiero confirmar mi reserva:\n\nNombre: ${reservation.customer?.full_name || ''}\nFecha: ${reservation.date}\nHora: ${reservation.time_start}\nPersonas: ${reservation.party_size}\n${reservation.special_requests ? `Notas: ${reservation.special_requests}` : ''}`
    return `https://wa.me/${whatsappNumber.replace('+', '')}?text=${encodeURIComponent(msg)}`
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ak-wine border-t-transparent" />
        </div>
        <p className="text-ak-charcoal/60">Cargando tu reserva...</p>
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="rounded-2xl border border-ak-wine/20 bg-white p-8">
          <p className="text-ak-wine font-medium">{error || 'No se pudo cargar la reserva.'}</p>
          <button
            onClick={() => router.push('/reservar')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ak-wine px-6 py-3 text-sm font-semibold text-ak-cream transition-colors hover:bg-ak-wine-light"
          >
            Hacer una reserva
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Success icon */}
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-ak-olive/10">
          <CheckCircle size={32} className="text-ak-olive" weight="fill" />
        </div>
        <h1 className="font-[Playfair_Display] text-3xl tracking-tight text-ak-charcoal">
          Reserva Registrada
        </h1>
        <p className="mt-1 text-sm text-ak-charcoal/60">
          Te enviamos un email de confirmación.
        </p>
      </div>

      {/* Reservation details card */}
      <div className="rounded-2xl border border-ak-charcoal/5 bg-white p-6 space-y-3">
        {[
          { label: 'Nombre', value: reservation.customer?.full_name || '' },
          { label: 'Fecha', value: formatDate(reservation.date) },
          { label: 'Hora', value: `${formatTime(reservation.time_start)} - ${formatTime(reservation.time_end)}` },
          { label: 'Personas', value: `${reservation.party_size}` },
          ...(reservation.table_zones?.length ? [{ label: 'Zona', value: reservation.table_zones.map((t: { name: string }) => t.name).join(', ') }] : []),
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between border-b border-ak-charcoal/5 pb-2 last:border-0 last:pb-0"
          >
            <span className="text-sm text-ak-charcoal/60">{row.label}</span>
            <span className="text-sm font-semibold text-ak-charcoal">{row.value}</span>
          </div>
        ))}
        {reservation.special_requests && (
          <p className="text-sm text-ak-charcoal/60 italic">
            &ldquo;{reservation.special_requests}&rdquo;
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-ak-charcoal/40">Estado</span>
          <span className="text-xs font-semibold text-ak-olive">
            {statusLabels[reservation.status] || reservation.status}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <a
          href={buildWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="button-press flex w-full items-center justify-center gap-2 rounded-lg bg-ak-olive px-6 py-3 text-base font-semibold text-ak-cream transition-colors hover:bg-ak-olive/90"
        >
          <Wine size={20} weight="fill" />
          Confirmar por WhatsApp
        </a>
        <button
          onClick={() => router.push('/perfil')}
          className="button-press flex items-center gap-2 text-sm font-medium text-ak-wine hover:underline"
        >
          Ver mis reservas
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Placeholder for future payment integration */}
      <div className="mt-8 rounded-xl border border-dashed border-ak-charcoal/10 bg-ak-cream-light p-4 text-center">
        <p className="text-xs text-ak-charcoal/40">
          El pago en línea estará disponible próximamente.
        </p>
      </div>
    </div>
  )
}

export default function ReservationConfirmed() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ak-wine border-t-transparent" />
      </div>
    }>
      <ReservationConfirmedInner />
    </Suspense>
  )
}