'use client'

import { useState } from 'react'
import { useNominaContable } from '@/lib/hooks/useNomina'
import type {
  NominaContableDetalle,
  NominaContableResumen,
  NominaContablePropinas,
  NominaContableHERecargo,
  NominaContableHERecargoTotals,
  NominaContableProvision,
  NominaContableNovedad,
} from '@/lib/hooks/useNomina'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Spinner, Money, Users, ArrowDown, ArrowUp, Lightning, Clock, CalendarDots, CaretDown, CaretUp, Table, HandCoins, FirstAidKit, Warning } from '@phosphor-icons/react'

function formatCOP(n: number): string {
  if (!n && n !== 0) return '$0'
  return '$' + Math.round(n).toLocaleString('es-CO')
}

type SubTab = 'detalle' | 'he-recargos' | 'provisiones' | 'novedades' | 'propinas'

const SEDE_LABELS: Record<string, string> = {
  C75: 'Calle 75',
  C85: 'Calle 85',
  KINDER: 'Kinder',
  ADMIN: 'Admin',
}

function KPICard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color?: string }) {
  return (
    <AnimatedCard className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={color || 'text-[var(--color-ak-borgona)]'} />
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
    </AnimatedCard>
  )
}

function DetalleTable({ detalle, resumen }: { detalle: NominaContableDetalle[]; resumen: NominaContableResumen | null }) {
  const [sortField, setSortField] = useState<'neto_a_pagar' | 'total_devengado' | 'nombre'>('neto_a_pagar')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = [...detalle].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'nombre') return dir * a.nombre_completo.localeCompare(b.nombre_completo)
    return dir * ((a[sortField] as number) - (b[sortField] as number))
  })

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }: { field: string }) => sortField === field
    ? (sortDir === 'desc' ? <CaretDown size={10} /> : <CaretUp size={10} />)
    : null

  return (
    <div className="space-y-4">
      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label="Devengado" value={formatCOP(resumen.total_devengado)} icon={ArrowUp} color="text-green-400" />
          <KPICard label="Deducciones" value={formatCOP(resumen.total_deducciones)} icon={ArrowDown} color="text-red-400" />
          <KPICard label="Neto a pagar" value={formatCOP(resumen.total_neto)} icon={Money} />
          <KPICard label="Empleados" value={String(resumen.empleados)} icon={Users} />
        </div>
      )}

      {/* Table */}
      <AnimatedCard className="p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Detalle por empleado</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-2 px-1 text-[var(--text-secondary)] cursor-pointer whitespace-nowrap" onClick={() => toggleSort('nombre')}>
                  Nombre <SortIcon field="nombre" />
                </th>
                <th className="text-left py-2 px-1 text-[var(--text-secondary)]">Cargo</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Dias</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Devengado</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Propinas</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Salud</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Pension</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)] cursor-pointer whitespace-nowrap" onClick={() => toggleSort('neto_a_pagar')}>
                  Neto <SortIcon field="neto_a_pagar" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => (
                <tr key={d.id} className="border-b border-[var(--border-default)]/50 hover:bg-[var(--color-ak-borgona)]/5">
                  <td className="py-1.5 px-1">
                    <div className="font-medium text-[var(--text-primary)]">{d.nombre_completo}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">CC {d.cedula}</div>
                  </td>
                  <td className="py-1.5 px-1 text-[var(--text-secondary)]">{d.cargo || '-'}</td>
                  <td className="py-1.5 px-1 text-center text-[var(--text-primary)]">{d.dias_laborados}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-primary)]">{formatCOP(d.total_devengado)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.propinas)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.salud_empleado)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.pension_empleado)}</td>
                  <td className="py-1.5 px-1 text-right font-bold text-[var(--color-ak-borgona)]">{formatCOP(d.neto_a_pagar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {detalle.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--text-secondary)]">Sin datos para este periodo</div>
        )}
      </AnimatedCard>
    </div>
  )
}

