'use client'

import { KPICard, formatCOPDisplay } from './KPICard'
import { CurrencyDollar, Receipt, Calculator, ArrowDown, Ticket, HandCoins, Users, UserPlus, CreditCard, Money, ClockCounterClockwise } from '@phosphor-icons/react'

interface KPIRowProps {
  kpis: {
    revenue: number
    subtotal: number
    taxTotal: number
    discountTotal: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    propinaPromedio: number
    personas: number
    partySizePromedio: number
    cardPaidTotal: number
    cashPaidTotal: number
    avgServiceTime: number
  }
}

export function KPIRow({ kpis }: KPIRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2 sm:gap-3">
      <KPICard
        label="Revenue"
        value={kpis.revenue}
        icon={<CurrencyDollar size={16} weight="regular" />}
        format="currency"
      />
      <KPICard
        label="Sin IVA"
        value={kpis.subtotal}
        icon={<Receipt size={16} weight="regular" />}
        format="currency"
      />
      <KPICard
        label="IVA (8%)"
        value={kpis.taxTotal}
        icon={<Calculator size={16} weight="regular" />}
        format="currency"
      />
      <KPICard
        label="Descuentos"
        value={kpis.discountTotal}
        icon={<ArrowDown size={16} weight="regular" />}
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
      <KPICard
        label="Tarjeta"
        value={kpis.cardPaidTotal}
        icon={<CreditCard size={16} weight="regular" />}
        format="currency"
      />
      <KPICard
        label="Efectivo"
        value={kpis.cashPaidTotal}
        icon={<Money size={16} weight="regular" />}
        format="currency"
      />
      <KPICard
        label="Svc Time"
        value={kpis.avgServiceTime}
        icon={<ClockCounterClockwise size={16} weight="regular" />}
        subtext="min prom."
      />
    </div>
  )
}