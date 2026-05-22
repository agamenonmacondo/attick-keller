'use client'

import { KPICard, formatCOPDisplay } from './KPICard'
import { CurrencyDollar, Receipt, Ticket, HandCoins, Users, UserPlus } from '@phosphor-icons/react'

interface KPIRowProps {
  kpis: {
    revenue: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    propinaPromedio: number
    personas: number
    partySizePromedio: number
    cardPaidTotal: number
    cashPaidTotal: number
  }
}

export function KPIRow({ kpis }: KPIRowProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <KPICard
        label="Revenue"
        value={kpis.revenue}
        icon={<CurrencyDollar size={16} weight="regular" />}
        format="currency"
      />
      <KPICard
        label="Cheques"
        value={kpis.cheques}
        icon={<Receipt size={16} weight="regular" />}
      />
      <KPICard
        label="Ticket Prom."
        value={kpis.ticketPromedio}
        icon={<Ticket size={16} weight="regular" />}
        format="currency"
      />
      <KPICard
        label="Propinas"
        value={kpis.propinaTotal}
        icon={<HandCoins size={16} weight="regular" />}
        format="currency"
        subtext={`${formatCOPDisplay(kpis.propinaPromedio)}/cheque`}
      />
      <KPICard
        label="Personas"
        value={kpis.personas}
        icon={<Users size={16} weight="regular" />}
      />
      <KPICard
        label="Party Prom."
        value={kpis.partySizePromedio}
        icon={<UserPlus size={16} weight="regular" />}
      />
    </div>
  )
}