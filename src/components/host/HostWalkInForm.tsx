'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Spinner, Check } from '@phosphor-icons/react'
import { getColombiaDate, getColombiaTime } from '@/lib/utils/date'
import { timeToMinutes } from '@/lib/utils/time'
import type { ReservationTimeline } from '@/lib/hooks/useHostOccupancy'

interface TableInfo {
  id: string
  number: string
  name_attick: string | null
  capacity: number
  zone_name: string | null
  reservations?: ReservationTimeline[]
}

interface Zone {
  id: string
  name: string
  tables: TableInfo[]
}

interface HostWalkInFormProps {
  zones: Zone[]
  onClose: () => void
  onCreated: () => void
}

/** Check if a table is free during the walk-in time window */
function isTableAvailable(
  reservations: ReservationTimeline[] | undefined,
  timeStart: string,
  timeEnd: string
): boolean {
  if (!reservations || reservations.length === 0) return true
  const startMins = timeToMinutes(timeStart)
  const endMins = timeToMinutes(timeEnd)
  return !reservations.some(r => {
    const rStart = timeToMinutes(r.time_start)
    const rEnd = timeToMinutes(r.time_end)
    return rStart < endMins && rEnd > startMins
  })
}

/** Compute "Libre hasta" — find the next reservation after our time window */
function getAvailableUntil(
  reservations: ReservationTimeline[] | undefined,
  timeEnd: string
): string | null {
  if (!reservations || reservations.length === 0) return null
  const endMins = timeToMinutes(timeEnd)
  const next = reservations
    .filter(r => timeToMinutes(r.time_start) >= endMins)
    .sort((a, b) => timeToMinutes(a.time_start) - timeToMinutes(b.time_start))[0]
  return next?.time_start ?? null
}

/** Score a table for sorting suggestions */
function scoreTable(table: TableInfo, partySize: number): number {
  const capacityFit = table.capacity >= partySize
    ? Math.min(100, (partySize / table.capacity) * 100)
    : 0
  return capacityFit
}

export function HostWalkInForm({ zones, onClose, onCreated }: HostWalkInFormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [zoneId, setZoneId] = useState('')
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Compute time range for walk-in
  const timeStart = useMemo(() => getColombiaTime(), [])
  const timeEnd = useMemo(() => {
    const [h, m] = timeStart.split(':').map(Number)
    const endH = h + 2
    return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }, [timeStart])

  // Compute available tables for this party size & time
  const availableTables = useMemo(() => {
    const filtered: Array<TableInfo & { availableUntil: string | null; zoneName: string; score: number }> = []

    for (const zone of zones) {
      // Skip zone filter if one is selected
      if (zoneId && zone.id !== zoneId) continue

      for (const table of zone.tables) {
        if (table.capacity < partySize) continue
        const reservations = table.reservations
        if (!isTableAvailable(reservations, timeStart, timeEnd)) continue

        const availableUntil = getAvailableUntil(reservations, timeEnd)
        filtered.push({
          ...table,
          zoneName: zone.name,
          availableUntil,
          score: scoreTable(table, partySize),
        })
      }
    }

    // Sort by score descending, then by capacity ascending
    filtered.sort((a, b) => b.score - a.score || a.capacity - b.capacity)
    return filtered
  }, [zones, partySize, zoneId, timeStart, timeEnd])

  // Auto-select best table when available tables change
  const bestTable = availableTables[0]
  useEffect(() => {
    if (bestTable && !selectedTableId) {
      setSelectedTableId(bestTable.id)
    }
    if (selectedTableId && !availableTables.find(t => t.id === selectedTableId)) {
      setSelectedTableId(null)
    }
  }, [bestTable?.id, availableTables, selectedTableId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || partySize < 1) return

    setSubmitting(true)
    setError(null)

    try {
      const date = getColombiaDate()

      const body: Record<string, unknown> = {
        date,
        time_start: timeStart,
        time_end: timeEnd,
        party_size: partySize,
        customer_name: name.trim(),
        customer_phone: phone.trim() || undefined,
        zone_id: zoneId || undefined,
        source: 'presencial',
      }

      if (selectedTableId) {
        body.table_id = selectedTableId
      }

      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
                onClick={() => { setPartySize(Math.max(1, partySize - 1)); setSelectedTableId(null) }}
                className="w-10 h-10 rounded-lg border border-[#D7CCC8] bg-white text-[#3E2723] font-bold flex items-center justify-center hover:bg-[#EFEBE9] transition-colors"
              >
                -
              </button>
              <span className="text-xl font-bold text-[#3E2723] min-w-[2rem] text-center">{partySize}</span>
              <button
                type="button"
                onClick={() => { setPartySize(partySize + 1); setSelectedTableId(null) }}
                className="w-10 h-10 rounded-lg border border-[#D7CCC8] bg-white text-[#3E2723] font-bold flex items-center justify-center hover:bg-[#EFEBE9] transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Available tables dropdown */}
          {partySize > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-1">
                Mesa sugerida
              </label>
              {availableTables.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#D7CCC8] p-3 text-center">
                  <p className="text-xs text-[#8D6E63]">No hay mesas disponibles para {partySize} personas en este horario</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {availableTables.map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTableId(t.id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                        selectedTableId === t.id
                          ? 'border-[#6B2737] bg-[#6B2737]/5 ring-1 ring-[#6B2737]'
                          : 'border-[#D7CCC8] bg-white hover:border-[#8D6E63]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-semibold text-[#3E2723]">
                            {t.name_attick || `Mesa ${t.number}`}
                          </span>
                          <span className="text-xs text-[#8D6E63]">· {t.zoneName}</span>
                          <span className="text-[10px] text-[#8D6E63] bg-[#F5EDE0] px-1.5 py-0.5 rounded-full">
                            {t.capacity}p
                          </span>
                          {i === 0 && (
                            <span className="text-[10px] font-medium text-[#D4922A]">
                              ★ Mejor opción
                            </span>
                          )}
                        </div>
                        {selectedTableId === t.id && (
                          <Check size={14} weight="bold" className="text-[#6B2737] shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-[#8D6E63] mt-0.5">
                        {t.availableUntil
                          ? `Libre hasta las ${t.availableUntil.slice(0, 5)}`
                          : 'Libre toda la noche'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">Zona (opcional)</label>
            <select
              value={zoneId}
              onChange={e => { setZoneId(e.target.value); setSelectedTableId(null) }}
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
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size={16} className="animate-spin" />
                Creando...
              </span>
            ) : (
              'Crear Walk-in'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
