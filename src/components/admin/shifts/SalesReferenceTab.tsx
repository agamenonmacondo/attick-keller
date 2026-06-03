'use client';

import { useMemo } from 'react';
import type { StaffMemberForShift, ShiftType } from '@/lib/types/shifts';
import { calcularCostoTurnoEmpresa, formatCOP } from '@/lib/utils/costCalculator';
import { useSalesAverages } from '@/lib/hooks/useSalesAverages';

interface SalesReferenceTabProps {
  staff: StaffMemberForShift[];
  shiftTypes: ShiftType[];
  grid: Record<string, Record<number, string>>;
  weekStr: string;
  area: string;
}

// Ratio color helper — now based on COSTO NÓMINA / VENTAS (lower = better)
// < 20% → green (efficient), 20-35% → amber (moderate), > 35% → red (heavy cost)
function ratioColor(pct: number): string {
  if (pct <= 20) return 'text-emerald-400';
  if (pct <= 35) return 'text-amber-400';
  return 'text-red-400';
}

function ratioLabel(pct: number): string {
  if (pct <= 20) return 'Eficiente';
  if (pct <= 35) return 'Moderado';
  return 'Costo alto';
}

export default function SalesReferenceTab({ staff, shiftTypes, grid, weekStr, area }: SalesReferenceTabProps) {
  const { data: salesData, loading: salesLoading } = useSalesAverages();

  // Calculate nomina per day and total — using COSTO EMPRESA (salary + prestaciones + aportes)
  const nominaByDay = useMemo(() => {
    const dayData: Record<number, { personas: number; costoNomina: number }> = {};
    for (let i = 0; i < 7; i++) {
      dayData[i] = { personas: 0, costoNomina: 0 };
    }

    const SUNDAY_DAY_INDEX = 0;
    const filteredStaff = area === 'todos'
      ? staff
      : staff.filter(s => s.area === area || (s.secondary_areas || []).includes(area));

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
  }, [staff, shiftTypes, grid, area]);

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

  // Use MEDIAN for weekly ratio — now shows % COSTO NÓMINA / VENTAS (lower = better)
  // >35% → red (nómina pesada), 20-35% → ámbar (moderado), <20% → verde (eficiente)
  const weeklyPct = weeklyNomina.totalNomina > 0 && salesData && (salesData.weekly_total.median_per_week || 0) > 0
    ? (weeklyNomina.totalNomina / salesData.weekly_total.median_per_week) * 100
    : 0;

  // Total row uses sum_of_medians so it matches the visual sum of daily medians
  const sumOfMedians = salesData?.weekly_total?.sum_of_medians || 0;
  const totalRowPct = weeklyNomina.totalNomina > 0 && sumOfMedians > 0
    ? (weeklyNomina.totalNomina / sumOfMedians) * 100
    : 0;

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

      {/* Row 2: Table — Desktop */}
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