'use client'

import { useMemo } from 'react'
import { Wallet, ForkKnife, Receipt, Users, HandCoins, Coins, Calculator } from '@phosphor-icons/react'

interface KPICardProps {
  label: string
  value: string
  delta?: number | null
  subtitle?: string
  icon: React.ReactNode
}

function formatCOP(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return Math.round(n).toLocaleString('es-CO')
}

export function MetricasClave({ data, comparison }: { data: any; comparison: { kpis: any } | null }) {
  const cards = useMemo(() => {
    if (!data) return []

    const kpi = Array.isArray(data) ? data[0] : data
    const compKpi = comparison?.kpis ? (Array.isArray(comparison.kpis) ? comparison.kpis[0] : comparison.kpis) : null

    const revenue = Number(kpi?.total_ventas ?? kpi?.revenue ?? kpi?.total_revenue ?? 0)
    const subtotal = Number(kpi?.subtotal ?? 0)
    const taxTotal = Number(kpi?.tax_total ?? 0)
    const cheques = Number(kpi?.total_cheques ?? 0)
    const avgTicket = cheques > 0 ? revenue / cheques : 0
    const personas = Number(kpi?.personas ?? 0)
    const propina = Number(kpi?.propina_total ?? kpi?.tip_total ?? 0)
    const propinaPerCapita = personas > 0 ? propina / personas : 0

    const compRevenue = compKpi ? Number(compKpi?.total_ventas ?? compKpi?.revenue ?? 0) : 0
    const compCheques = compKpi ? Number(compKpi?.total_cheques ?? 0) : 0
    const compPersonas = compKpi ? Number(compKpi?.personas ?? 0) : 0
    const compPropina = compKpi ? Number(compKpi?.propina_total ?? compKpi?.tip_total ?? 0) : 0

    const pct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : null

    return [
      {
        label: 'Ventas',
        value: formatCOP(revenue),
        delta: compRevenue > 0 ? pct(revenue, compRevenue) : null,
        subtitle: cheques > 0 ? `${formatNum(cheques)} cheques` : undefined,
        icon: <Wallet size={16} className="text-[var(--color-ak-dorado)]" weight="fill" />,
      },
      {
        label: 'Sin IVA',
        value: formatCOP(subtotal),
        icon: <Receipt size={16} className="text-[var(--color-ak-dorado)]" />,
      },
      {
        label: 'IVA (8%)',
        value: formatCOP(taxTotal),
        icon: <Calculator size={16} className="text-[var(--color-ak-dorado)]" />,
      },
      {
        label: 'Cheques',
        value: formatNum(cheques),
        delta: compCheques > 0 ? pct(cheques, compCheques) : null,
        subtitle: personas > 0 ? `${formatNum(personas)} personas` : undefined,
        icon: <ForkKnife size={16} className="text-[var(--color-ak-dorado)]" />,
      },
      {
        label: 'Ticket Prom.',
        value: formatCOP(avgTicket),
        delta: compRevenue > 0 && compCheques > 0 ? pct(avgTicket, compRevenue / compCheques) : null,
        icon: <Receipt size={16} className="text-[var(--color-ak-dorado)]" />,
      },
      {
        label: 'Personas',
        value: formatNum(personas),
        delta: compPersonas > 0 ? pct(personas, compPersonas) : null,
        icon: <Users size={16} className="text-[var(--color-ak-dorado)]" />,
      },
      {
        label: 'Propina',
        value: formatCOP(propina),
        delta: compPropina > 0 ? pct(propina, compPropina) : null,
        icon: <HandCoins size={16} className="text-[var(--color-ak-dorado)]" weight="fill" />,
      },
      {
        label: 'Prop/Persona',
        value: formatCOP(propinaPerCapita),
        delta: null,
        icon: <Coins size={16} className="text-[var(--color-ak-dorado)]" />,
      },
    ]
  }, [data, comparison])

  if (!data) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 hover:border-[var(--color-ak-borgona)]/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              {card.label}
            </span>
            {card.icon}
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] leading-tight">
            {card.value}
          </div>
          {card.subtitle && (
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{card.subtitle}</div>
          )}
          {card.delta !== null && card.delta !== undefined && (
            <div className={`text-xs font-medium mt-1 ${card.delta >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {card.delta >= 0 ? '↑' : '↓'} {Math.abs(card.delta).toFixed(1)}%
            </div>
          )}
        </div>
      ))}
    </div>
  )
}