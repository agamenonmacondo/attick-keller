'use client'

import { useNoShowToday } from '@/lib/hooks/useNoShowToday'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Warning, CheckCircle, ChatCircle } from '@phosphor-icons/react'

const riskColors: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-[var(--color-warning)]/15', text: 'text-[var(--color-warning)]', label: 'Bajo' },
  medium: { bg: 'bg-[var(--color-ak-ladrillo)]/15', text: 'text-[var(--color-ak-ladrillo)]', label: 'Medio' },
  high: { bg: 'bg-[var(--color-danger)]/15', text: 'text-[var(--color-danger)]', label: 'Alto' },
}

export function NoShowAlertCard() {
  const { data, loading, error } = useNoShowToday()

  if (loading) {
    return (
      <AnimatedCard delay={0.4}>
        <div className="p-5">
          <div className="animate-pulse">
            <div className="h-4 bg-[var(--border-default)] rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-[var(--border-default)] rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              <div className="h-12 bg-[var(--border-default)] rounded"></div>
              <div className="h-12 bg-[var(--border-default)] rounded"></div>
            </div>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  if (error) {
    return (
      <AnimatedCard delay={0.4}>
        <div className="p-5">
          <p className="text-[var(--color-danger)] text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  const alerts = data?.alerts || []
  const totalAtRisk = data?.totalAtRisk || 0
  const totalReservations = data?.totalReservationsToday || 0

  if (!data) return null

  if (totalAtRisk === 0) {
    return (
      <AnimatedCard delay={0.4}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} weight="duotone" color="var(--color-success)" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Alertas No-Show
            </h3>
          </div>
          <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-lg p-4 text-center">
            <p className="text-[var(--color-success)] font-medium">Sin alertas de no-show hoy</p>
            <p className="text-[var(--text-secondary)] text-sm mt-1">{totalReservations} reservas confirmadas</p>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  return (
    <AnimatedCard delay={0.4}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Warning size={16} weight="duotone" color="var(--color-warning)" />
            Reservas de Riesgo Hoy
          </h3>
          <span className="text-xs bg-[var(--color-danger)]/15 text-[var(--color-danger)] px-2 py-1 rounded-full font-medium">
            {totalAtRisk} en riesgo
          </span>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {totalReservations} reservas confirmadas · {totalAtRisk} con riesgo de no-show
        </p>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 }
            return order[a.riskLevel] - order[b.riskLevel]
          }).map((alert) => {
            const risk = riskColors[alert.riskLevel as keyof typeof riskColors]
            return (
              <div key={alert.id} className="flex items-center justify-between bg-[var(--bg-input)] rounded-lg p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)] text-sm">{alert.customerName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${risk.bg} ${risk.text}`}>
                      {risk.label}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {alert.reservationTime} · {alert.partySize} personas · {alert.noShowCount} no-shows previos
                  </div>
                </div>
                {alert.customerPhone && (
                  <a
                    href={`https://wa.me/${alert.customerPhone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Hola ${alert.customerName}, confirmamos tu reserva en Attick & Keller para hoy a las ${alert.reservationTime}. Nos confirmas tu asistencia?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-[var(--bg-primary)] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    <ChatCircle size={12} /> Confirmar
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </AnimatedCard>
  )
}
