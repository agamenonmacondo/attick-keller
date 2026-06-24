'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { StaffMemberForShift, ShiftType } from '@/lib/types/shifts';
import { calcularRecargosTurnoEmpresa, formatCOP } from '@/lib/utils/costCalculator';
import { LEGAL_PARAMS } from '@/lib/types/shifts';

interface CostEstimationBarProps {
  staff: StaffMemberForShift[];
  shiftTypes: ShiftType[];
  grid: Record<string, Record<number, string>>;
  weekStr: string;
  area?: string;
}

export default function CostEstimationBar({
  staff,
  shiftTypes,
  grid,
  weekStr,
  area,
}: CostEstimationBarProps) {
  const SUNDAY_DAY_INDEX = 0;

  const employeeCosts = useMemo(() => {
    const results: {
      id: string; alias: string; area: string; totalHours: number;
      ho: number; hn: number; he: number;
      recargoNocturno: number; recargoDominical: number; horasExtra: number; totalRecargos: number;
      shiftCodes: string[];
    }[] = [];

    for (const emp of staff) {
      const empGrid = grid[emp.id] || {};
      let totalHours = 0, ho = 0, hn = 0, he = 0;
      let rn = 0, rd = 0, heTotal = 0, totalRecargos = 0;
      const shiftCodes: string[] = [];

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const code = empGrid[dayIdx];
        if (!code || code === 'OFF') continue;
        const st = shiftTypes.find((t) => t.code === code);
        if (!st) continue;
        const hours = st.ordinarias + st.nocturnas;
        ho += st.ordinarias;
        hn += st.nocturnas;
        if (hours > LEGAL_PARAMS.MAX_DAILY_HOURS) he += hours - LEGAL_PARAMS.MAX_DAILY_HOURS;
        totalHours += hours;
        const isSunday = dayIdx === SUNDAY_DAY_INDEX;
        const recargos = calcularRecargosTurnoEmpresa(st, emp.salario_mensual, isSunday);
        rn += recargos.night_surcharge;
        rd += recargos.sunday_surcharge;
        heTotal += recargos.overtime_surcharge;
        totalRecargos += recargos.total_recargos;
        if (!shiftCodes.includes(code)) shiftCodes.push(code);
      }

      results.push({
        id: emp.id, alias: emp.alias, area: emp.area, totalHours,
        ho, hn, he,
        recargoNocturno: Math.round(rn), recargoDominical: Math.round(rd),
        horasExtra: Math.round(heTotal), totalRecargos: Math.round(totalRecargos),
        shiftCodes,
      });
    }
    return results;
  }, [staff, shiftTypes, grid]);

  const kpis = useMemo(() => {
    const totalRecargos = employeeCosts.reduce((s, e) => s + e.totalRecargos, 0);
    const totalHO = employeeCosts.reduce((s, e) => s + e.ho, 0);
    const totalHN = employeeCosts.reduce((s, e) => s + e.hn, 0);
    const totalHE = employeeCosts.reduce((s, e) => s + e.he, 0);
    const totalHours = employeeCosts.reduce((s, e) => s + e.totalHours, 0);
    const totalRN = employeeCosts.reduce((s, e) => s + e.recargoNocturno, 0);
    const totalRD = employeeCosts.reduce((s, e) => s + e.recargoDominical, 0);
    const totalHECost = employeeCosts.reduce((s, e) => s + e.horasExtra, 0);
    return {
      totalRecargos, totalHours, totalHO, totalHN, totalHE,
      totalRN, totalRD, totalHECost,
      avgPerEmployee: employeeCosts.length > 0 ? totalRecargos / employeeCosts.length : 0,
    };
  }, [employeeCosts]);

  const chartData = useMemo(() => {
    return employeeCosts.map((e) => ({
      name: e.alias,
      'R. Nocturno': e.recargoNocturno,
      'R. Dominical': e.recargoDominical,
      'HE/Extra': e.horasExtra,
    }));
  }, [employeeCosts]);

  // Agrupacion por area para modo consolidado
  const areaGroups = useMemo(() => {
    if (area !== 'todos') return null;
    const groups: Record<string, { label: string; employees: typeof employeeCosts; totalRecargos: number; totalHours: number; totalRN: number; totalRD: number; totalHEHours: number; totalHECost: number }> = {};
    const areaLabels: Record<string, string> = { cocina: 'Cocina', barra: 'Barra', servicio: 'Servicio' };
    for (const emp of employeeCosts) {
      const a = emp.area || 'otro';
      if (!groups[a]) groups[a] = { label: areaLabels[a] || a, employees: [], totalRecargos: 0, totalHours: 0, totalRN: 0, totalRD: 0, totalHEHours: 0, totalHECost: 0 };
      groups[a].employees.push(emp);
      groups[a].totalRecargos += emp.totalRecargos;
      groups[a].totalHours += emp.totalHours;
      groups[a].totalRN += emp.recargoNocturno;
      groups[a].totalRD += emp.recargoDominical;
      groups[a].totalHEHours += emp.he;
      groups[a].totalHECost += emp.horasExtra;
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [employeeCosts, area]);

  if (employeeCosts.length === 0) {
    return <div className="text-[var(--text-secondary)] text-center py-8">Sin datos para calcular</div>;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Recargos semanales</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">{formatCOP(kpis.totalRecargos)}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Horas totales</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">{kpis.totalHours}h</div>
          <div className="text-xs text-[var(--text-secondary)]">
            HO:{kpis.totalHO.toFixed(1)} | HN:{kpis.totalHN.toFixed(1)} | HE:{kpis.totalHE.toFixed(1)}
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Promedio/empleado</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">{formatCOP(kpis.avgPerEmployee)}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Desglose recargos</div>
          <div className="text-xs space-y-0.5">
            {kpis.totalRN > 0 && <div className="text-[var(--color-warning)]">R.Noc: {formatCOP(kpis.totalRN)}</div>}
            {kpis.totalRD > 0 && <div className="text-[var(--color-danger)]">R.Dom: {formatCOP(kpis.totalRD)}</div>}
            {kpis.totalHECost > 0 && <div className="text-blue-400">HE: {formatCOP(kpis.totalHECost)}</div>}
          </div>
        </div>
      </div>

      {/* Resumen por area — solo modo consolidado */}
      {areaGroups && areaGroups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {areaGroups.map(([areaKey, group]) => (
            <div key={areaKey} className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-default)]">
              <div className="text-sm font-semibold text-[var(--color-ak-borgona)] mb-2">{group.label}</div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Empleados</span>
                  <span className="font-mono text-[var(--text-primary)]">{group.employees.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Horas</span>
                  <span className="font-mono text-[var(--text-primary)]">{group.totalHours.toFixed(1)}h</span>
                </div>
                {group.totalRN > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">R.Noc</span>
                    <span className="font-mono text-[var(--color-warning)]">{formatCOP(group.totalRN)}</span>
                  </div>
                )}
                {group.totalRD > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">R.Dom</span>
                    <span className="font-mono text-[var(--color-danger)]">{formatCOP(group.totalRD)}</span>
                  </div>
                )}
                {group.totalHEHours > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">HE (horas)</span>
                    <span className="font-mono text-blue-400">{group.totalHEHours.toFixed(1)}h</span>
                  </div>
                )}
                {group.totalHECost > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">HE$</span>
                    <span className="font-mono text-blue-400">{formatCOP(group.totalHECost)}</span>
                  </div>
                )}
                <div className="border-t border-[var(--border-default)] pt-1 flex justify-between text-xs font-semibold">
                  <span className="text-[var(--text-primary)]">Total recargos</span>
                  <span className="font-mono text-[var(--text-primary)]">{formatCOP(group.totalRecargos)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-3">Recargos por empleado</div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--border-default)' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--border-default)' }}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: 12,
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => formatCOP(Number(value))}
            />
            <Legend iconType="circle" iconSize={8} />
            <Bar dataKey="R. Nocturno" stackId="recargos" fill="#fbbf24" />
            <Bar dataKey="R. Dominical" stackId="recargos" fill="#f87171" />
            <Bar dataKey="HE/Extra" stackId="recargos" fill="#60a5fa" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ===== VISTA MOBILE: Tarjetas por empleado ===== */}
      <div className="md:hidden space-y-2">
        {employeeCosts.map((e) => (
          <div key={e.id} className="bg-[var(--bg-card)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-[var(--text-primary)] text-sm">{e.alias}</div>
                <div className="text-[10px] font-mono text-[var(--accent-primary)]">
                  {e.shiftCodes.join(' · ')}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  HO:{e.ho.toFixed(1)} | HN:{e.hn.toFixed(1)} | HE:{e.he.toFixed(1)} | Total: {e.totalHours}h
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold text-[var(--text-primary)]">{formatCOP(e.totalRecargos)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--text-secondary)]">
              {e.recargoNocturno > 0 && <span className="text-[var(--color-warning)]">RN: {formatCOP(e.recargoNocturno)}</span>}
              {e.recargoDominical > 0 && <span className="text-[var(--color-danger)]">RD: {formatCOP(e.recargoDominical)}</span>}
              {e.horasExtra > 0 && <span className="text-blue-400">HE: {formatCOP(e.horasExtra)}</span>}
            </div>
          </div>
        ))}
        {/* Totales mobile */}
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border-t-2 border-[var(--border-default)] font-semibold">
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-primary)]">TOTAL</span>
            <div className="text-right">
              <div className="font-mono text-[var(--text-primary)]">{kpis.totalHours}h</div>
              <div className="font-mono font-bold text-[var(--text-primary)]">{formatCOP(kpis.totalRecargos)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== VISTA DESKTOP: Tabla ===== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left p-2 text-[var(--text-secondary)] sticky left-0 bg-[var(--bg-primary)] z-10 min-w-[100px]">Colaborador</th>
              <th className="text-left p-2 text-[var(--text-secondary)]">Turnos</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">HO</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">HN</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">HE</th>
              <th className="text-right p-2 text-[var(--color-warning)]">R.Noc</th>
              <th className="text-right p-2 text-[var(--color-danger)]">R.Dom</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">HE$</th>
              <th className="text-right p-2 text-[var(--text-secondary)] font-medium">Total Recargos</th>
            </tr>
          </thead>
          <tbody>
            {employeeCosts.map((e) => (
              <tr key={e.id} className="border-b border-[var(--border-default)]/50">
                <td className="p-2 font-medium text-[var(--text-primary)] sticky left-0 bg-[var(--bg-primary)] z-10">{e.alias}</td>
                <td className="p-2 text-[var(--text-secondary)] font-mono text-[10px] leading-tight">{e.shiftCodes.join(', ')}</td>
                <td className="p-2 text-right font-mono text-[var(--text-primary)]">{e.ho.toFixed(1)}</td>
                <td className="p-2 text-right font-mono text-[var(--text-primary)]">{e.hn.toFixed(1)}</td>
                <td className="p-2 text-right font-mono text-[var(--text-primary)]">{e.he.toFixed(1)}</td>
                <td className="p-2 text-right font-mono text-[var(--color-warning)]">{e.recargoNocturno > 0 ? formatCOP(e.recargoNocturno) : '-'}</td>
                <td className="p-2 text-right font-mono text-[var(--color-danger)]">{e.recargoDominical > 0 ? formatCOP(e.recargoDominical) : '-'}</td>
                <td className="p-2 text-right font-mono text-blue-400">{e.horasExtra > 0 ? formatCOP(e.horasExtra) : '-'}</td>
                <td className="p-2 text-right font-mono font-semibold text-[var(--text-primary)]">{formatCOP(e.totalRecargos)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border-default)] font-semibold">
              <td className="p-2 text-[var(--text-primary)] sticky left-0 bg-[var(--bg-primary)] z-10">TOTAL</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">{kpis.totalHO.toFixed(1)}</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">{kpis.totalHN.toFixed(1)}</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">{kpis.totalHE.toFixed(1)}</td>
              <td className="p-2 text-right font-mono text-[var(--color-warning)]">{formatCOP(kpis.totalRN)}</td>
              <td className="p-2 text-right font-mono text-[var(--color-danger)]">{formatCOP(kpis.totalRD)}</td>
              <td className="p-2 text-right font-mono text-blue-400">{formatCOP(kpis.totalHECost)}</td>
              <td className="p-2 text-right font-mono font-bold text-[var(--text-primary)]">{formatCOP(kpis.totalRecargos)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}