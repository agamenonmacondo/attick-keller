'use client'

import { useVIPInactive } from '@/lib/hooks/useVIPInactive'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Crown, ChatCircle } from '@phosphor-icons/react'

export function VIPInactiveCard() {
  const { data, loading, error } = useVIPInactive(30)

  if (loading) {
    return (
      <AnimatedCard delay={0.7}>
        <div className="p-5">
          <div className="animate-pulse">
            <div className="h-4 bg-[var(--border-default)] rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-[var(--border-default)] rounded w-1/2 mb-4"></div>
            <div className="space-y-2"><div className="h-12 bg-[var(--border-default)] rounded"></div></div>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  if (error) {
    return (
      <AnimatedCard delay={0.7}>
        <div className="p-5">
          <p className="text-[var(--color-danger)] text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  if (!data || data.vipInactive.length === 0) {
    return (
      <AnimatedCard delay={0.7}>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2 flex items-center gap-2">
            <Crown size={16} weight="duotone" color="var(--color-ak-dorado)" />
            VIPs Inactivos
          </h3>
          <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-lg p-4 text-center">
            <p className="text-[var(--color-success)] font-medium">Todos los VIPs estan activos</p>
            <p className="text-[var(--text-secondary)] text-sm mt-1">{data?.totalVIPs || 0} VIPs totales</p>
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
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Crown size={16} weight="duotone" color="var(--color-ak-dorado)" />
            VIPs Inactivos
          </h3>
          <span className="text-xs bg-[var(--color-ak-ladrillo)]/15 text-[var(--color-ak-ladrillo)] px-2 py-1 rounded-full font-medium">
            {count} de {totalVIPs}
          </span>
        </div>

        <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-semibold">{count} cliente{count > 1 ? 's' : ''} VIP</span> sin visitar en 30+ dias
          </p>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {vipInactive.slice(0, 10).map((vip) => (
            <div key={vip.id} className="flex items-center justify-between bg-[var(--bg-input)] rounded-lg p-3">
              <div>
                <div className="font-medium text-[var(--text-primary)] text-sm">{vip.customerName}</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {vip.totalVisits} visitas · Ultima: hace {vip.daysSinceLastVisit} dias
                </div>
              </div>
              {vip.phone && (
                <a
                  href={`https://wa.me/${vip.phone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Hola ${vip.customerName}, hace tiempo que no te vemos en Attick & Keller. Como cliente VIP, tu mesa preferida te espera. Te animas a volver esta semana?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-[var(--bg-primary)] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <ChatCircle size={12} /> Llamar
                </a>
              )}
            </div>
          ))}
        </div>

        {vipInactive.length > 10 && (
          <p className="text-xs text-[var(--text-muted)] text-center mt-2">
            Y {vipInactive.length - 10} mas...
          </p>
        )}
      </div>
    </AnimatedCard>
  )
}
