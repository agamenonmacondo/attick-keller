'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  CalendarBlank,
  Users,
  Clock,
  CaretLeft,
  CaretRight,
  Sun,
  MoonStars,
  Phone,
  NotePencil,
  CheckCircle,
  WarningCircle,
  Spinner,
  ForkKnife,
} from '@phosphor-icons/react'

export default function ReservarPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [date, setDate] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [timeSlot, setTimeSlot] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<Record<string, boolean> | null>(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  if (authLoading) return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <Spinner size={32} className="animate-spin text-[var(--color-ak-borgona)]" />
    </div>
  )
  if (!user) return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <Spinner size={32} className="animate-spin text-[var(--color-ak-borgona)]" />
    </div>
  )

  const timeSlots = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
  ]

  // Separate lunch and dinner slots
  const almuerzoSlots = timeSlots.filter(t => t <= '14:30')
  const cenaSlots = timeSlots.filter(t => t >= '18:00')

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const [hours, minutes] = timeSlot.split(':').map(Number)
      const start = timeSlot
      const endHours = hours + 2
      const end = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time_start: start,
          time_end: end,
          party_size: partySize,
          special_requests: specialRequests,
          customer_phone: phone || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear reserva')
      }
      router.push('/reservar/confirmado')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Fetch availability when date or party size changes ──
  useEffect(() => {
    if (!date || !partySize) {
      setAvailableSlots(null)
      return
    }

    let cancelled = false
    setLoadingAvailability(true)
    setAvailableSlots(null)
    setTimeSlot('')

    fetch(`/api/availability?date=${date}&party_size=${partySize}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        if (data.slots) {
          const slotMap: Record<string, boolean> = {}
          for (const slot of data.slots) {
            slotMap[slot.time] = slot.available
          }
          setAvailableSlots(slotMap)
        }
      })
      .catch(() => {
        if (!cancelled) setAvailableSlots(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailability(false)
      })

    return () => { cancelled = true }
  }, [date, partySize])

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Render time slot section
  const renderTimeSlots = (slots: string[], icon: React.ReactNode, label: string) => {
    if (availableSlots !== null && !slots.some(t => availableSlots.hasOwnProperty(t))) return null
    const filteredSlots = availableSlots !== null
      ? slots.filter(t => availableSlots.hasOwnProperty(t))
      : slots
    if (filteredSlots.length === 0) return null

    return (
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {filteredSlots.map(t => {
            const isAvailable = availableSlots === null || availableSlots[t]
            const isSelected = timeSlot === t
            return (
              <button
                key={t}
                onClick={() => isAvailable && setTimeSlot(t)}
                disabled={!isAvailable}
                className={cn(
                  'py-2.5 rounded-lg text-sm font-medium transition-all border',
                  isSelected
                    ? 'bg-[var(--color-ak-borgona)] text-white border-[var(--color-ak-borgona)] shadow-sm'
                    : isAvailable
                      ? 'bg-[var(--bg-input)] text-[var(--color-ak-madera)] border-[var(--border-default)] hover:border-[var(--color-ak-borgona)] hover:bg-[var(--color-ak-borgona)]/5'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)]/40 border-transparent cursor-not-allowed line-through'
                )}
              >
                {t}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pt-24 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-ak-borgona)]/10 mb-4">
            <ForkKnife size={32} weight="duotone" className="text-[var(--color-ak-borgona)]" />
          </div>
          <h1 className="font-['Playfair_Display'] text-4xl font-bold text-[var(--color-ak-madera)] mb-1">
            Reservar Mesa
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Seleccione fecha, hora y confirme su reserva
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => s < step && setStep(s)}
                disabled={s >= step}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full transition-all',
                  step >= s
                    ? 'text-white bg-[var(--color-ak-borgona)]'
                    : 'text-[var(--text-secondary)] bg-[var(--bg-input)] border border-[var(--border-default)]'
                )}
              >
                {step > s ? (
                  <CheckCircle size={18} weight="fill" />
                ) : (
                  <span className="text-sm font-bold">{s}</span>
                )}
                <span className="text-sm font-medium hidden sm:inline">
                  {s === 1 ? 'Detalles' : 'Confirmar'}
                </span>
              </button>
              {s < 2 && (
                <div className={cn(
                  'w-8 h-0.5 mx-1 transition-colors',
                  step > s ? 'bg-[var(--color-ak-borgona)]' : 'bg-[var(--border-default)]'
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4">
            <WarningCircle size={20} weight="fill" className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Error al reservar</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Date, Party Size & Time */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl border border-[var(--border-default)] overflow-hidden">
            {/* Card header */}
            <div className="bg-[var(--color-ak-borgona)]/5 border-b border-[var(--border-default)] px-6 py-4">
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-ak-madera)]">
                ¿Cuándo y cuántos?
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Elija la fecha, el número de comensales y la hora deseada
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Date */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ak-madera)] mb-2">
                  <CalendarBlank size={16} weight="duotone" className="text-[var(--color-ak-borgona)]" />
                  Fecha
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    min={minDate}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:ring-2 focus:ring-[var(--color-ak-borgona)]/20 outline-none transition-all"
                  />
                  {date && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-xs text-[var(--color-ak-dorado)] font-medium">
                        {formatDate(date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Party Size */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ak-madera)] mb-2">
                  <Users size={16} weight="duotone" className="text-[var(--color-ak-borgona)]" />
                  Número de personas
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPartySize(Math.max(1, partySize - 1))}
                    disabled={partySize <= 1}
                    className="w-10 h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] flex items-center justify-center text-[var(--color-ak-madera)] hover:bg-[var(--color-ak-borgona)]/10 hover:border-[var(--color-ak-borgona)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <CaretLeft size={16} weight="bold" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="font-['Playfair_Display'] text-3xl font-bold text-[var(--color-ak-madera)]">
                      {partySize}
                    </span>
                    <span className="block text-xs text-[var(--text-secondary)] mt-0.5">
                      {partySize === 1 ? 'persona' : 'personas'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPartySize(Math.min(50, partySize + 1))}
                    disabled={partySize >= 50}
                    className="w-10 h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] flex items-center justify-center text-[var(--color-ak-madera)] hover:bg-[var(--color-ak-borgona)]/10 hover:border-[var(--color-ak-borgona)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <CaretRight size={16} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ak-madera)] mb-3">
                  <Clock size={16} weight="duotone" className="text-[var(--color-ak-borgona)]" />
                  Hora
                </label>
                {loadingAvailability && (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <Spinner size={20} className="animate-spin text-[var(--color-ak-borgona)]" />
                    <span className="text-sm text-[var(--text-secondary)]">
                      Verificando disponibilidad...
                    </span>
                  </div>
                )}
                {!loadingAvailability && availableSlots !== null && Object.keys(availableSlots).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <WarningCircle size={32} weight="duotone" className="text-[var(--color-ak-madera)]/40 mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      No hay disponibilidad para esta fecha
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Intente con otra fecha o un grupo menor
                    </p>
                  </div>
                )}
                {!loadingAvailability && (availableSlots === null || Object.keys(availableSlots).length > 0) && (
                  <div className="space-y-4">
                    {renderTimeSlots(
                      almuerzoSlots,
                      <Sun size={14} weight="fill" className="text-[var(--color-ak-dorado)]" />,
                      'Almuerzo'
                    )}
                    {renderTimeSlots(
                      cenaSlots,
                      <MoonStars size={14} weight="fill" className="text-[var(--color-ak-oliva)]" />,
                      'Cena'
                    )}
                  </div>
                )}
              </div>

              {/* Next button */}
              <button
                onClick={() => date && timeSlot && setStep(2)}
                disabled={!date || !timeSlot || loadingAvailability || (availableSlots !== null && !availableSlots[timeSlot])}
                className="w-full py-3.5 bg-[var(--color-ak-borgona)] text-white rounded-xl font-semibold hover:bg-[var(--color-ak-borgona)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Siguiente
                <CaretRight size={16} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm + Phone + Notes */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl border border-[var(--border-default)] overflow-hidden">
            {/* Card header */}
            <div className="bg-[var(--color-ak-borgona)]/5 border-b border-[var(--border-default)] px-6 py-4">
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-ak-madera)]">
                Confirmar reserva
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Revise los detalles y complete su informacion
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Summary card */}
              <div className="rounded-xl bg-[var(--color-ak-borgona)]/5 border border-[var(--color-ak-borgona)]/20 p-4 space-y-2.5">
                <div className="flex items-center gap-3">
                  <CalendarBlank size={18} weight="duotone" className="text-[var(--color-ak-borgona)] shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Fecha</p>
                    <p className="text-sm font-semibold text-[var(--color-ak-madera)]">{formatDate(date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={18} weight="duotone" className="text-[var(--color-ak-borgona)] shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Hora</p>
                    <p className="text-sm font-semibold text-[var(--color-ak-madera)]">{timeSlot}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={18} weight="duotone" className="text-[var(--color-ak-borgona)] shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Personas</p>
                    <p className="text-sm font-semibold text-[var(--color-ak-madera)]">
                      {partySize} {partySize === 1 ? 'persona' : 'personas'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ak-madera)] mb-2">
                  <Phone size={16} weight="duotone" className="text-[var(--color-ak-borgona)]" />
                  Telefono de contacto
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:ring-2 focus:ring-[var(--color-ak-borgona)]/20 outline-none transition-all"
                  placeholder="+57 300 123 4567"
                />
              </div>

              {/* Special requests */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ak-madera)] mb-2">
                  <NotePencil size={16} weight="duotone" className="text-[var(--color-ak-borgona)]" />
                  Peticiones especiales
                  <span className="text-xs font-normal text-[var(--text-secondary)]">(opcional)</span>
                </label>
                <textarea
                  value={specialRequests}
                  onChange={e => setSpecialRequests(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:ring-2 focus:ring-[var(--color-ak-borgona)]/20 outline-none transition-all resize-none"
                  placeholder="Alergias, cumpleanos, preferencias de mesa..."
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 border border-[var(--border-default)] rounded-xl font-medium text-[var(--color-ak-madera)] hover:bg-[var(--bg-input)] transition-all flex items-center justify-center gap-1.5"
                >
                  <CaretLeft size={16} weight="bold" />
                  Atras
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-[2] py-3.5 bg-[var(--color-ak-borgona)] text-white rounded-xl font-semibold hover:bg-[var(--color-ak-borgona)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Spinner size={18} className="animate-spin" />
                      Reservando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} weight="duotone" />
                      Confirmar Reserva
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}