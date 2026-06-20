'use client';

import { useMemo } from 'react';
import type { StaffMemberForShift, ShiftType } from '@/lib/types/shifts';
import { calcularCostoTurnoEmpresa, formatCOP } from '@/lib/utils/costCalculator';
import { useSalesAverages } from '@/lib/hooks/useSalesAverages';
import { useMonthlyAccumulated } from '@/lib/hooks/useMonthlyAccumulated';

interface SalesReferenceTabProps {
  staff: StaffMemberForShift[];
  shiftTypes: ShiftType[];
  grid: Record<string, Record<number, string>>;
  weekStr: string;
  area: string;
  monthStr: string;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) return monthStr;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function daysInMonthFromStr(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) return 0;
  return new Date(y, m, 0).getDate();
}

// Ratio color helper — now based on COSTO NÓMINA / VENTAS (lower = better)
// < 20% → green (efficient), 20-35% → amber (moderate), > 35% → red (heavy cost)
function ratioColor(pct: number): string {
  if (pct <= 20) return 'text-[var(--color-success)]';
  if (pct <= 35) return 'text-[var(--color-warning)]';
  return 'text-[var(--color-danger)]';
}

function ratioLabel(pct: number): string {
  if (pct <= 20) return 'Eficiente';
  if (pct <= 35) return 'Moderado';
  return 'Costo alto';
}

