'use client'

import { useState } from 'react'
import { useRodriData, formatCOP } from '@/lib/hooks/useRodriData'
import { ProductMixTab } from './ProductMixTab'
import { TurnosNominaTab } from './TurnosNominaTab'
import { EquiposDiariosTab } from './EquiposDiariosTab'
import { ParametrosTab } from './ParametrosTab'
import SimulatorTab from './SimulatorTab'
import AutoScheduleTab from './AutoScheduleTab'

type RodriSubTab = 'productmix' | 'turnos' | 'equipos' | 'params' | 'simulator' | 'autoschedule'

const SUB_TABS: { key: RodriSubTab; label: string }[] = [
  { key: 'productmix', label: 'Product Mix' },
  { key: 'turnos', label: 'Turnos & Nomina' },
  { key: 'equipos', label: 'Equipos Diarios' },
  { key: 'params', label: 'Parametros' },
  { key: 'simulator', label: 'Simulador' },
  { key: 'autoschedule', label: 'Horarios Auto' },
]

export function RodriPanel() {
  const [subTab, setSubTab] = useState<RodriSubTab>('productmix')
  const data = useRodriData()

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-ak-borgona)] border-t-transparent rounded-full" />
        <span className="ml-3 text-[var(--text-secondary)]">Cargando datos de Rodrigo...</span>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-ak-borgona)] font-medium">Error cargando datos</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{data.error}</p>
        <button
          onClick={data.refetch}
          className="mt-4 px-4 py-2 bg-[var(--color-ak-borgona)] text-[var(--color-ak-dorado)] rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const totalVentas = data.productMix.reduce((s, m) => s + m.total_ventas, 0)
  const totalCosto = data.productMix.reduce((s, m) => s + m.total_costo, 0)
  const margen = totalVentas > 0 ? ((totalVentas - totalCosto) / totalVentas * 100) : 0

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPICard label="Ventas Trimestre" value={formatCompact(totalVentas)} sub="Ene - Mar 2026" color="var(--color-ak-borgona)" />
        <KPICard label="Margen Promedio" value={margen.toFixed(1) + '%'} sub="Sobre costo" color="var(--color-ak-verde)" />
        <KPICard label="Items Vendidos" value={data.productMix.reduce((s, m) => s + m.total_items, 0).toLocaleString('es-CO')} sub="Productos en menu" color="var(--color-ak-dorado)" />
        <KPICard label="Empleados Activos" value={String(data.employees.filter(e => e.activo !== false).length)} sub={`de ${data.employees.length} registrados`} color="var(--color-ak-madera)" />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-[var(--border-default)] mb-6 -mx-4 md:-mx-6 px-4 md:px-6 overflow-x-auto">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              subTab === tab.key
                ? 'border-[var(--color-ak-borgona)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {subTab === 'productmix' && <ProductMixTab data={data} />}
      {subTab === 'turnos' && <TurnosNominaTab data={data} />}
      {subTab === 'equipos' && <EquiposDiariosTab data={data} />}
      {subTab === 'params' && <ParametrosTab data={data} />}
      {subTab === 'simulator' && <SimulatorTab />}
      {subTab === 'autoschedule' && <AutoScheduleTab />}
    </div>
  )
}

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
      <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>
    </div>
  )
}

function formatCompact(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'
  return '$' + Math.round(n).toLocaleString('es-CO')
}