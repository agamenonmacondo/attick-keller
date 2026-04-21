'use client'

import { useState } from 'react'
import { X, Spinner } from '@phosphor-icons/react'

interface Zone {
  id: string
  name: string
  tables: Array<{ id: string; number: string; capacity: number }>
}

interface HostWalkInFormProps {
  zones: Zone[]
  onClose: () => void
  onCreated: () => void
}

export function HostWalkInForm({ zones, onClose, onCreated }: HostWalkInFormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [zoneId, setZoneId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || partySize < 1) return

    setSubmitting(true)
    setError(null)

    try {
      const now = new Date()
      const timeStart = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      // Default end time: 2 hours later
      const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      const timeEnd = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`
      const date = now.toISOString().split('T')[0]

      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time_start: timeStart,
          time_end: timeEnd,
          party_size: partySize,
          customer_name: name.trim(),
          customer_phone: phone.trim() || undefined,
          zone_id: zoneId || undefined,
          source: 'presencial',
        }),
      })

      if (res.ok) {
        onCreated()
        onClose()
      } else {
        const data = await res.json()
        setError(data.error || 'Error al crear reserva')
      }
    } catch {
      setError('Error de conexion')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#F5EDE0] rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#3E2723]">Walk-in</h2>
          <button onClick={onClose} className="p-1 text-[#8D6E63] hover:text-[#3E2723] transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-[#D7CCC8] bg-white text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6B2737]/30"
              placeholder="Nombre del cliente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">Telefono</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#D7CCC8] bg-white text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6B2737]/30"
              placeholder="+57 ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">Personas *</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                className="w-10 h-10 rounded-lg border border-[#D7CCC8] bg-white text-[#3E2723] font-bold flex items-center justify-center hover:bg-[#EFEBE9] transition-colors"
              >
                -
              </button>
              <span className="text-xl font-bold text-[#3E2723] min-w-[2rem] text-center">{partySize}</span>
              <button
                type="button"
                onClick={() => setPartySize(partySize + 1)}
                className="w-10 h-10 rounded-lg border border-[#D7CCC8] bg-white text-[#3E2723] font-bold flex items-center justify-center hover:bg-[#EFEBE9] transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">Zona (opcional)</label>
            <select
              value={zoneId}
              onChange={e => setZoneId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#D7CCC8] bg-white text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6B2737]/30"
            >
              <option value="">Sin zona</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full py-3 rounded-xl bg-[#6B2737] text-white font-medium hover:bg-[#5C2230] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-all"
          >
            {submitting ? 'Creando...' : 'Crear Walk-in'}
          </button>
        </form>
      </div>
    </div>
  )
}