function HERecargosTable({ data, totals }: { data: NominaContableHERecargo[]; totals: NominaContableHERecargoTotals | null }) {
  return (
    <div className="space-y-4">
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label="HED Total" value={formatCOP(totals.hed_total)} icon={Lightning} color="text-yellow-400" />
          <KPICard label="HEN Total" value={formatCOP(totals.hen_total)} icon={Clock} color="text-purple-400" />
          <KPICard label="Rec. Nocturno" value={formatCOP(totals.rn_total)} icon={Clock} color="text-cyan-400" />
          <KPICard label="Total Recargos" value={formatCOP(totals.total_recargos)} icon={Money} />
        </div>
      )}
      <AnimatedCard className="p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Horas extra y recargos</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-2 px-1 text-[var(--text-secondary)]">Nombre</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HED</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HEN</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">RN</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">RD Diur.</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">RD Noct.</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HEDD</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HDDN</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-b border-[var(--border-default)]/50 hover:bg-[var(--color-ak-borgona)]/5">
                  <td className="py-1.5 px-1">
                    <div className="font-medium text-[var(--text-primary)]">{d.nombre_completo}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{d.cargo}</div>
                  </td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.hed_total)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.hen_total)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.rn_total)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.rd_diurno_total)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.rd_nocturno_total)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.hedd_total)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.hddn_total)}</td>
                  <td className="py-1.5 px-1 text-right font-bold text-[var(--color-ak-borgona)]">{formatCOP(d.total_recargos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--text-secondary)]">Sin datos de HE/recargos</div>
        )}
      </AnimatedCard>
    </div>
  )
}

function ProvisionesTable({ data, totals }: { data: NominaContableProvision[]; totals: Record<string, number> | null }) {
  return (
    <div className="space-y-4">
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label="Salud Emp." value={formatCOP(totals.salud_empleado || 0)} icon={FirstAidKit} color="text-red-400" />
          <KPICard label="Pension Emp." value={formatCOP(totals.pension_empleador || 0)} icon={Money} color="text-blue-400" />
          <KPICard label="Cesantias" value={formatCOP(totals.cesantias_empleador || 0)} icon={Money} color="text-yellow-400" />
          <KPICard label="Total Prov." value={formatCOP(totals.total_provision_empleador || 0)} icon={ArrowUp} />
        </div>
      )}
      <AnimatedCard className="p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Provisiones sociales</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-2 px-1 text-[var(--text-secondary)]">Nombre</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Salud</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Pension Emp.</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">ARL</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Caja</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Cesantias</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Prima</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Vacaciones</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-b border-[var(--border-default)]/50 hover:bg-[var(--color-ak-borgona)]/5">
                  <td className="py-1.5 px-1">
                    <div className="font-medium text-[var(--text-primary)]">{d.nombre_completo}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{d.cargo}</div>
                  </td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.salud_empleado)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.pension_empleador)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.arl_empleador)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.caja_empleador)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.cesantias_empleador)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.prima_empleador)}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{formatCOP(d.vacaciones_empleador)}</td>
                  <td className="py-1.5 px-1 text-right font-bold text-[var(--color-ak-borgona)]">{formatCOP(d.total_provision_empleador)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--text-secondary)]">Sin datos de provisiones</div>
        )}
      </AnimatedCard>
    </div>
  )
}

function NovedadesTable({ data }: { data: NominaContableNovedad[] }) {
  const tipoColors: Record<string, string> = {
    'VACACIONES': 'text-green-400',
    'INCAPACIDAD': 'text-red-400',
    'PER. REMUNERADO': 'text-blue-400',
    'PER. NO REMUNERADO': 'text-yellow-400',
    'AUSENCIA': 'text-orange-400',
    'CAMBIO BANCO': 'text-cyan-400',
    'INGRESO': 'text-purple-400',
    'RETIRO': 'text-red-400',
  }

  return (
    <AnimatedCard className="p-4">
      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Novedades del periodo</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-2 px-1 text-[var(--text-secondary)]">Nombre</th>
              <th className="text-left py-2 px-1 text-[var(--text-secondary)]">Tipo</th>
              <th className="text-left py-2 px-1 text-[var(--text-secondary)]">Observacion</th>
              <th className="text-center py-2 px-1 text-[var(--text-secondary)]">Dias</th>
              <th className="text-left py-2 px-1 text-[var(--text-secondary)]">Fechas</th>
              <th className="text-center py-2 px-1 text-[var(--text-secondary)]">Aplicada</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => {
              const colorClass = tipoColors[d.tipo] || 'text-[var(--text-secondary)]'
              return (
                <tr key={d.id} className="border-b border-[var(--border-default)]/50 hover:bg-[var(--color-ak-borgona)]/5">
                  <td className="py-1.5 px-1">
                    <div className="font-medium text-[var(--text-primary)]">{d.nombre_completo}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{d.cargo}</div>
                  </td>
                  <td className="py-1.5 px-1">
                    <span className={`font-medium ${colorClass}`}>{d.tipo}</span>
                  </td>
                  <td className="py-1.5 px-1 text-[var(--text-secondary)]">{d.observacion || '-'}</td>
                  <td className="py-1.5 px-1 text-center text-[var(--text-primary)]">{d.dias || '-'}</td>
                  <td className="py-1.5 px-1 text-[var(--text-secondary)]">
                    {d.fecha_inicio ? (d.fecha_fin ? `${d.fecha_inicio.slice(5)}-${d.fecha_fin?.slice(5)}` : d.fecha_inicio.slice(5)) : '-'}
                  </td>
                  <td className="py-1.5 px-1 text-center">
                    {d.aplicada
                      ? <span className="text-green-400">Si</span>
                      : <span className="text-red-400">No</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--text-secondary)]">Sin novedades</div>
      )}
    </AnimatedCard>
  )
}

