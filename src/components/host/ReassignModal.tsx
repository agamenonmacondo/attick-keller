'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { timeToMinutes } from '@/lib/utils/time'
import type { ReservationTimeline, Zone } from '@/lib/hooks/useHostOccupancy'
import { X, Spinner, Check, ArrowsLeftRight } from '@phosphor-icons/react'

interface ReassignModalProps {
  reservation: ReservationTimeline
  currentTableName: string
  currentZoneName: string
  zones: Zone[]
  onClose: () => void
  onReassigned: () => void
}

interface AvailableTable {
  id: string
  name: string
  zoneName: string
  zoneId: string
  capacity: number
  availableUntil: string | null
  isSameZone: boolean
  score: number
}

/** Check if reservation overlaps with any existing reservations on a table, with 30min buffer */
function hasTimeConflict(
  existingReservations: ReservationTimeline[],
  timeStart: string,
  timeEnd: string
): boolean {
  const buffer = 30
  const startMins = timeToMinutes(timeStart) - buffer
  const endMins = timeToMinutes(timeEnd) + buffer

  return existingReservations.some(r => {
    const rStart = timeToMinutes(r.time_start)
    const rEnd = timeToMinutes(r.time_end)
    return rStart < endMins && rEnd > startMins
  })
}

/** Compute "Libre hasta" — find the next reservation that starts on this table */
function computeAvailableUntil(
  existingReservations: ReservationTimeline[],
  timeEnd: string
): string | null {
  const endMins = timeToMinutes(timeEnd)
  // Find the earliest upcoming reservation that starts after our reservation ends
  const nextR = existingReservations
    .filter(r => timeToMinutes(r.time_start) >= endMins && r.is_upcoming)
    .sort((a, b) => timeToMinutes(a.time_start) - timeToMinutes(b.time_start))[0]

  if (!nextR) return null
  return nextR.time_start
}

/** Zone priority scoring for sorting */
const ZONE_PRIORITY: Record<string, number> = {
  Tipi: 100,
  Taller: 80,
  'Jardín': 60,
  Chispas: 40,
  'Ático': 20,
}

function getZonePriority(name: string | null): number {
  if (!name) return 0
  return ZONE_PRIORITY[name] || 50
}

export function ReassignModal({
  reservation,
  currentTableName,
  currentZoneName,
  zones,
  onClose,
  onReassigned,
}: ReassignModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const availableTables = useMemo<AvailableTable[]>(() => {
    const result: AvailableTable[] = []

    for (const zone of zones) {
      for (const table of zone.tables) {
        // Skip current table
        if (table.id === reservation.id) continue

        // Filter by capacity
        if (table.capacity < reservation.party_size) continue

        // Filter by time conflict (with 30min buffer)
        if (hasTimeConflict(table.reservations || [], reservation.time_start, reservation.time_end)) continue

        const isSameZone = zone.name === currentZoneName
        const availableUntil = computeAvailableUntil(table.reservations || [], reservation.time_end)

        // Score for sorting: same zone bonus + zone priority + capacity fit
        const zoneScore = getZonePriority(zone.name)
        const sameZoneBonus = isSameZone ? 50 : 0
        const capacityFit = table.capacity >= reservation.party_size
          ? Math.min(100, (reservation.party_size / table.capacity) * 100)
          : 0

        result.push({
          id: table.id,
          name: table.name_attick || `Mesa ${table.number}`,
          zoneName: zone.name,
          zoneId: zone.id,
          capacity: table.capacity,
          availableUntil,
          isSameZone,
          score: sameZoneBonus + zoneScore * 0.3 + capacityFit * 0.3,
        })
      }
    }

    // Sort by score descending
    result.sort((a, b) => b.score - a.score)
    return result
  }, [zones, reservation, currentZoneName, currentTableName])

  const handleConfirm = async () => {
    if (!selectedTableId) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: selectedTableId }),
      })

      if (res.ok) {
        onReassigned()
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al reasignar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-[#F5EDE0] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#F5EDE0] border-b border-[#D7CCC8] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowsLeftRight size={18} className="text-[#6B2737]" />
              <h2 className="font-['Playfair_Display'] text-lg font-bold text-[#3E2723]">
                Reasignar Reserva
              </h2>
            </div>
            <button onClick={onClose} className="p-1 text-[#8D6E63] hover:text-[#3E2723] transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Current reservation info */}
          <div className="bg-white rounded-xl border border-[#D7CCC8] p-4">
            <p className="text-sm font-semibold text-[#3E2723]">
              {reservation.customer_name || 'Sin nombre'}
            </p>
            <p className="text-xs text-[#8D6E63] mt-0.5">
              {reservation.party_size} personas · {reservation.time_start.slice(0, 5)}–{reservation.time_end.slice(0, 5)}
            </p>
            <p className="text-xs text-[#8D6E63]">
              {currentTableName} · {currentZoneName}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Available tables list */}
          <div>
            <p className="text-sm font-medium text-[#3E2723] mb-2">
              Mover a:
            </p>
            {availableTables.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#D7CCC8] p-4 text-center">
                <p className="text-sm text-[#8D6E63]">No hay mesas disponibles para esta reserva</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {availableTables.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTableId(t.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      selectedTableId === t.id
                        ? 'border-[#6B2737] bg-[#6B2737]/5 ring-1 ring-[#6B2737]'
                        : 'border-[#D7CCC8] bg-white hover:border-[#8D6E63]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#3E2723]">{t.name}</span>
                        <span className="text-xs text-[#8D6E63]">· {t.zoneName}</span>
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          t.isSameZone ? 'bg-green-100 text-green-700' : 'bg-[#F5EDE0] text-[#8D6E63]'
                        )}>
                          {t.capacity}p
                        </span>
                      </div>
                      {selectedTableId === t.id && (
                        <Check size={14} weight="bold" className="text-[#6B2737]" />
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#D7CCC8] text-sm font-medium text-[#3E2723] bg-white hover:bg-[#EFEBE9] transition-colors active:scale-[0.97]"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedTableId || submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#6B2737] text-white text-sm font-medium hover:bg-[#5C2230] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-all"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size={16} className="animate-spin" />
                  Reasignando...
                </span>
              ) : (
                'Confirmar Movimiento'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
