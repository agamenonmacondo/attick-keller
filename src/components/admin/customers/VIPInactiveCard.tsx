'use client'

import { useVIPInactive } from '@/lib/hooks/useVIPInactive'
import { AnimatedCard } from '../shared/AnimatedCard'

export function VIPInactiveCard() {
  const { data, loading, error } = useVIPInactive(30)

  if (loading) {
    return (
      <AnimatedCard delay={0.7}>
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
      <AnimatedCard delay={0.7}>
        <div className="p-5">
          <p className="text-[#6B2737] text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  if (!data || data.vipInactive.length === 0) {
    return (
      <AnimatedCard delay={0.7}>
        <div className="p-5">
          <h3 className="text-xs font-semibold text-[#8D6E63] uppercase tracking-wider mb-2">
            👑 VIPs Inactivos
          </h3>
          <div className="bg-[#5C7A4D]/10 border border-[#5C7A4D]/20 rounded-lg p-4 text-center">
            <p className="text-[#5C7A4D] font-medium text-sm">Todos los VIPs están activos</p>
            <p className="text-[#8D6E63] text-xs mt-1">{data?.totalVIPs || 0} VIPs totales</p>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  const { vipInactive, count, totalVIPs } = data

  return (
    <AnimatedCard delay={0.7}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#8D6E63] uppercase tracking-wider">
            👑 VIPs Inactivos
          </h3>
          <span className="text-[10px] bg-[#6B2737] text-white px-2 py-1 rounded-full font-semibold">
            {count} de {totalVIPs}
          </span>
        </div>

        <div className="bg-[#D4922A]/10 border border-[#D4922A]/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-[#3E2723]">
            <span className="font-semibold text-[#D4922A]">{count} cliente{count > 1 ? 's' : ''} VIP</span> sin visitar en 30+ días — pérdida de valor
          </p>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {vipInactive.slice(0, 10).map((vip) => (
            <div key={vip.id} className="flex items-center justify-between bg-[#F5EDE0] rounded-lg p-3 border border-[#D7CCC8]">
              <div>
                <div className="font-medium text-[#3E2723] text-sm">{vip.customerName}</div>
                <div className="text-[10px] text-[#8D6E63]">
                  {vip.totalVisits} visitas · Última: hace {vip.daysSinceLastVisit} días
                </div>
              </div>
              {vip.phone && (
                <a
                  href={`https://wa.me/${vip.phone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Hola ${vip.customerName}, hace tiempo que no te vemos en Attick & Keller 💚 Como cliente VIP, tu mesa preferida te espera. ¿Te animas a volver esta semana?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#5C7A4D] hover:bg-[#5C7A4D]/90 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  💬 Llamar
                </a>
              )}
            </div>
          ))}
        </div>

        {vipInactive.length > 10 && (
          <p className="text-[10px] text-[#8D6E63] text-center mt-2">
            Y {vipInactive.length - 10} más...
          </p>
        )}
      </div>
    </AnimatedCard>
  )
}