export default function SalesReferenceTab({ staff, shiftTypes, grid, weekStr, area, monthStr }: SalesReferenceTabProps) {
  const { data: salesData, loading: salesLoading } = useSalesAverages();
  const { nomina: monthlyNomina, sales: monthlySales, loading: monthlyLoading } = useMonthlyAccumulated(monthStr, area);

  // Filter staff by area — used by both nominaByDay and proyección mensual
  const filteredStaff = useMemo(() =>
    area === 'todos'
      ? staff
      : staff.filter(s => s.area === area || (s.secondary_areas || []).includes(area)),
    [staff, area]
  );

  // Calculate nomina per day and total — using COSTO EMPRESA (salary + prestaciones + aportes)
  const nominaByDay = useMemo(() => {
    const dayData: Record<number, { personas: number; costoNomina: number }> = {};
    for (let i = 0; i < 7; i++) {
      dayData[i] = { personas: 0, costoNomina: 0 };
    }

    const SUNDAY_DAY_INDEX = 0;

    for (const emp of filteredStaff) {
      const empGrid = grid[emp.id];
      if (!empGrid) continue;

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const code = empGrid[dayIdx];
        if (!code || code === 'OFF') continue;

        const st = shiftTypes.find(t => t.code === code);
        if (!st) continue;

        const isSunday = dayIdx === SUNDAY_DAY_INDEX;
        const costo = calcularCostoTurnoEmpresa(st, emp.salario_mensual, isSunday);

        dayData[dayIdx].personas += 1;
        dayData[dayIdx].costoNomina += costo.total;
      }
    }

    return dayData;
  }, [filteredStaff, shiftTypes, grid]);

  const weeklyNomina = useMemo(() => {
    let totalNomina = 0;
    let totalPersonas = 0;
    for (let i = 0; i < 7; i++) {
      totalNomina += nominaByDay[i].costoNomina;
      totalPersonas += nominaByDay[i].personas;
    }
    return { totalNomina: Math.round(totalNomina), totalPersonas };
  }, [nominaByDay]);

  // Display order: Lun(1), Mar(2), Mie(3), Jue(4), Vie(5), Sab(6), Dom(0)
  const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const weeklyPct = weeklyNomina.totalNomina > 0 && salesData && (salesData.weekly_total.median_per_week || 0) > 0
    ? (weeklyNomina.totalNomina / salesData.weekly_total.median_per_week) * 100
    : 0;

  const sumOfMedians = salesData?.weekly_total?.sum_of_medians || 0;
  const totalRowPct = weeklyNomina.totalNomina > 0 && sumOfMedians > 0
    ? (weeklyNomina.totalNomina / sumOfMedians) * 100
    : 0;

  // === PROYECCIÓN MENSUAL ===
  const WEEKS_PER_MONTH = 52 / 12;

  const salarioBaseMensual = useMemo(() =>
    filteredStaff.reduce((s, e) => s + (e.salario_mensual || 0), 0),
    [filteredStaff]
  );

  const nominaMensual = weeklyNomina.totalNomina > 0
    ? Math.round(weeklyNomina.totalNomina * WEEKS_PER_MONTH)
    : 0;

  const ventasMensuales = salesData && (salesData.weekly_total.median_per_week || 0) > 0
    ? Math.round(salesData.weekly_total.median_per_week * WEEKS_PER_MONTH)
    : 0;

  const provisionesMensuales = nominaMensual - salarioBaseMensual;
  const factorReal = salarioBaseMensual > 0 ? nominaMensual / salarioBaseMensual : 0;

  const nominaVentasMensualPct = nominaMensual > 0 && ventasMensuales > 0
    ? (nominaMensual / ventasMensuales) * 100
    : 0;

  // === ACUMULADO DEL MES (real, no proyección) ===
  const monthlyVentas = monthlySales?.total_ventas || 0;
  const monthlyNominaTotal = monthlyNomina?.total_costo_empresa || 0;
  const monthlyPct = monthlyNominaTotal > 0 && monthlyVentas > 0
    ? (monthlyNominaTotal / monthlyVentas) * 100
    : 0;
  const diasAbiertos = monthlySales?.dias_abiertos || 0;
  const dimMes = daysInMonthFromStr(monthStr);
  const hasMonthlyData = monthlyNominaTotal > 0 || monthlyVentas > 0;

  // Join semanal: nómina + ventas por week_str
  const weeklyMonthlyRows = useMemo(() => {
    if (!monthlyNomina && !monthlySales) return [];
    const map = new Map<string, { week_str: string; ventas: number; nomina: number }>();
    for (const s of monthlySales?.por_semana || []) {
      map.set(s.week_str, { week_str: s.week_str, ventas: s.ventas, nomina: 0 });
    }
    for (const s of monthlyNomina?.semanas || []) {
      const existing = map.get(s.week_str) || { week_str: s.week_str, ventas: 0, nomina: 0 };
      existing.nomina = s.costo;
      map.set(s.week_str, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.week_str.localeCompare(b.week_str));
  }, [monthlyNomina, monthlySales]);

  const topEmpleados = useMemo(() =>
    (monthlyNomina?.empleados || []).slice(0, 5),
    [monthlyNomina]
  );

  if (salesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--text-secondary)] text-sm">Cargando datos de ventas...</div>
      </div>
    );
  }

  if (!salesData || salesData.days.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--text-secondary)] text-sm">Sin datos historicos de ventas</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Ventas mediana semana</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">
            {formatCOP(salesData.weekly_total.median_per_week)}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            Mediana de {salesData.weekly_total.total_days} dias de data (sin outliers)
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Nómina costo empresa</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">
            {weeklyNomina.totalNomina > 0 ? formatCOP(weeklyNomina.totalNomina) : '-'}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {weeklyNomina.totalPersonas} turnos · Incluye prestaciones + aportes
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Nómina / Ventas</div>
          <div className={`text-lg font-mono font-semibold ${weeklyNomina.totalNomina > 0 ? ratioColor(weeklyPct) : 'text-[var(--text-secondary)]'}`}>
            {weeklyNomina.totalNomina > 0 ? `${weeklyPct.toFixed(1)}%` : 'Sin datos'}
          </div>
          {weeklyNomina.totalNomina > 0 && (
            <div className="text-[10px] text-[var(--text-secondary)]">
              {ratioLabel(weeklyPct)} · Ley: 20-30% es saludable
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Proyección Mensual */}
      {weeklyNomina.totalNomina > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Proyección Mensual (×{WEEKS_PER_MONTH.toFixed(2)} semanas/mes)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Nómina mensual</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {formatCOP(nominaMensual)}
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Ventas mensuales</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {formatCOP(ventasMensuales)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">Mediana semanal × 4.33</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">% Nóm/Ventas</div>
              <div className={`text-sm font-mono font-semibold ${ratioColor(nominaVentasMensualPct)}`}>
                {nominaVentasMensualPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">{ratioLabel(nominaVentasMensualPct)}</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Salario base</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {formatCOP(salarioBaseMensual)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">{filteredStaff.length} empleados</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Provisiones</div>
              <div className="text-sm font-mono font-semibold text-[var(--color-warning)]">
                {formatCOP(provisionesMensuales)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">Prestaciones + aportes</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--accent-primary)]/30">
              <div className="text-[11px] text-[var(--accent-primary)]">Factor real</div>
              <div className="text-sm font-mono font-bold text-[var(--accent-primary)]">
                {factorReal.toFixed(2)}×
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">Nómina ÷ salario base</div>
            </div>
          </div>
        </div>
      )}

      {/* Row 2.5: Acumulado del Mes — datos reales del mes */}
      {monthlyLoading && (
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-default)]">
          <div className="text-xs text-[var(--text-secondary)]">Cargando acumulado mensual...</div>
        </div>
      )}

      {!monthlyLoading && hasMonthlyData && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Acumulado del Mes — {monthLabel(monthStr)}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Ventas real</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {formatCOP(monthlyVentas)}
              </div>
              {monthlySales && (
                <div className="text-[10px] text-[var(--text-secondary)]">{monthlySales.total_cheques} cheques</div>
              )}
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Nómina real</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {monthlyNominaTotal > 0 ? formatCOP(monthlyNominaTotal) : '-'}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">
                {monthlyNomina?.total_personas ?? 0} turnos · costo empresa
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">% Nóm/Ventas</div>
              <div className={`text-sm font-mono font-semibold ${monthlyNominaTotal > 0 && monthlyVentas > 0 ? ratioColor(monthlyPct) : 'text-[var(--text-secondary)]'}`}>
                {monthlyNominaTotal > 0 && monthlyVentas > 0 ? `${monthlyPct.toFixed(1)}%` : 'Sin datos'}
              </div>
              {monthlyNominaTotal > 0 && monthlyVentas > 0 && (
                <div className="text-[10px] text-[var(--text-secondary)]">{ratioLabel(monthlyPct)}</div>
              )}
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Días abiertos</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {diasAbiertos} <span className="text-[var(--text-secondary)] font-normal text-xs">de {dimMes}</span>
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">Días con ventas ≥ {formatCOP(100000)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Por semana */}
            {weeklyMonthlyRows.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-default)]">
                <div className="text-[11px] text-[var(--text-secondary)] mb-2">Por semana</div>
                <div className="space-y-1.5">
                  {weeklyMonthlyRows.map(row => {
                    const pct = row.nomina > 0 && row.ventas > 0
                      ? (row.nomina / row.ventas) * 100
                      : 0;
                    const projected = row.ventas === 0;
                    return (
                      <div key={row.week_str} className="flex items-center justify-between text-xs gap-2">
                        <span className="font-mono text-[var(--text-secondary)] w-16 shrink-0">{row.week_str}</span>
                        <span className="font-mono text-[var(--text-primary)] flex-1 text-right">
                          {formatCOP(row.ventas)}
                          {projected && <span className="text-[10px] text-[var(--text-secondary)]"> (proyectado)</span>}
                        </span>
                        <span className="font-mono text-[var(--text-secondary)] w-28 text-right">{formatCOP(row.nomina)}</span>
                        <span className={`font-mono font-semibold w-16 text-right ${row.nomina > 0 && row.ventas > 0 ? ratioColor(pct) : 'text-[var(--text-secondary)]'}`}>
                          {row.nomina > 0 && row.ventas > 0 ? `${pct.toFixed(0)}%` : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Por empleado (top 5) */}
            {topEmpleados.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-default)]">
                <div className="text-[11px] text-[var(--text-secondary)] mb-2">Por empleado (top 5)</div>
                <div className="space-y-1.5">
                  {topEmpleados.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-[var(--text-primary)] truncate flex-1">{emp.nombre}</span>
                      <span className="font-mono text-[var(--text-primary)] w-28 text-right">{formatCOP(emp.costo)}</span>
                      <span className="font-mono text-[var(--text-secondary)] w-20 text-right">{emp.turnos} turnos</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row 3: Table — Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left p-2 text-[var(--text-secondary)]">Dia</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Ventas Mediana</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Rango Inf (Q1)</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Rango Sup (Q3)</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Tx/dia</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Personas</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Costo Empresa</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">% Nóm/Ventas</th>
            </tr>
          </thead>
          <tbody>
            {DISPLAY_ORDER.map(dayIndex => {
              const salesDay = salesData.days.find(d => d.day_index === dayIndex);
              if (!salesDay) return null;
              const nomDay = nominaByDay[dayIndex];
              const pct = salesDay.median > 0 && nomDay.costoNomina > 0
                ? (nomDay.costoNomina / salesDay.median) * 100
                : 0;

              return (
                <tr key={dayIndex} className="border-b border-[var(--border-default)]/50">
                  <td className="p-2 font-medium text-[var(--text-primary)]">
                    {salesDay.day_name}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                    {formatCOP(salesDay.median)}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-secondary)]">
                    {formatCOP(salesDay.q1)}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-secondary)]">
                    {formatCOP(salesDay.q3)}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                    {salesDay.tx_avg}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                    {nomDay.personas}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                    {nomDay.costoNomina > 0 ? formatCOP(Math.round(nomDay.costoNomina)) : '-'}
                  </td>
                  <td className={`p-2 text-right font-mono font-semibold ${nomDay.costoNomina > 0 && salesDay.median > 0 ? ratioColor(pct) : 'text-[var(--text-secondary)]'}`}>
                    {nomDay.costoNomina > 0 && salesDay.median > 0 ? `${pct.toFixed(1)}%` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border-default)] font-semibold">
              <td className="p-2 text-[var(--text-primary)]">TOTAL</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                {formatCOP(sumOfMedians)}
              </td>
              <td className="p-2 text-right font-mono text-[var(--text-secondary)]">-</td>
              <td className="p-2 text-right font-mono text-[var(--text-secondary)]">-</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">-</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                {weeklyNomina.totalPersonas}
              </td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                {weeklyNomina.totalNomina > 0 ? formatCOP(weeklyNomina.totalNomina) : '-'}
              </td>
              <td className={`p-2 text-right font-mono font-bold ${weeklyNomina.totalNomina > 0 ? ratioColor(totalRowPct) : 'text-[var(--text-secondary)]'}`}>
                {weeklyNomina.totalNomina > 0 ? `${totalRowPct.toFixed(1)}%` : '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Row 2: Cards — Mobile */}
      <div className="md:hidden space-y-2">
        {DISPLAY_ORDER.map(dayIndex => {
          const salesDay = salesData.days.find(d => d.day_index === dayIndex);
          if (!salesDay) return null;
          const nomDay = nominaByDay[dayIndex];
          const pct = salesDay.median > 0 && nomDay.costoNomina > 0
            ? (nomDay.costoNomina / salesDay.median) * 100
            : 0;

          return (
            <div key={dayIndex} className="bg-[var(--bg-card)] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-[var(--text-primary)] text-sm">{salesDay.day_name}</div>
                <div className={`font-mono font-semibold text-sm ${nomDay.costoNomina > 0 && salesDay.median > 0 ? ratioColor(pct) : ''}`}>
                  {nomDay.costoNomina > 0 && salesDay.median > 0 ? `${pct.toFixed(1)}%` : '-'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div className="text-[var(--text-secondary)]">Ventas mediana</div>
                <div className="text-right font-mono text-[var(--text-primary)]">{formatCOP(salesDay.median)}</div>
                <div className="text-[var(--text-secondary)]">Rango</div>
                <div className="text-right font-mono text-[var(--text-secondary)]">{formatCOP(salesDay.q1)} - {formatCOP(salesDay.q3)}</div>
                <div className="text-[var(--text-secondary)]">Tx/dia</div>
                <div className="text-right font-mono text-[var(--text-primary)]">{salesDay.tx_avg}</div>
                <div className="text-[var(--text-secondary)]">Personas</div>
                <div className="text-right font-mono text-[var(--text-primary)]">{nomDay.personas}</div>
                <div className="text-[var(--text-secondary)]">Costo empresa</div>
                <div className="text-right font-mono text-[var(--text-primary)]">
                  {nomDay.costoNomina > 0 ? formatCOP(Math.round(nomDay.costoNomina)) : '-'}
                </div>
              </div>
            </div>
          );
        })}

        {/* Weekly total mobile */}
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border-t-2 border-[var(--border-default)] font-semibold">
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-primary)]">TOTAL SEMANA</span>
            <div className="text-right">
              <div className="font-mono text-[var(--text-primary)]">{formatCOP(sumOfMedians)}</div>
              <div className={`font-mono font-bold ${weeklyNomina.totalNomina > 0 ? ratioColor(totalRowPct) : 'text-[var(--text-secondary)]'}`}>
                {weeklyNomina.totalNomina > 0 ? `Nóm/Ventas: ${totalRowPct.toFixed(1)}%` : 'Sin nomina'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}