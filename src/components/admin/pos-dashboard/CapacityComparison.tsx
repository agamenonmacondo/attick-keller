'use client'

import { useMemo } from 'react'
import { FRANJAS, CAPACIDAD_MAXIMA_DIA, getDayType, DAY_TYPE_LABELS, PROMEDIOS_HISTORICOS } from '@/lib/constants/performance'
import { SectionHeading } from '../shared/SectionHeading'

interface CapacityComparisonProps {
  hourlyRevenue: Array<{ hour: string; cheques: number; revenue: number }>
  selectedDate: string
}

function getChequesForFranja(
  hourlyRevenue: Array<{ hour: string; cheques: number; revenue: number }>,
  hours: readonly number[],
): number {
  return hourlyRevenue
    .filter(h => hours.includes(parseInt(h.hour, 10)))
    .reduce((sum, h) => sum + h.cheques, 0)
}

export function CapacityComparison({ hourlyRevenue, selectedDate }: CapacityComparisonProps) {
  const dayType = useMemo(() => getDayType(selectedDate), [selectedDate])

  const franjaData = useMemo(() => {
    return (Object.entries(FRANJAS) as [string, typeof FRANJAS[keyof typeof FRANJAS]][]).map(([key, franja]) => {
      const realCheques = getChequesForFranja(hourlyRevenue, franja.hours)
      const capacidad = franja.capacity
      const pct = Math.round((realCheques / capacidad) * 100)
      const promedio = PROMEDIOS_HISTORICOS[dayType][key as keyof typeof PROMEDIOS_HISTORICOS['alto']]
      const promedioPct = Math.round((promedio / capacidad) * 100)
      return { key, ...franja, realCheques, capacidad, pct, promedio, promedioPct }
    })
  }, [hourlyRevenue, dayType])

  const totalCheques = useMemo(() => {
    return franjaData.reduce((sum, f) => sum + f.realCheques, 0)
  }, [franjaData])

  const totalPct = Math.round((totalCheques / CAPACIDAD_MAXIMA_DIA) * 100)

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
      <SectionHeading>COMPARATIVA DE CAPACIDAD</SectionHeading>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-[var(--text-secondary)]">Tipo de dia:</span>
        <span className="text-xs font-semibold text-[var(--text-primary)] px-2 py-0.5 rounded bg-[var(--color-ak-borgona)]/10">
          {DAY_TYPE_LABELS[dayType]}
        </span>
      </div>

      <div className="space-y-4">
        {franjaData.map(franja => (
          <div key={franja.key}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {franja.label} <span className="text-[var(--text-secondary)] font-normal">({franja.timeRange})</span>
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                Tu dia: <span className="font-semibold text-[var(--text-primary)]">{franja.realCheques}/{franja.capacidad}</span>
                {' '}
                <span className={franja.pct > 100 ? 'text-[var(--color-ak-borgona)] font-semibold' : 'text-[var(--text-secondary)]'}>
                  ({franja.pct}%)
                </span>
              </span>
            </div>

            {/* Barra del dia */}
            <div className="h-2.5 w-full bg-[var(--bg-input)] rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full bg-[var(--color-ak-borgona)] transition-all duration-500"
                style={{ width: `${Math.min(franja.pct, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] ml-0.5">
              {franja.realCheques} chq
            </div>

            {/* Referencia */}
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-[10px] text-[var(--text-secondary)]">
                Promedio dias {DAY_TYPE_LABELS[dayType].toUpperCase()}: {franja.promedio} chq ({franja.promedioPct}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg-input)] rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full rounded-full bg-[var(--color-ak-borgona)]/30 transition-all duration-500"
                style={{ width: `${Math.min(franja.promedioPct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Total row */}
      <div className="mt-4 pt-3 border-t border-[var(--border-default)] flex items-baseline justify-between">
        <span className="text-xs font-semibold text-[var(--text-primary)]">TOTAL DIA</span>
        <span className="text-xs">
          <span className="font-semibold text-[var(--text-primary)]">{totalCheques}/{CAPACIDAD_MAXIMA_DIA}</span>
          {' '}
          <span className={totalPct > 100 ? 'text-[var(--color-ak-borgona)] font-semibold' : 'text-[var(--text-secondary)]'}>
            ({totalPct}%)
          </span>
        </span>
      </div>
      <div className="h-2.5 w-full bg-[var(--bg-input)] rounded-full overflow-hidden mt-1">
        <div
          className="h-full rounded-full bg-[var(--color-ak-borgona)] transition-all duration-500"
          style={{ width: `${Math.min(totalPct, 100)}%` }}
        />
      </div>
    </div>
  )
}