function PropinasCard({ propinas }: { propinas: NominaContablePropinas | null }) {
  if (!propinas) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
        Sin datos de propinas
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KPICard label="Total Propinas" value={formatCOP(propinas.total_propinas_ventas)} icon={HandCoins} color="text-yellow-400" />
        <KPICard label="Valor dia/persona" value={formatCOP(propinas.valor_dia_propina)} icon={Money} />
        <KPICard label="Dias laborados" value={String(propinas.dias_laborados_total)} icon={CalendarDots} />
      </div>
      <AnimatedCard className="p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Desglose de propinas</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Propinas ventas</span>
            <span className="font-medium text-[var(--text-primary)]">{formatCOP(propinas.total_propinas_ventas)}</span>
          </div>
          {propinas.prometidos_100_pct > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Prometidos 100%</span>
              <span className="font-medium text-[var(--text-primary)]">{formatCOP(propinas.prometidos_100_pct)}</span>
            </div>
          )}
          {propinas.propina_para_rep > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Propina para rep</span>
              <span className="font-medium text-[var(--text-primary)]">{formatCOP(propinas.propina_para_rep)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-[var(--border-default)]">
            <span className="text-[var(--text-secondary)]">Valor dia/persona</span>
            <span className="font-bold text-[var(--color-ak-borgona)]">{formatCOP(propinas.valor_dia_propina)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Dias laborados total</span>
            <span className="font-medium text-[var(--text-primary)]">{propinas.dias_laborados_total}</span>
          </div>
        </div>
      </AnimatedCard>
    </div>
  )
}

const SUB_TABS: { key: SubTab; label: string; icon: any }[] = [
  { key: 'detalle', label: 'Detalle', icon: Table },
  { key: 'he-recargos', label: 'HE/Recargos', icon: Lightning },
  { key: 'provisiones', label: 'Provisiones', icon: Money },
  { key: 'novedades', label: 'Novedades', icon: Warning },
  { key: 'propinas', label: 'Propinas', icon: HandCoins },
]

export function NominaContablePanel() {
  const {
    periodos, selectedPeriodo, setSelectedPeriodo,
    selectedSede, setSelectedSede, sedesDisponibles,
    detalle, resumen, propinasPeriodo,
    heRecargos, heRecargosTotals,
    provisiones, provisionesTotals,
    novedades, subTab, setSubTab,
    loading, error,
  } = useNominaContable()

  if (loading && !detalle.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      </div>
    )
  }

  // Get unique periodos for dropdown
  const periodosUnicos = [...new Set(periodos.map(p => p.periodo))]

  return (
    <div className="space-y-5 px-3 sm:px-0">
      {/* Header + selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Nomina Contable</h2>
          <p className="text-sm text-[var(--text-secondary)]">Nominas por periodo y sede</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Periodo selector */}
          <select
            value={selectedPeriodo}
            onChange={e => setSelectedPeriodo(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-ak-borgona)]"
          >
            {periodosUnicos.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {/* Sede selector */}
          <div className="flex rounded-md overflow-hidden border border-[var(--border-default)]">
            {sedesDisponibles.map(sede => (
              <button
                key={sede}
                onClick={() => setSelectedSede(sede)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedSede === sede
                    ? 'bg-[var(--color-ak-borgona)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--color-ak-borgona)]/10'
                }`}
              >
                {SEDE_LABELS[sede] || sede}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              subTab === tab.key
                ? 'bg-[var(--color-ak-borgona)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--color-ak-borgona)]/10'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {subTab === 'detalle' && <DetalleTable detalle={detalle} resumen={resumen} />}
      {subTab === 'he-recargos' && <HERecargosTable data={heRecargos} totals={heRecargosTotals} />}
      {subTab === 'provisiones' && <ProvisionesTable data={provisiones} totals={provisionesTotals} />}
      {subTab === 'novedades' && <NovedadesTable data={novedades} />}
      {subTab === 'propinas' && <PropinasCard propinas={propinasPeriodo} />}
    </div>
  )
}