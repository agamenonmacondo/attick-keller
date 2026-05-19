'use client'

import { useNoShowToday } from '@/lib/hooks/useNoShowToday'
import { AnimatedCard } from '../shared/AnimatedCard'

const riskStyles = {
  high: { bg: 'bg-[#6B2737]/15', border: 'border-[#6B2737]/30', text: 'text-[#6B2737]', badge: 'bg-[#6B2737] text-white', label: 'Alto' },
  medium: { bg: 'bg-[#D4922A]/15', border: 'border-[#D4922A]/30', text: 'text-[#D4922A]', badge: 'bg-[#D4922A] text-white', label: 'Medio' },
  low: { bg: 'bg-[#5C7A4D]/10', border: 'border-[#5C7A4D]/20', text: 'text-[#5C7A4D]', badge: 'bg-[#5C7A4D] text-white', label: 'Bajo' },
} as const

export function NoShowAlertCard() {
  const { data, loading, error } = useNoShowToday()

  if (loading) {
    return (
      <AnimatedCard delay={0.4}>
        <div className="p-5">
          <div className="animate-pulse">
            <div className="h-4 bg-[#D7CCC8] rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-[#D7CCC8] rounded w-1/2 mb-4"></div>
            <div className="space-y-2"><div className="h-12 bg-[#D7CCC8] rounded"></div></div>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  if (error) {
    return (
      <AnimatedCard delay={0.4}>
        <div className="p-5">
          <p className="text-[#6B2737] text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  if (!data || data.alerts.length === 0) {
    return (
      <AnimatedCard delay={0.4}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#8D6E63] uppercase tracking-wider">
              ⚠️ Alertas No-Show
            </h3>
          </div>
          <div className="bg-[#5C7A4D]/10 border border-[#5C7A4D]/20 rounded-lg p-4 text-center">
            <p className="text-[#5C7A4D] font-medium text-sm">✅ Sin reservas de riesgo hoy</p>
            <p className="text-[#8D6E63] text-xs mt-1">Todos los clientes están confirmados o sin historial</p>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  const { alerts, totalAtRisk } = data

  return (
    <AnimatedCard delay={0.4}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#8D6E63] uppercase tracking-wider">
            ⚠️ Alertas No-Show Hoy
          </h3>
          <span className="text-[10px] bg-[#6B2737] text-white px-2 py-1 rounded-full font-semibold">
            {totalAtRisk} en riesgo
          </span>
        </div>

        <div className="bg-[#6B2737]/10 border border-[#6B2737]/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-[#3E2723]">
            <span className="font-bold text-[#6B2737]">{totalAtRisk} reserva{totalAtRisk > 1 ? 's' : ''}</span> con riesgo de no-show hoy. Confirmar por WhatsApp reduce no-shows un <span className="font-bold text-[#5C7A4D]">40%</span>.
          </p>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.slice(0, 5).map((res) => {
            const style = riskStyles[res.riskLevel as keyof typeof riskStyles] || riskStyles.low
            return (
              <div key={res.id} className={`flex items-center justify-between rounded-lg p-3 ${style.bg} border ${style.border}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#3E2723] text-sm">{res.customerName}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${style.badge}`}>{style.label}</span>
                  </div>
                  <div className="text-xs text-[#8D6E63]">
                    {res.reservationTime} · {res.partySize} personas · {res.noShowCount} no-shows previos
                  </div>
                </div>
                {res.customerPhone && (
                  <a
                    href={`https://wa.me/${res.customerPhone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Hola ${res.customerName}, confirmamos tu reserva en Attick & Keller para hoy a las ${res.reservationTime}. ¿Todo bien? 🪑💚`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#5C7A4D] hover:bg-[#5C7A4D]/90 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    💬 Confirmar
                  </a>
                )}
              </div>
            )
          })}
        </div>

        {alerts.length > 5 && (
          <p className="text-xs text-[#8D6E63] text-center mt-2">
            Y {alerts.length - 5} más...
          </p>
        )}
      </div>
    </AnimatedCard>
  )
}