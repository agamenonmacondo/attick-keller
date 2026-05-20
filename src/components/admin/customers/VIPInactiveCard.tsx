'use client'

import { useVIPInactive } from '@/lib/hooks/useVIPInactive'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Crown, ChatCircle, CheckCircle, Warning } from '@phosphor-icons/react'

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
          <p className="text-[#C62828] text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  if (!data || data.vipInactive.length === 0) {
    return (
      <AnimatedCard delay={0.7}>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-[#3E2723] uppercase tracking-wider mb-2 flex items-center gap-2">
            <Crown size={16} weight="duotone" color="#C9A94E" />
            VIPs Inactivos
          </h3>
          <div className="bg-[#5C7A4D]/15 border border-[#5C7A4D]/30 rounded-lg p-4 text-center">
            <p className="text-[#5C7A4D] font-medium">Todos los VIPs estan activos</p>
            <p className="text-[#5C7A4D]/70 text-sm mt-1">{data?.totalVIPs || 0} VIPs totales</p>
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
          <h3 className="text-sm font-semibold text-[#3E2723] uppercase tracking-wider flex items-center gap-2">
            <Crown size={16} weight="duotone" color="#C9A94E" />
            VIPs Inactivos
          </h3>
          <span className="text-xs bg-[#A0522D]/15 text-[#A0522D] px-2 py-1 rounded-full font-medium">
            {count} de {totalVIPs}
          </span>
        </div>

        <div className="bg-[#D4922A]/15 border border-[#D4922A]/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-[#3E2723]">
            <span className="font-semibold">{count} cliente{count > 1 ? 's' : ''} VIP</span> sin visitar en 30+ dias — perdida estimada de <span className="font-bold">{count}x el ingreso promedio por VIP</span>
          </p>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {vipInactive.slice(0, 10).map((vip) => (
            <div key={vip.id} className="flex items-center justify-between bg-[#F5EDE0] rounded-lg p-3">
              <div>
                <div className="font-medium text-[#3E2723] text-sm">{vip.customerName}</div>
                <div className="text-xs text-[#8D6E63]">
                  {vip.totalVisits} visitas · Ultima: hace {vip.daysSinceLastVisit} dias
                </div>
              </div>
              {vip.phone && (
                <a
                  href={`https://wa.me/${vip.phone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Hola ${vip.customerName}, hace tiempo que no te vemos en Attick & Keller. Como cliente VIP, tu mesa preferida te espera. Te animas a volver esta semana?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#5C7A4D] hover:bg-[#4A6340] text-[#F5EDE0] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <ChatCircle size={12} /> Llamar
                </a>
              )}
            </div>
          ))}
        </div>

        {vipInactive.length > 10 && (
          <p className="text-xs text-[#8D6E63] text-center mt-2">
            Y {vipInactive.length - 10} mas...
          </p>
        )}
      </div>
    </AnimatedCard>
  )
}
