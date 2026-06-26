'use client';

import { useMemo, useEffect, useState } from 'react';
import type { StaffMemberForShift, ShiftType } from '@/lib/types/shifts';
import { calcularRecargosPuros, calcularCostoEmpresa, formatCOP } from '@/lib/utils/costCalculator';
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
        const res = await fetch('/api/admin/nomina-staff', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch staff');
        const data = await res.json();
        // nomina-staff returns { staff: [...] } with all active employees
        const staffList = (data.staff || data || []).filter((s: Record<string, unknown>) => s.activo !== false);
        setAllStaff(staffList.map((s: Record<string, unknown>) => ({
          ...s,
          nombre: (s.nombre_completo as string || '').split(' ')[0],
          salario_mensual: (s.salario_mensual as number) || 0,
          auxilio_no_salarial: (s.auxilio_no_salarial as number) || 0,
          alias: '',
        })));
      } catch {
        // Fallback: use the staff prop (may miss some fijos when filtered by area)
        setAllStaff(staff);
      }
    }
    fetchAllStaff();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter staff by area — used by both nominaByDay and proyección mensual
  const filteredStaff = useMemo(() =>
    area === 'todos'
      ? staff
      : staff.filter(s => s.area === area || (s.secondary_areas || []).includes(area)),
    [staff, area]
  );

  // FIJOS: siempre se muestran, sin importar el filtro de área
  // Usa is_fixed_cost de la BD + líderes de área (Walter, Esneider, Verónica, Rodrigo)
  const fijos = useMemo(() =>
    allStaff.filter(s => {
      const a = s.area || '';
      return s.is_fixed_cost === true || a === 'apoyo' || a === 'admin';
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
    const items: { nombre: string; cargo: string; costoMensual: number; salarioBase: number }[] = [];
    let totalMensual = 0;
    let totalSalarioBase = 0;
    for (const s of fijos) {
      const sinAux = ((s.cargo?.toUpperCase().includes('PASANTE') ?? false) && (s.auxilio_no_salarial || 0) === 0) || (s.salario_mensual <= 1);
      const costo = calcularCostoEmpresa(s.salario_mensual, s.auxilio_no_salarial, sinAux);
      // Costo empresa TOTAL (incluye auxilio transporte — es costo real del negocio)
      totalMensual += costo.costoMensualTotal;
      totalSalarioBase += s.salario_mensual || 0;
      items.push({ nombre: s.nombre_completo || s.nombre, cargo: s.cargo || '', costoMensual: costo.costoMensualTotal, salarioBase: s.salario_mensual || 0 });
    }
    return { items, totalMensual, totalSalarioBase };
  }, [fijos]);

  // Calculate nomina (recargos) per day and total — CON TURNO only (fijos shown separately)
  const nominaByDay = useMemo(() => {
    const dayData: Record<number, {
      personas: number;
      costoNomina: number;
      nightSurcharge: number;
      sundaySurcharge: number;
      overtimeSurcharge: number;
    }> = {};
    for (let i = 0; i < 7; i++) {
      dayData[i] = { personas: 0, costoNomina: 0, nightSurcharge: 0, sundaySurcharge: 0, overtimeSurcharge: 0 };
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
        const recargos = calcularRecargosPuros(st, emp.salario_mensual, isSunday);

        dayData[dayIdx].personas += 1;
        dayData[dayIdx].costoNomina += recargos.total_recargos;
        dayData[dayIdx].nightSurcharge += recargos.night_surcharge;
        dayData[dayIdx].sundaySurcharge += recargos.sunday_surcharge;
        dayData[dayIdx].overtimeSurcharge += recargos.overtime_surcharge;
      }
    }

    return dayData;
  }, [conTurno, shiftTypes, grid]);

  const weeklyNomina = useMemo(() => {
    let totalNomina = 0;
    let totalPersonas = 0;
    let totalNight = 0;
    let totalSunday = 0;
    let totalOvertime = 0;
    for (let i = 0; i < 7; i++) {
      totalNomina += nominaByDay[i].costoNomina;
      totalPersonas += nominaByDay[i].personas;
      totalNight += nominaByDay[i].nightSurcharge;
      totalSunday += nominaByDay[i].sundaySurcharge;
      totalOvertime += nominaByDay[i].overtimeSurcharge;
    }
    return {
      totalNomina: Math.round(totalNomina),
      totalPersonas,
      totalNight: Math.round(totalNight),
      totalSunday: Math.round(totalSunday),
      totalOvertime: Math.round(totalOvertime),
    };
  }, [nominaByDay]);

  // Display order: Lun(1), Mar(2), Mie(3), Jue(4), Vie(5), Sab(6), Dom(0)
  const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  // === PROYECCIÓN MENSUAL ===
  // Salario base crudo (para desglose y referencia)
  const salarioBaseConTurno = useMemo(() =>
    conTurno.reduce((s, e) => s + (e.salario_mensual || 0), 0),
    [conTurno]
  );

  // Costo empresa con-turno (salario + auxilio + prestaciones + aportes) — costo total real
  const costoEmpresaConTurno = useMemo(() => {
    let total = 0;
    for (const emp of conTurno) {
      const sinAux = ((emp.cargo?.toUpperCase().includes('PASANTE') ?? false) && (emp.auxilio_no_salarial || 0) === 0) || (emp.salario_mensual <= 1);
      const costo = calcularCostoEmpresa(emp.salario_mensual || 0, emp.auxilio_no_salarial, sinAux);
      total += costo.costoMensualTotal;
    }
    return total;
  }, [conTurno]);

  // Nómina semanal con-turno: costo empresa semanal + recargos
  const costoEmpresaSemanalConTurno = Math.round(costoEmpresaConTurno / WEEKS_PER_MONTH);
  const nominaSemanalConTurno = costoEmpresaSemanalConTurno + weeklyNomina.totalNomina;

  // Nómina semanal total: con-turno + fijos
  const nominaSemanalFijos = Math.round(fijosData.totalMensual / WEEKS_PER_MONTH);
  const nominaSemanalTotal = nominaSemanalConTurno + nominaSemanalFijos;

  // % Nómina/Ventas semanal (el dato real)
  const nominaSemanalVentasPct = nominaSemanalTotal > 0 && salesData && (salesData.weekly_total.median_per_week || 0) > 0
    ? (nominaSemanalTotal / salesData.weekly_total.median_per_week) * 100
    : 0;

  const nominaTurnosMensual = weeklyNomina.totalNomina > 0
    ? Math.round(weeklyNomina.totalNomina * WEEKS_PER_MONTH)
    : 0;

  const nominaFijosMensual = Math.round(fijosData.totalMensual);

  const costoEmpresaConTurnoMensual = Math.round(costoEmpresaConTurno);
  const nominaTotalMensual = Math.round(costoEmpresaConTurnoMensual + nominaTurnosMensual + nominaFijosMensual);

  const ventasMensuales = salesData && (salesData.weekly_total.median_per_week || 0) > 0
    ? Math.round(salesData.weekly_total.median_per_week * WEEKS_PER_MONTH)
    : 0;

  // Provisiones = (costo empresa con-turno - salario base con-turno) + (costo empresa fijos - salario base fijos)
  // = everything above raw base salaries (prestaciones + aportes patronales)
  const provisionesConTurno = costoEmpresaConTurno - salarioBaseConTurno;
  const provisionesFijos = fijosData.totalMensual - fijosData.totalSalarioBase;
  const provisionesMensuales = Math.round(provisionesConTurno + provisionesFijos);

  // Factor real = costo empresa total / salario base total (raw, para todos)
  const totalSalarioBase = salarioBaseConTurno + fijosData.totalSalarioBase;
  const factorReal = totalSalarioBase > 0 ? nominaTotalMensual / totalSalarioBase : 0;

  const nominaTurnosVentasPct = nominaTurnosMensual > 0 && ventasMensuales > 0
    ? (nominaTurnosMensual / ventasMensuales) * 100
    : 0;

  // Fijo diario total (costo empresa con-turno + fijos) / 30
  const fijoDiarioTotal = (costoEmpresaConTurno + fijosData.totalMensual) / 30;

  const nominaTotalVentasPct = nominaTotalMensual > 0 && ventasMensuales > 0
    ? (nominaTotalMensual / ventasMensuales) * 100
    : 0;

  const sumOfMedians = salesData?.weekly_total?.sum_of_medians || 0;

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
          <div className="text-xs text-[var(--text-secondary)]">Nómina semanal</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">
            {nominaSemanalTotal > 0 ? formatCOP(nominaSemanalTotal) : '-'}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {conTurno.length} con turno + {fijosData.items.length} fijos
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Nómina / Ventas</div>
          <div className={`text-lg font-mono font-semibold ${nominaSemanalVentasPct > 0 ? ratioColor(nominaSemanalVentasPct) : 'text-[var(--text-secondary)]'}`}>
            {nominaSemanalVentasPct > 0 ? `${nominaSemanalVentasPct.toFixed(1)}%` : 'Sin datos'}
          </div>
          {nominaSemanalVentasPct > 0 && (
            <div className="text-[10px] text-[var(--text-secondary)]">
              {ratioLabel(nominaSemanalVentasPct)} · Ley: 20-30% saludable
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
              <div className="text-[11px] text-[var(--text-secondary)]">Costo empresa con turno</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {formatCOP(costoEmpresaConTurnoMensual)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">{conTurno.length} personas</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Recargos turnos</div>
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
              <div className="text-[10px] text-[var(--text-secondary)]">Costo empresa + Recargos + Fijos</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">Ventas mensuales</div>
              <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                {formatCOP(ventasMensuales)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">Mediana semanal × {WEEKS_PER_MONTH.toFixed(2)}</div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-2.5 border border-[var(--border-default)]">
              <div className="text-[11px] text-[var(--text-secondary)]">% Recargos/Ventas</div>
              <div className={`text-sm font-mono font-semibold ${ratioColor(nominaTurnosVentasPct)}`}>
                {nominaTurnosVentasPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">{ratioLabel(nominaTurnosVentasPct)} · Solo recargos</div>
            </div>
            <div className="bg-[var(--accent-primary)]/10 rounded-lg p-2.5 border border-[var(--accent-primary)]/30">
              <div className="text-[11px] text-[var(--accent-primary)]">% Nómina/Ventas</div>
              <div className={`text-sm font-mono font-bold ${ratioColor(nominaTotalVentasPct)}`}>
                {nominaTotalVentasPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">{ratioLabel(nominaTotalVentasPct)} · Costo empresa + Recargos + Fijos</div>
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
              <div className="text-[10px] text-[var(--text-secondary)]">Costo empresa ÷ salario base</div>
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
              <th className="text-right p-2 text-[var(--text-secondary)]">Tx/dia</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Personas</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Fijo diario</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">% Fijo</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">R.Noc</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">R.Dom</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">HE$</th>
              <th className="text-right p-2 text-[var(--text-secondary)] font-medium">Nómina/día</th>
              <th className="text-right p-2 text-[var(--text-secondary)] font-medium">% Total</th>
            </tr>
          </thead>
          <tbody>
            {DISPLAY_ORDER.map(dayIndex => {
              const salesDay = salesData.days.find(d => d.day_index === dayIndex);
              if (!salesDay) return null;
              const nomDay = nominaByDay[dayIndex];
              // Nómina por día = costo empresa con-turno/30 + recargos del día + fijos/30
              const costoEmpresaPerDay = costoEmpresaConTurno / 30;
              const fijosPerDay = fijosData.totalMensual / 30;
              const fijoDiario = costoEmpresaPerDay + fijosPerDay;
              const recargosDia = nomDay.costoNomina;
              const totalDayNomina = fijoDiario + recargosDia;
              const pctFijo = salesDay.median > 0 ? (fijoDiario / salesDay.median) * 100 : 0;
              const pctRecargos = salesDay.median > 0 && recargosDia > 0 ? (recargosDia / salesDay.median) * 100 : 0;
              const pct = salesDay.median > 0 && totalDayNomina > 0
                ? (totalDayNomina / salesDay.median) * 100
                : 0;

              return (
                <tr key={dayIndex} className="border-b border-[var(--border-default)]/50">
                  <td className="p-2 font-medium text-[var(--text-primary)]">
                    {salesDay.day_name}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                    {formatCOP(salesDay.median)}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                    {salesDay.tx_avg}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-secondary)]">
                    {nomDay.personas}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-secondary)]">
                    {formatCOP(Math.round(fijoDiario))}
                  </td>
                  <td className="p-2 text-right font-mono text-[var(--text-secondary)]">
                    {pctFijo > 0 ? `${pctFijo.toFixed(1)}%` : '-'}
                  </td>
                  <td className="p-2 text-right font-mono text-blue-400">
                    {nomDay.nightSurcharge > 0 ? formatCOP(Math.round(nomDay.nightSurcharge)) : '-'}
                  </td>
                  <td className="p-2 text-right font-mono text-amber-400">
                    {nomDay.sundaySurcharge > 0 ? formatCOP(Math.round(nomDay.sundaySurcharge)) : '-'}
                  </td>
                  <td className="p-2 text-right font-mono text-red-400">
                    {nomDay.overtimeSurcharge > 0 ? formatCOP(Math.round(nomDay.overtimeSurcharge)) : '-'}
                  </td>
                  <td className="p-2 text-right font-mono font-medium text-[var(--text-primary)]">
                    {formatCOP(Math.round(totalDayNomina))}
                  </td>
                  <td className={`p-2 text-right font-mono font-semibold ${totalDayNomina > 0 && salesDay.median > 0 ? ratioColor(pct) : 'text-[var(--text-secondary)]'}`}>
                    {totalDayNomina > 0 && salesDay.median > 0 ? `${pct.toFixed(1)}%` : '-'}
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
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">-</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                {weeklyNomina.totalPersonas}
              </td>
              <td className="p-2 text-right font-mono text-[var(--text-secondary)]">
                {formatCOP(Math.round(fijoDiarioTotal * 7))}
              </td>
              <td className="p-2 text-right font-mono text-[var(--text-secondary)]">
                {sumOfMedians > 0 ? `${((fijoDiarioTotal * 7) / sumOfMedians * 100).toFixed(1)}%` : '-'}
              </td>
              <td className="p-2 text-right font-mono text-blue-400">
                {weeklyNomina.totalNight > 0 ? formatCOP(weeklyNomina.totalNight) : '-'}
              </td>
              <td className="p-2 text-right font-mono text-amber-400">
                {weeklyNomina.totalSunday > 0 ? formatCOP(weeklyNomina.totalSunday) : '-'}
              </td>
              <td className="p-2 text-right font-mono text-red-400">
                {weeklyNomina.totalOvertime > 0 ? formatCOP(weeklyNomina.totalOvertime) : '-'}
              </td>
              <td className="p-2 text-right font-mono font-medium text-[var(--text-primary)]">
                {nominaSemanalTotal > 0 ? formatCOP(nominaSemanalTotal) : '-'}
              </td>
              <td className={`p-2 text-right font-mono font-bold ${nominaSemanalTotal > 0 ? ratioColor(nominaSemanalVentasPct) : 'text-[var(--text-secondary)]'}`}>
                {nominaSemanalTotal > 0 ? `${nominaSemanalVentasPct.toFixed(1)}%` : '-'}
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
          const costoEmpresaPerDay = costoEmpresaConTurno / 30;
          const fijosPerDay = fijosData.totalMensual / 30;
          const totalDayNomina = costoEmpresaPerDay + nomDay.costoNomina + fijosPerDay;
          const pct = salesDay.median > 0 && totalDayNomina > 0
            ? (totalDayNomina / salesDay.median) * 100
            : 0;

          return (
            <div key={dayIndex} className="bg-[var(--bg-card)] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-[var(--text-primary)] text-sm">{salesDay.day_name}</div>
                <div className={`font-mono font-semibold text-sm ${totalDayNomina > 0 && salesDay.median > 0 ? ratioColor(pct) : ''}`}>
                  {totalDayNomina > 0 && salesDay.median > 0 ? `${pct.toFixed(1)}%` : '-'}
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
                <div className="text-[var(--text-secondary)]">Fijo diario</div>
                <div className="text-right font-mono text-[var(--text-secondary)]">{formatCOP(Math.round(costoEmpresaPerDay + fijosPerDay))}</div>
                {nomDay.nightSurcharge > 0 && (<><div className="text-[var(--text-secondary)]">R.Nocturno</div><div className="text-right font-mono text-blue-400">{formatCOP(Math.round(nomDay.nightSurcharge))}</div></>)}
                {nomDay.sundaySurcharge > 0 && (<><div className="text-[var(--text-secondary)]">R.Dominical</div><div className="text-right font-mono text-amber-400">{formatCOP(Math.round(nomDay.sundaySurcharge))}</div></>)}
                {nomDay.overtimeSurcharge > 0 && (<><div className="text-[var(--text-secondary)]">Horas Extra$</div><div className="text-right font-mono text-red-400">{formatCOP(Math.round(nomDay.overtimeSurcharge))}</div></>)}
                <div className="font-medium text-[var(--text-primary)]">Nómina/día</div>
                <div className="text-right font-mono font-medium text-[var(--text-primary)]">
                  {formatCOP(Math.round(totalDayNomina))}
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
              <div className={`font-mono font-bold ${nominaSemanalTotal > 0 ? ratioColor(nominaSemanalVentasPct) : 'text-[var(--text-secondary)]'}`}>
                {nominaSemanalTotal > 0 ? `Nóm/Ventas: ${nominaSemanalVentasPct.toFixed(1)}%` : 'Sin nomina'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}