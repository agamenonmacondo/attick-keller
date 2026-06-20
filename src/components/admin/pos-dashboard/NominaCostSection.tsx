'use client'

import { useNominaOpsCosts } from '@/lib/hooks/useNominaOpsCosts'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Spinner, Money, Users, TrendUp, ChartPieSlice, Warning, Info } from '@phosphor-icons/react'

function formatCOP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function formatFull(n: number): string {
  return new Intl.NumberFormat('es-CO').format(Math.round(n))
}

function KPIBox({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-lg p-3 ${color}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon && <span className="opacity-70">{icon}</span>}
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] opacity-80">{label}</p>
      </div>
      <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
      {sub && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{sub}</p>}
    </div>
  )
}

function PercentBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="w-full h-2 rounded-full bg-[var(--bg-card-hover)] overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function RatioGauge({ label, pct, value, sub, warn = false }: { label: string; pct: number; value: string; sub?: string; warn?: boolean }) {
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (pct / 100) * circumference
  const color = warn ? (pct > 35 ? 'var(--color-danger)' : pct > 25 ? 'var(--color-ak-borgona)' : 'var(--color-success, #10b981)') : 'var(--color-ak-borgona)'
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="var(--bg-card-hover)" strokeWidth="8" />
          <circle cx="48" cy="48" r="40" fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-[var(--text-primary)]">{pct.toFixed(1)}%</span>
        </div>
      </div>
      <p className="text-xs font-medium text-[var(--text-primary)] mt-1.5 text-center">{label}</p>
      <p className="text-[10px] text-[var(--text-secondary)] text-center">{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-secondary)] text-center">{sub}</p>}
    </div>
  )
}

