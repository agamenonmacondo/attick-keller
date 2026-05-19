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
            <div className="h-4 bg-stone-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-stone-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-2"><div className="h-12 bg-stone-200 rounded"></div></div>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  if (error) {
    return (
      <AnimatedCard delay={0.7}>
        <div className="p-5">
          <p className="text-red-600 text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  if (!data || data.vipInactive.length === 0) {
    return (
      <AnimatedCard delay={0.7}>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-2">
            👑 VIPs Inactivos
          </h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-700 font-medium">Todos los VIPs están activos</p>
            <p className="text-green-600 text-sm mt-1">{data?.totalVIPs || 0} VIPs totales</p>
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
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            👑 VIPs Inactivos
          </h3>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
            {count} de {totalVIPs}
          </span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{count} cliente{count > 1 ? 's' : ''} VIP</span> sin visitar en 30+ días — pérdida estimada de <span className="font-bold">{count}× el ingreso promedio por VIP</span>
          </p>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {vipInactive.slice(0, 10).map((vip) => (
            <div key={vip.id} className="flex items-center justify-between bg-stone-50 rounded-lg p-3">
              <div>
                <div className="font-medium text-stone-900 text-sm">{vip.customerName}</div>
                <div className="text-xs text-stone-500">
                  {vip.totalVisits} visitas · Última: hace {vip.daysSinceLastVisit} días
                </div>
              </div>
              {vip.phone && (
                <a
                  href={`https://wa.me/${vip.phone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Hola ${vip.customerName}, hace tiempo que no te vemos en Attick & Keller 💚 Como cliente VIP, tu mesa preferida te espera. ¿Te animas a volver esta semana?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  💬 Llamar
                </a>
              )}
            </div>
          ))}
        </div>

        {vipInactive.length > 10 && (
          <p className="text-xs text-stone-400 text-center mt-2">
            Y {vipInactive.length - 10} más...
          </p>
        )}
      </div>
    </AnimatedCard>
  )
}