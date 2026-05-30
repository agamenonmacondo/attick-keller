'use client';

import { useMemo } from 'react';
import type { StaffMemberForShift, ShiftType } from '@/lib/types/shifts';
import { calcularCostoTurno, formatCOP } from '@/lib/utils/costCalculator';
import { useSalesAverages } from '@/lib/hooks/useSalesAverages';

interface SalesReferenceTabProps {
  staff: StaffMemberForShift[];
  shiftTypes: ShiftType[];
  grid: Record<string, Record<number, string>>;
  weekStr: string;
  area: string;
}

// Ratio color helper
function ratioColor(ratio: number): string {
  if (ratio >= 3.0) return 'text-emerald-400';
  if (ratio >= 1.5) return 'text-amber-400';
  return 'text-red-400';
}

export default function SalesReferenceTab({ staff, shiftTypes, grid, weekStr, area }: SalesReferenceTabProps) {
  const { data: salesData, loading: salesLoading } = useSalesAverages();

  // Calculate nomina per day and total
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
        const salario = emp.salario_mensual && emp.salario_mensual > 50000000
          ? 0
          : (emp.salario_mensual || 0);
        const costo = calcularCostoTurno(st, salario, isSunday);

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

  const weeklyRatio = weeklyNomina.totalNomina > 0
    ? (salesData?.weekly_total.avg_per_week || 0) / weeklyNomina.totalNomina
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
          <div className="text-xs text-[var(--text-secondary)]">Ventas promedio semana</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">
            {formatCOP(salesData.weekly_total.avg_per_week)}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            Basado en {salesData.weekly_total.total_days} dias de data
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Nomina estimada semana</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">
            {weeklyNomina.totalNomina > 0 ? formatCOP(weeklyNomina.totalNomina) : '-'}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {weeklyNomina.totalPersonas} turnos asignados
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Ratio Ventas/Nomina</div>
          <div className={`text-lg font-mono font-semibold ${weeklyNomina.totalNomina > 0 ? ratioColor(weeklyRatio) : 'text-[var(--text-secondary)]'}`}>
            {weeklyNomina.totalNomina > 0 ? weeklyRatio.toFixed(2) : 'Sin datos de nomina'}
          </div>
          {weeklyNomina.totalNomina > 0 && (
            <div className="text-[10px] text-[var(--text-secondary)]">
              {weeklyRatio >= 3.0 ? 'Productividad alta' : weeklyRatio >= 1.5 ? 'Productividad moderada' : 'Productividad baja'}
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
              <th className="text-right p-2 text-[var(--text-secondary)]">Ventas Prom</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Rango Inf (Q1)</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Rango Sup (Q3)</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Tx/dia</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Personas</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Costo Nomina</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Ratio V/N</th>
            </tr>
          </thead>
          <tbody>
            {DISPLAY_ORDER.map(dayIndex => {
              const salesDay = salesData.days.find(d => d.day_index === dayIndex);
              if (!salesDay) return null;
              const nomDay = nominaByDay[dayIndex];
              const ratio = nomDay.costoNomina > 0 ? salesDay.avg / nomDay.costoNomina : 0;

              return (
                <tr key={dayIndex} className="border-b border-[var(--border-default)]/50">
                  <td className="p-2 font-medium text-[var(--text-primary)]">
                    {salesDay.day_name}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                    {formatCOP(salesDay.avg)}
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
                  <td className={`p-2 text-right font-mono font-semibold ${nomDay.costoNomina > 0 ? ratioColor(ratio) : 'text-[var(--text-secondary)]'}`}>
                    {nomDay.costoNomina > 0 ? ratio.toFixed(2) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border-default)] font-semibold">
              <td className="p-2 text-[var(--text-primary)]">TOTAL</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                {formatCOP(salesData.weekly_total.avg_per_week)}
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
              <td className={`p-2 text-right font-mono font-bold ${weeklyNomina.totalNomina > 0 ? ratioColor(weeklyRatio) : 'text-[var(--text-secondary)]'}`}>
                {weeklyNomina.totalNomina > 0 ? weeklyRatio.toFixed(2) : '-'}
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
          const ratio = nomDay.costoNomina > 0 ? salesDay.avg / nomDay.costoNomina : 0;

          return (
            <div key={dayIndex} className="bg-[var(--bg-card)] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-[var(--text-primary)] text-sm">{salesDay.day_name}</div>
                <div className={`font-mono font-semibold text-sm ${nomDay.costoNomina > 0 ? ratioColor(ratio) : ''}`}>
                  {nomDay.costoNomina > 0 ? `V/N ${ratio.toFixed(2)}` : '-'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div className="text-[var(--text-secondary)]">Ventas prom</div>
                <div className="text-right font-mono text-[var(--text-primary)]">{formatCOP(salesDay.avg)}</div>
                <div className="text-[var(--text-secondary)]">Rango</div>
                <div className="text-right font-mono text-[var(--text-secondary)]">{formatCOP(salesDay.q1)} - {formatCOP(salesDay.q3)}</div>
                <div className="text-[var(--text-secondary)]">Tx/dia</div>
                <div className="text-right font-mono text-[var(--text-primary)]">{salesDay.tx_avg}</div>
                <div className="text-[var(--text-secondary)]">Personas</div>
                <div className="text-right font-mono text-[var(--text-primary)]">{nomDay.personas}</div>
                <div className="text-[var(--text-secondary)]">Nomina est.</div>
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
              <div className="font-mono text-[var(--text-primary)]">{formatCOP(salesData.weekly_total.avg_per_week)}</div>
              <div className={`font-mono font-bold ${weeklyNomina.totalNomina > 0 ? ratioColor(weeklyRatio) : 'text-[var(--text-secondary)]'}`}>
                {weeklyNomina.totalNomina > 0 ? `Ratio: ${weeklyRatio.toFixed(2)}` : 'Sin nomina'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}