export function NominaCostSection() {
  const { data, loading, error } = useNominaOpsCosts('ABRIL 2026')

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Spinner size={28} className="animate-spin text-[var(--color-ak-borgona)]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[var(--color-danger)]">{error || 'Sin datos de nomina'}</p>
      </div>
    )
  }

  const { resumen, composicion, provisiones, novedades, propinas, heRecargos, empleados, ventas, ratios } = data

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Costos Nomina C75</h3>
          <p className="text-xs text-[var(--text-secondary)]">Abril 2026 · Calle 75</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-ak-borgona)]/10 text-[var(--color-ak-borgona)]">
          <Users size={14} weight="fill" />
          <span className="text-xs font-semibold">{empleados} empleados</span>
        </div>
      </div>

      {/* ═══ Ratios Nómina/Ventas — indicador principal ═══ */}
      {ventas.revenue > 0 && (
        <AnimatedCard delay={0} className="bg-[var(--bg-card)] rounded-xl border border-[var(--color-ak-borgona)]/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendUp size={18} weight="fill" className="text-[var(--color-ak-borgona)]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Nomina vs Ventas</h4>
          </div>

          {/* Gauges */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {ratios.nominaDevenidoVsRevenue !== null && (
              <RatioGauge
                label="Devengado / Ventas"
                pct={ratios.nominaDevenidoVsRevenue}
                value={formatFull(resumen.totalDevengado)}
                sub={`de ${formatFull(ventas.revenue)}`}
                warn
              />
            )}
            {ratios.costoRealVsRevenue !== null && (
              <RatioGauge
                label="Costo Real / Ventas"
                pct={ratios.costoRealVsRevenue}
                value={formatFull(resumen.costoReal)}
                sub={`(+${((resumen.totalProvisiones / resumen.totalDevengado) * 100).toFixed(0)}% prov.)`}
                warn
              />
            )}
            {ratios.salarioVsRevenue !== null && (
              <RatioGauge
                label="Salario / Ventas"
                pct={ratios.salarioVsRevenue}
                value={formatFull(composicion.salarioDevengado)}
                warn
              />
            )}
            {ratios.propinasVsRevenue !== null && (
              <RatioGauge
                label="Propinas / Ventas"
                pct={ratios.propinasVsRevenue}
                value={formatFull(composicion.propinas)}
              />
            )}
            {ratios.margenBruto !== null && (
              <RatioGauge
                label="Margen Bruto"
                pct={ratios.margenBruto}
                value={`${ratios.margenBruto.toFixed(1)}%`}
                sub={`Ventas − Costo real`}
                warn
              />
            )}
          </div>

          {/* Summary bar */}
          <div className="mt-4 pt-3 border-t border-[var(--border-default)] grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase">Ventas del periodo</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">{formatFull(ventas.revenue)}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">{ventas.transactions} transacciones</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase">Costo Nomina Real</p>
              <p className="text-sm font-bold text-[var(--color-warning)]">{formatFull(resumen.costoReal)}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">devengado + provisiones</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase">Margen</p>
              <p className={`text-sm font-bold ${ratios.margenBruto && ratios.margenBruto < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                {ratios.margenBruto !== null ? `${formatFull(ventas.revenue - resumen.costoReal)}` : '—'}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">{ratios.margenBruto !== null ? `${ratios.margenBruto.toFixed(1)}% margen` : ''}</p>
            </div>
          </div>

          {/* Visual bar: how each COP of revenue is split */}
          <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase mb-2">De cada COP 100 en ventas:</p>
            <div className="w-full h-6 rounded-full overflow-hidden flex">
              {ratios.salarioVsRevenue !== null && (
                <div className="bg-[var(--color-ak-borgona)] flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${ratios.salarioVsRevenue}%` }}>
                  Salario {ratios.salarioVsRevenue.toFixed(0)}
                </div>
              )}
              {ratios.propinasVsRevenue !== null && (
                <div className="bg-[var(--color-warning)] flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${ratios.propinasVsRevenue}%` }}>
                  Prop {ratios.propinasVsRevenue.toFixed(0)}
                </div>
              )}
              {ratios.provisionesVsRevenue !== null && ratios.provisionesVsRevenue > 1 && (
                <div className="bg-[var(--color-warning)] flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${ratios.provisionesVsRevenue}%` }}>
                  Prov {ratios.provisionesVsRevenue.toFixed(0)}
                </div>
              )}
              {ratios.margenBruto !== null && ratios.margenBruto > 0 && (
                <div className="bg-[var(--color-success)] flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${ratios.margenBruto}%` }}>
                  Margen {ratios.margenBruto.toFixed(0)}
                </div>
              )}
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPIBox
          label="Devengado"
          value={formatCOP(resumen.totalDevengado)}
          sub={formatFull(resumen.totalDevengado)}
          color="bg-[var(--color-ak-borgona)]/5"
          icon={<Money size={14} />}
        />
        <KPIBox
          label="Costo Real"
          value={formatCOP(resumen.costoReal)}
          sub={`+${((resumen.totalProvisiones / resumen.totalDevengado) * 100).toFixed(0)}% provisiones`}
          color="bg-[var(--color-warning)]/5"
        />
        <KPIBox
          label="Neto a Pagar"
          value={formatCOP(resumen.totalNeto)}
          sub={formatFull(resumen.totalNeto)}
          color="bg-[var(--color-success)]/5"
        />
        <KPIBox
          label="Costo/Empleado"
          value={formatCOP(resumen.costoPorEmpleado)}
          sub={`Neto: ${formatCOP(resumen.netoPorEmpleado)}`}
          color="bg-blue-500/5"
        />
      </div>

      {/* Composicion del devengado */}
      <AnimatedCard delay={0.05} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Composicion del Devengado</h4>
        <div className="space-y-2.5">
          {[
            { label: 'Salario', value: composicion.salarioDevengado, color: 'bg-[var(--color-ak-borgona)]' },
            { label: 'Propinas', value: composicion.propinas, color: 'bg-[var(--color-warning)]' },
            { label: 'Recargos HE/RN/RD', value: composicion.recargosHERN, color: 'bg-blue-500' },
            { label: 'Aux. Transporte', value: composicion.auxilioTransporte, color: 'bg-[var(--color-success)]' },
            { label: 'Aux. No Salarial', value: composicion.auxilioNoSalarial, color: 'bg-purple-500' },
          ].map(item => {
            const pct = resumen.totalDevengado > 0 ? (item.value / resumen.totalDevengado) * 100 : 0
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatFull(item.value)} <span className="text-[var(--text-secondary)]">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <PercentBar value={item.value} max={resumen.totalDevengado} color={item.color} />
              </div>
            )
          })}
        </div>
        <div className="mt-3 pt-2 border-t border-[var(--border-default)] flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-primary)]">Total Devengado</span>
          <span className="text-sm font-bold text-[var(--color-ak-borgona)]">{formatFull(resumen.totalDevengado)}</span>
        </div>
      </AnimatedCard>

      {/* 2 columnas: Provisiones + Deducciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard delay={0.10} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Provisiones Empleador</h4>
          <div className="space-y-2">
            {[
              { label: 'Salud (8.5%)', value: provisiones.saludEmpleador },
              { label: 'Pension (12%)', value: provisiones.pensionEmpleador },
              { label: 'ARL', value: provisiones.arlEmpleador },
              { label: 'Caja Compensacion', value: provisiones.cajaEmpleador },
              { label: 'Cesantias', value: provisiones.cesantiasEmpleador },
              { label: 'Prima', value: provisiones.primaEmpleador },
              { label: 'Vacaciones', value: provisiones.vacacionesEmpleador },
            ].map(item => {
              const pct = provisiones.total > 0 ? (item.value / provisiones.total) * 100 : 0
              return (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatFull(item.value)} <span className="text-[var(--text-secondary)]">({pct.toFixed(0)}%)</span>
                  </span>
                </div>
              )
            })}
            <div className="pt-2 mt-1 border-t border-[var(--border-default)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Total Provisiones</span>
              <span className="text-sm font-bold text-orange-500">{formatFull(provisiones.total)}</span>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.15} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Deducciones Empleado</h4>
          <div className="space-y-2">
            {[
              { label: 'Salud (4%)', value: data.deducciones.saludEmpleado },
              { label: 'Pension (4%)', value: data.deducciones.pensionEmpleado },
              { label: 'Pagos Realizados', value: data.deducciones.pagosRealizados },
              { label: 'Prestamos/Consumos', value: data.deducciones.prestamosConsumos },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">{item.label}</span>
                <span className="font-medium text-[var(--text-primary)]">{formatFull(item.value)}</span>
              </div>
            ))}
            <div className="pt-2 mt-1 border-t border-[var(--border-default)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Total Deducciones</span>
              <span className="text-sm font-bold text-[var(--color-danger)]">{formatFull(resumen.totalDeducciones)}</span>
            </div>
          </div>

          {propinas && (
            <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Propinas</h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Ventas periodo</span>
                  <span className="font-medium text-[var(--text-primary)]">{formatFull(propinas.totalVentas)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Valor dia/persona</span>
                  <span className="font-medium text-[var(--text-primary)]">{formatFull(propinas.valorDiaPropina)}</span>
                </div>
              </div>
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* HE/Recargos + Novedades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard delay={0.20} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Horas Extra y Recargos</h4>
          <p className="text-2xl font-bold text-[var(--color-ak-borgona)]">{formatFull(heRecargos.total)}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {heRecargos.count} empleados con HE/recargos
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-[var(--bg-card-hover)] p-2 text-center">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase">% del devengado</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {resumen.totalDevengado > 0 ? ((heRecargos.total / resumen.totalDevengado) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="flex-1 rounded-lg bg-[var(--bg-card-hover)] p-2 text-center">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase">HE/persona</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {empleados > 0 ? formatCOP(heRecargos.total / empleados) : '$0'}
              </p>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.25} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Novedades del Mes</h4>
          <p className="text-2xl font-bold text-[var(--color-ak-borgona)]">{novedades.total}</p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">incidencias registradas</p>
          {novedades.detail && novedades.detail.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {novedades.detail.slice(0, 8).map((n: any, i: number) => (
                <div key={i} className="flex items-start justify-between text-xs gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-[var(--text-primary)] truncate">{n.empleado}</span>
                    <span className="text-[var(--text-secondary)] ml-1">· {n.tipo}</span>
                  </div>
                  {n.dias && (
                    <span className="shrink-0 text-[var(--text-secondary)]">{n.dias}d</span>
                  )}
                </div>
              ))}
              {novedades.detail.length > 8 && (
                <p className="text-[10px] text-[var(--color-ak-borgona)]">
                  +{novedades.detail.length - 8} mas
                </p>
              )}
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* Costo real desglosado */}
      <AnimatedCard delay={0.30} className="bg-[var(--bg-card)] rounded-xl border border-[var(--color-ak-borgona)]/20 p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Resumen Costo Real Empleador</h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-[var(--color-ak-borgona)]/5 p-3">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase">Devengado</p>
            <p className="text-lg font-bold text-[var(--color-ak-borgona)]">{formatCOP(resumen.totalDevengado)}</p>
          </div>
          <div className="rounded-lg bg-orange-500/5 p-3">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase">+ Provisiones</p>
            <p className="text-lg font-bold text-orange-500">{formatCOP(resumen.totalProvisiones)}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-success)]/5 p-3">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase">= Costo Real</p>
            <p className="text-lg font-bold text-emerald-500">{formatCOP(resumen.costoReal)}</p>
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] text-center mt-2">
          Las provisiones representan el {((resumen.totalProvisiones / resumen.totalDevengado) * 100).toFixed(0)}% adicional sobre el devengado
        </p>
      </AnimatedCard>
    </div>
  )
}