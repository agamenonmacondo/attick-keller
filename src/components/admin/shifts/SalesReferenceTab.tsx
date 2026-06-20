'use client';

import { useMemo, useEffect, useState } from 'react';
import type { StaffMemberForShift, ShiftType } from '@/lib/types/shifts';
import { calcularCostoTurnoEmpresa, calcularCostoEmpresa, formatCOP } from '@/lib/utils/costCalculator';
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
  if (pct <= 20) return 'text-[var(--color-success)]';
  if (pct <= 35) return 'text-[var(--color-warning)]';
  return 'text-[var(--color-danger)]';
}

function ratioLabel(pct: number): string {
  if (pct <= 20) return 'Eficiente';
  if (pct <= 35) return 'Moderado';
  return 'Costo alto';
}

const WEEKS_PER_MONTH = 52 / 12; // ~4.33

export default function SalesReferenceTab({ staff, shiftTypes, grid, weekStr, area }: SalesReferenceTabProps) {
  const { data: salesData, loading: salesLoading } = useSalesAverages();

  // Fetch ALL staff for fijos calculation (independent of area filter)
  const [allStaff, setAllStaff] = useState<StaffMemberForShift[]>([]);
  useEffect(() => {
    async function fetchAllStaff() {
      try {
        const areas: ('cocina' | 'barra' | 'servicio')[] = ['cocina', 'barra', 'servicio'];
        const results = await Promise.all(
          areas.map(a => fetch(`/api/admin/shift-schedules?area=${a}&week_str=${weekStr}`, { credentials: 'include' }).then(r => r.json()))
        );
        const combined = results.flatMap(r => r.staff || []);
        // Deduplicate by id
        const seen = new Set<string>();
        const unique = combined.filter((s: StaffMemberForShift) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        setAllStaff(unique);
      } catch {
        // Fallback: use the staff prop (may miss some fijos when filtered by area)
        setAllStaff(staff);
      }
    }
    fetchAllStaff();
  }, [weekStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter staff by area — used by both nominaByDay and proyección mensual
  const filteredStaff = useMemo(() =>
    area === 'todos'
      ? staff
      : staff.filter(s => s.area === area || (s.secondary_areas || []).includes(area)),
    [staff, area]
  );

  // FIJOS: siempre se muestran, sin importar el filtro de área
  const FIJO_NAMES = ['WALTER VILLAMOROS', 'ESNEIDER BLANCO', 'VERONICA FRANCHESKA'];
  const fijos = useMemo(() =>
    allStaff.filter(s => {
      const a = s.area || '';
      const name = (s.nombre_completo || s.nombre || '').toUpperCase();
      return a === 'apoyo' || a === 'admin' || FIJO_NAMES.some(n => name.includes(n));
    }),
    [allStaff]
  );

  // CON TURNO: staff que sí hace turnos (filtrado por área)
  const conTurno = useMemo(() => {
    const fijoIds = new Set(fijos.map(f => f.id));
    return filteredStaff.filter(s => !fijoIds.has(s.id));
  }, [filteredStaff, fijos]);

  // Costo fijo mensual for leaders + apoyo
  const fijosData = useMemo(() => {
    const items: { nombre: string; cargo: string; costoMensual: number }[] = [];
    let totalMensual = 0;
    for (const s of fijos) {
      const costo = calcularCostoEmpresa(s.salario_mensual);
      // Costo empresa SIN auxilio transporte (auxilio se paga al empleado, no es costo operacional)
      // Auxilio personalizado (Walter $1M, Verónica $1.05M) NO se usa como base de prima/cesantías
      const costoSinAuxilio = costo.costoMensualTotal - costo.auxilioTransporte;
      totalMensual += costoSinAuxilio;
      items.push({ nombre: s.nombre_completo || s.nombre, cargo: s.cargo || '', costoMensual: costoSinAuxilio });
    }
    return { items, totalMensual };
  }, [fijos]);

  // Calculate nomina per day and total — CON TURNO only (fijos shown separately)
  const nominaByDay = useMemo(() => {
    const dayData: Record<number, { personas: number; costoNomina: number }> = {};
    for (let i = 0; i < 7; i++) {
      dayData[i] = { personas: 0, costoNomina: 0 };
    }

    const SUNDAY_DAY_INDEX = 0;

    for (const emp of conTurno) {
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
  }, [conTurno, shiftTypes, grid]);

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

  // Total semanal = turnos + fijos
  const totalSemanal = weeklyNomina.totalNomina + (fijosData.totalMensual / WEEKS_PER_MONTH);

  const weeklyPct = totalSemanal > 0 && salesData && (salesData.weekly_total.median_per_week || 0) > 0
    ? (totalSemanal / salesData.weekly_total.median_per_week) * 100
    : 0;

  const sumOfMedians = salesData?.weekly_total?.sum_of_medians || 0;
  const totalRowPct = totalSemanal > 0 && sumOfMedians > 0
    ? (totalSemanal / sumOfMedians) * 100
    : 0;

  // === PROYECCIÓN MENSUAL ===
  const salarioBaseConTurno = useMemo(() =>
    conTurno.reduce((s, e) => s + (e.salario_mensual || 0), 0),
    [conTurno]
  );

  const nominaTurnosMensual = weeklyNomina.totalNomina > 0
    ? Math.round(weeklyNomina.totalNomina * WEEKS_PER_MONTH)
    : 0;

  const nominaFijosMensual = Math.round(fijosData.totalMensual);

  const nominaTotalMensual = nominaTurnosMensual + nominaFijosMensual;

  const ventasMensuales = salesData && (salesData.weekly_total.median_per_week || 0) > 0
    ? Math.round(salesData.weekly_total.median_per_week * WEEKS_PER_MONTH)
    : 0;

  const provisionesMensuales = nominaTotalMensual - salarioBaseConTurno - fijosData.totalMensual;
  const factorReal = (salarioBaseConTurno + fijosData.totalMensual) > 0 ? nominaTotalMensual / (salarioBaseConTurno + fijosData.totalMensual) : 0;

  const nominaVentasMensualPct = nominaTotalMensual > 0 && ventasMensuales > 0
    ? (nominaTotalMensual / ventasMensuales) * 100
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
          <div className="text-xs text-[var(--text-secondary)]">Nómina total semana</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">
            {totalSemanal > 0 ? formatCOP(Math.round(totalSemanal)) : '-'}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {weeklyNomina.totalPersonas} turnos + {fijosData.items.length} fijos · Prestaciones + aportes
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Nómina / Ventas</div>
          <div className={`text-lg font-mono font-semibold ${totalSemanal > 0 ? ratioColor(weeklyPct) : 'text-[var(--text-secondary)]'}`}>
            {totalSemanal > 0 ? `${weeklyPct.toFixed(1)}%` : 'Sin datos'}
          </div>
          {totalSemanal > 0 && (
            <div className="text-[10px] text-[var(--text-secondary)]">
              {ratioLabel(weeklyPct)} · Ley: 20-30% es saludable
            </div>
          )}
        </div>
      </div>

      {/* Row 1.5: Costos fijos (líderes + apoyo) */}
      {fijosData.items.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Costos fijos mensuales ({fijosData.items.length} personas sin turno)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {fijosData.items.map((item) => (
              <div key={item.nombre} className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
                <div className="text-[11px] text-[var(--text-secondary)] truncate">{item.nombre.split(' ')[0]} {item.nombre.split(' ').slice(-1)[0]}</div>
                <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                  {formatCOP(item.costoMensual)}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)]">{item.cargo}</div>
              </div>
            ))}
            <div className="bg-[var(--accent-primary)]/10 rounded-lg p-2.5 border border-[var(--accent-primary)]/30">
              <div className="text-[11px] text-[var(--accent-primary)]">Total fijos / mes</div>
              <div className="text-sm font-mono font-bold text-[var(--accent-primary)]">
                {formatCOP(Math.round(fijosData.totalMensual))}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">{formatCOP(Math.round(fijosData.totalMensual / WEEKS_PER_MONTH))} / semana</div>
            </div>
          </div>
        </div>
      )}

      {/* Row 2: Proyección Mensual */}
      {weeklyNomina.totalNomina > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Proyección Mensual (×{WEEKS_PER_MONTH.toFixed(2)} semanas/mes)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Nómina turnos</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {formatCOP(nominaTurnosMensual)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">{conTurno.length} con turno</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Nómina fijos</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {formatCOP(nominaFijosMensual)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">{fijosData.items.length} sin turno</div>
            </div>
            <div className="bg-[var(--accent-primary)]/10 rounded-lg p-2.5 border border-[var(--accent-primary)]/30">
              <div className="text-[11px] text-[var(--accent-primary)]">NÓMINA TOTAL</div>
              <div className="text-sm font-mono font-bold text-[var(--accent-primary)]">
                {formatCOP(nominaTotalMensual)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">Turnos + Fijos</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Ventas mensuales</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {formatCOP(ventasMensuales)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">Mediana semanal × {WEEKS_PER_MONTH.toFixed(2)}</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">% Nóm/Ventas</div>
              <div className={`text-sm font-mono font-semibold ${ratioColor(nominaVentasMensualPct)}`}>
                {nominaVentasMensualPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">{ratioLabel(nominaVentasMensualPct)}</div>
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
              <th className="text-right p-2 text-[var(--text-secondary)]">Costo Turnos</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">+ Fijos/dia</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">% Nóm/Ventas</th>
            </tr>
          </thead>
          <tbody>
            {DISPLAY_ORDER.map(dayIndex => {
              const salesDay = salesData.days.find(d => d.day_index === dayIndex);
              if (!salesDay) return null;
              const nomDay = nominaByDay[dayIndex];
              const fijosPerDay = fijosData.totalMensual / 30;
              const totalDayCost = nomDay.costoNomina + fijosPerDay;
              const pct = salesDay.median > 0 && totalDayCost > 0
                ? (totalDayCost / salesDay.median) * 100
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
                  <td className="p-2 text-right font-mono text-[var(--text-secondary)]">
                    {formatCOP(Math.round(fijosPerDay))}
                  </td>
                  <td className={`p-2 text-right font-mono font-semibold ${totalDayCost > 0 && salesDay.median > 0 ? ratioColor(pct) : 'text-[var(--text-secondary)]'}`}>
                    {totalDayCost > 0 && salesDay.median > 0 ? `${pct.toFixed(1)}%` : '-'}
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
              <td className="p-2 text-right font-mono text-[var(--text-secondary)]">
                {formatCOP(Math.round(fijosData.totalMensual / 30 * 7))}
              </td>
              <td className={`p-2 text-right font-mono font-bold ${totalSemanal > 0 ? ratioColor(totalRowPct) : 'text-[var(--text-secondary)]'}`}>
                {totalSemanal > 0 ? `${totalRowPct.toFixed(1)}%` : '-'}
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
          const fijosPerDay = fijosData.totalMensual / 30;
          const totalDayCost = nomDay.costoNomina + fijosPerDay;
          const pct = salesDay.median > 0 && totalDayCost > 0
            ? (totalDayCost / salesDay.median) * 100
            : 0;

          return (
            <div key={dayIndex} className="bg-[var(--bg-card)] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-[var(--text-primary)] text-sm">{salesDay.day_name}</div>
                <div className={`font-mono font-semibold text-sm ${totalDayCost > 0 && salesDay.median > 0 ? ratioColor(pct) : ''}`}>
                  {totalDayCost > 0 && salesDay.median > 0 ? `${pct.toFixed(1)}%` : '-'}
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
                <div className="text-[var(--text-secondary)]">Costo turnos</div>
                <div className="text-right font-mono text-[var(--text-primary)]">
                  {nomDay.costoNomina > 0 ? formatCOP(Math.round(nomDay.costoNomina)) : '-'}
                </div>
                <div className="text-[var(--text-secondary)]">+ Fijos/dia</div>
                <div className="text-right font-mono text-[var(--text-secondary)]">
                  {formatCOP(Math.round(fijosPerDay))}
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
              <div className={`font-mono font-bold ${totalSemanal > 0 ? ratioColor(totalRowPct) : 'text-[var(--text-secondary)]'}`}>
                {totalSemanal > 0 ? `Nóm/Ventas: ${totalRowPct.toFixed(1)}%` : 'Sin nomina'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}