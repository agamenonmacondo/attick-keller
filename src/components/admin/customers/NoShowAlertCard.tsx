'use client'

import { useNoShowToday } from '@/lib/hooks/useNoShowToday'
import { AnimatedCard } from '../shared/AnimatedCard'

const riskColors = {
  low: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Bajo' },
  medium: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Medio' },
  high: { bg: 'bg-red-100', text: 'text-red-700', label: 'Alto' },
}

export function NoShowAlertCard() {
  const { data, loading, error } = useNoShowToday()

  if (loading) {
    return (
      <AnimatedCard delay={0.4}>
        <div className="p-5">
          <div className="animate-pulse">
            <div className="h-4 bg-stone-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-stone-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              <div className="h-12 bg-stone-200 rounded"></div>
              <div className="h-12 bg-stone-200 rounded"></div>
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
          <p className="text-red-600 text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  const alerts = data?.alerts || []
  const totalAtRisk = data?.totalAtRisk || 0
  const totalReservations = data?.totalReservationsToday || 0

  if (!data) return null

  // No alerts state — green
  if (totalAtRisk === 0) {
    return (
      <AnimatedCard delay={0.4}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✅</span>
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
              Alertas No-Show
            </h3>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-700 font-medium">Sin alertas de no-show hoy</p>
            <p className="text-green-600 text-sm mt-1">{totalReservations} reservas confirmadas</p>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  return (
    <AnimatedCard delay={0.4}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            ⚠️ Reservas de Riesgo Hoy
          </h3>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
            {totalAtRisk} en riesgo
          </span>
        </div>

        <p className="text-sm text-stone-500 mb-4">
          {totalReservations} reservas confirmadas · {totalAtRisk} con riesgo de no-show
        </p>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 }
            return order[a.riskLevel] - order[b.riskLevel]
          }).map((alert) => {
            const risk = riskColors[alert.riskLevel as keyof typeof riskColors]
            return (
              <div key={alert.id} className="flex items-center justify-between bg-stone-50 rounded-lg p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-900 text-sm">{alert.customerName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${risk.bg} ${risk.text}`}>
                      {risk.label}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {alert.reservationTime} · {alert.partySize} personas · {alert.noShowCount} no-shows previos
                  </div>
                </div>
                {alert.customerPhone && (
                  <a
                    href={`https://wa.me/${alert.customerPhone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Hola ${alert.customerName}, confirmamos tu reserva en Attick & Keller para hoy a las ${alert.reservationTime}. ¿Nos confirmas tu asistencia? 💚`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    💬 Confirmar
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