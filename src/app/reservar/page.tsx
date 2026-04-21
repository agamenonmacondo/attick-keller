'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface Zone {
  id: string
  name: string
}

export default function ReservarPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [date, setDate] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [timeSlot, setTimeSlot] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [zones, setZones] = useState<Zone[]>([])
  const [specialRequests, setSpecialRequests] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/zones')
      .then(r => r.json())
      .then(data => setZones(data.zones || []))
      .catch(() => {})
  }, [])

  if (authLoading) return <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center">Cargando...</div>
  if (!user) return <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center">Cargando...</div>

  const timeSlots = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
  ]

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
          zone_id: zoneId,
          special_requests: specialRequests,
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

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-[#F5EDE0] pt-24 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="font-['Playfair_Display'] text-4xl font-bold text-[#3E2723] text-center mb-8">
          Reservar Mesa
        </h1>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                step >= s ? 'bg-[#6B2737] text-white' : 'bg-[#D7CCC8] text-[#8D6E63]'
              )}>
                {s}
              </div>
              {s < 3 && <div className={cn('w-12 h-0.5', step > s ? 'bg-[#6B2737]' : 'bg-[#D7CCC8]')} />}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        {/* Step 1: Date & Party */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h2 className="text-xl font-semibold text-[#3E2723]">¿Cuándo y cuántos?</h2>
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={minDate}
                required
                className="w-full px-4 py-3 rounded-lg border border-[#D7CCC8] focus:border-[#6B2737] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-1">Número de personas</label>
              <select
                value={partySize}
                onChange={e => setPartySize(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border border-[#D7CCC8] focus:border-[#6B2737] outline-none"
              >
                {[1,2,3,4,5,6,7,8].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => date && setStep(2)}
              disabled={!date}
              className="w-full py-3 bg-[#6B2737] text-white rounded-lg font-semibold hover:bg-[#8B3747] transition-colors disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}

        {/* Step 2: Time & Zone */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h2 className="text-xl font-semibold text-[#3E2723]">Hora y zona</h2>
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-2">Hora</label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeSlot(t)}
                    className={cn(
                      'py-2 rounded-lg text-sm font-medium transition-all',
                      timeSlot === t
                        ? 'bg-[#6B2737] text-white'
                        : 'bg-[#EFEBE9] text-[#3E2723] hover:bg-[#D7CCC8]'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-2">Zona</label>
              <div className="grid grid-cols-3 gap-2">
                {zones.map(z => (
                  <button
                    key={z.id}
                    onClick={() => setZoneId(z.id)}
                    className={cn(
                      'py-3 rounded-lg text-sm font-medium transition-all',
                      zoneId === z.id
                        ? 'bg-[#6B2737] text-white'
                        : 'bg-[#EFEBE9] text-[#3E2723] hover:bg-[#D7CCC8]'
                    )}
                  >
                    {z.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-[#D7CCC8] rounded-lg font-medium hover:bg-[#EFEBE9] transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={() => timeSlot && zoneId && setStep(3)}
                disabled={!timeSlot || !zoneId}
                className="flex-1 py-3 bg-[#6B2737] text-white rounded-lg font-semibold hover:bg-[#8B3747] transition-colors disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h2 className="text-xl font-semibold text-[#3E2723]">Confirmar reserva</h2>
            <div className="space-y-3 text-[#3E2723]">
              <p><span className="font-medium">Fecha:</span> {date}</p>
              <p><span className="font-medium">Hora:</span> {timeSlot}</p>
              <p><span className="font-medium">Personas:</span> {partySize}</p>
              <p><span className="font-medium">Zona:</span> {zones.find(z => z.id === zoneId)?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-1">Peticiones especiales (opcional)</label>
              <textarea
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-[#D7CCC8] focus:border-[#6B2737] outline-none"
                placeholder="Alergias, cumpleaños, etc."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-[#D7CCC8] rounded-lg font-medium hover:bg-[#EFEBE9] transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-[#6B2737] text-white rounded-lg font-semibold hover:bg-[#8B3747] transition-colors disabled:opacity-50"
              >
                {submitting ? 'Reservando...' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}