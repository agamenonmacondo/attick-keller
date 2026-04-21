'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { StatusBadge } from '../admin/shared/StatusBadge'
import { Check, X, Armchair, Eye, Minus } from '@phosphor-icons/react'

const HOST_ACTION_MAP: Record<string, Array<{ status: string; label: string; variant: 'primary' | 'danger' | 'warning' }>> = {
  pending: [
    { status: 'confirmed', label: 'Confirmar', variant: 'primary' },
    { status: 'no_show', label: 'No asistio', variant: 'warning' },
    { status: 'cancelled', label: 'Cancelar', variant: 'danger' },
  ],
  pre_paid: [
    { status: 'confirmed', label: 'Confirmar', variant: 'primary' },
  ],
  confirmed: [
    { status: 'seated', label: 'Sentar', variant: 'primary' },
    { status: 'no_show', label: 'No asistio', variant: 'warning' },
  ],
  seated: [
    { status: 'completed', label: 'Completar', variant: 'primary' },
  ],
}

interface HostReservationQueueProps {
  reservations: Array<Record<string, unknown>>
  onAction: () => void
}

export function HostReservationQueue({ reservations, onAction }: HostReservationQueueProps) {
  const [confirming, setConfirming] = useState<string | null>(null) // reservation id being confirmed

  const handleStatusChange = async (id: string, status: string) => {
    setConfirming(id)
    try {
      await fetch(`/api/admin/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      onAction()
    } catch {
      // ignore
    } finally {
      setConfirming(null)
    }
  }

  // Sort by time_start
  const sorted = [...reservations].sort((a, b) =>
    String(a.time_start || '').localeCompare(String(b.time_start || ''))
  )

  const now = new Date()
  const fifteenMin = 15 * 60 * 1000

  return (
    <div className="space-y-3">
      <h2 className="font-['Playfair_Display'] text-lg md:text-xl font-bold text-[#3E2723]">
        Reservas de Hoy
      </h2>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#D7CCC8] p-8 text-center text-[#8D6E63]">
          No hay reservas para hoy
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {sorted.map(r => {
            const id = r.id as string
            const status = r.status as string
            const timeStart = (r.time_start as string)?.slice(0, 5) || ''
            const timeEnd = (r.time_end as string)?.slice(0, 5) || ''
            const partySize = r.party_size as number
            const customerName = (r.customers as { full_name: string } | null)?.full_name || 'Sin nombre'
            const actions = HOST_ACTION_MAP[status] || []
            const isConfirming = confirming === id

            // Highlight reservations starting within 15 minutes
            const startTime = new Date(`2000-01-01T${r.time_start as string}`)
            const isUrgent = status === 'confirmed' && startTime.getTime() - now.getTime() < fifteenMin && startTime.getTime() > now.getTime() - fifteenMin

            return (
              <div
                key={id}
                className={cn(
                  'bg-white rounded-xl border p-3 md:p-4',
                  isUrgent ? 'border-[#D4922A]/50 bg-[#D4922A]/5' : 'border-[#D7CCC8]',
                  status === 'seated' && 'opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base md:text-lg font-bold font-['Playfair_Display'] text-[#3E2723]">
                        {timeStart}
                      </span>
                      <span className="text-xs text-[#8D6E63]">— {timeEnd}</span>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-sm font-medium text-[#3E2723] truncate">{customerName}</p>
                    <p className="text-xs text-[#8D6E63]">{partySize} personas{r.zone_name ? ` · ${r.zone_name}` : ''}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {actions.map(action => (
                      <button
                        key={action.status}
                        onClick={() => handleStatusChange(id, action.status)}
                        disabled={isConfirming}
                        className={cn(
                          'px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium rounded-lg text-white active:scale-[0.97] transition-all disabled:opacity-50',
                          action.variant === 'primary' && 'bg-[#6B2737] hover:bg-[#5C2230]',
                          action.variant === 'warning' && 'bg-[#D4922A] hover:bg-[#D4922A]/90',
                          action.variant === 'danger' && 'bg-red-600 hover:bg-red-700',
                        )}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}