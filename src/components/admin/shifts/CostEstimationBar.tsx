'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { StaffMemberForShift, ShiftType } from '@/lib/types/shifts';
import { calcularCostoTurno, calcularCostoSemanal, formatCOP, getWeekDates, dayIndexToDateIndex } from '@/lib/utils/costCalculator';
import { LEGAL_PARAMS } from '@/lib/types/shifts';

interface CostEstimationBarProps {
  staff: StaffMemberForShift[];
  shiftTypes: ShiftType[];
  grid: Record<string, Record<number, string>>;
  weekStr: string;
}

export default function CostEstimationBar({
  staff,
  shiftTypes,
  grid,
  weekStr,
}: CostEstimationBarProps) {
  const SUNDAY_DAY_INDEX = 0;

  const employeeCosts = useMemo(() => {
    const results: {
      id: string; alias: string; area: string; totalHours: number;
      ho: number; hn: number; he: number; base: number;
      recargoNocturno: number; recargoDominical: number; horasExtra: number; total: number;
    }[] = [];

    for (const emp of staff) {
      const empGrid = grid[emp.id] || {};
      let totalHours = 0, ho = 0, hn = 0, he = 0;
      let base = 0, rn = 0, rd = 0, heTotal = 0, total = 0;

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
        const costo = calcularCostoTurno(st, emp.salario_mensual, isSunday);
        base += costo.base_pay;
        rn += costo.night_surcharge;
        rd += costo.sunday_surcharge;
        heTotal += costo.overtime_surcharge;
        total += costo.total;
      }

      results.push({
        id: emp.id, alias: emp.alias, area: emp.area, totalHours,
        ho, hn, he, base: Math.round(base),
        recargoNocturno: Math.round(rn), recargoDominical: Math.round(rd),
        horasExtra: Math.round(heTotal), total: Math.round(total),
      });
    }
    return results;
  }, [staff, shiftTypes, grid]);

  const kpis = useMemo(() => {
    const totalCost = employeeCosts.reduce((s, e) => s + e.total, 0);
    const totalHO = employeeCosts.reduce((s, e) => s + e.ho, 0);
    const totalHN = employeeCosts.reduce((s, e) => s + e.hn, 0);
    const totalHE = employeeCosts.reduce((s, e) => s + e.he, 0);
    const totalHours = employeeCosts.reduce((s, e) => s + e.totalHours, 0);
    const totalBase = employeeCosts.reduce((s, e) => s + e.base, 0);
    const totalRN = employeeCosts.reduce((s, e) => s + e.recargoNocturno, 0);
    const totalRD = employeeCosts.reduce((s, e) => s + e.recargoDominical, 0);
    const totalHECost = employeeCosts.reduce((s, e) => s + e.horasExtra, 0);
    return {
      totalCost, totalHours, totalHO, totalHN, totalHE,
      totalBase, totalRN, totalRD, totalHECost,
      avgPerEmployee: employeeCosts.length > 0 ? totalCost / employeeCosts.length : 0,
    };
  }, [employeeCosts]);

  const chartData = useMemo(() => {
    return employeeCosts.map((e) => ({
      name: e.alias,
      Base: e.base,
      'R. Nocturno': e.recargoNocturno,
      'R. Dominical': e.recargoDominical,
      'HE/Extra': e.horasExtra,
    }));
  }, [employeeCosts]);

  if (employeeCosts.length === 0) {
    return <div className="text-[var(--text-secondary)] text-center py-8">Sin datos para calcular</div>;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Costo total semana</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">{formatCOP(kpis.totalCost)}</div>
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
          <div className="text-xs text-[var(--text-secondary)]">Desglose</div>
          <div className="text-xs space-y-0.5">
            <div className="text-[var(--text-primary)]">Base: {formatCOP(kpis.totalBase)}</div>
            {kpis.totalRN > 0 && <div className="text-amber-400">R.Noc: {formatCOP(kpis.totalRN)}</div>}
            {kpis.totalRD > 0 && <div className="text-red-400">R.Dom: {formatCOP(kpis.totalRD)}</div>}
            {kpis.totalHECost > 0 && <div className="text-blue-400">HE: {formatCOP(kpis.totalHECost)}</div>}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-3">Costo por empleado</div>
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
            <Bar dataKey="Base" stackId="cost" fill="#4ade80" />
            <Bar dataKey="R. Nocturno" stackId="cost" fill="#fbbf24" />
            <Bar dataKey="R. Dominical" stackId="cost" fill="#f87171" />
            <Bar dataKey="HE/Extra" stackId="cost" fill="#60a5fa" />
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
                <div className="text-xs text-[var(--text-secondary)]">
                  HO:{e.ho.toFixed(1)} | HN:{e.hn.toFixed(1)} | HE:{e.he.toFixed(1)} | Total: {e.totalHours}h
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold text-[var(--text-primary)]">{formatCOP(e.total)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--text-secondary)]">
              <span>Base: {formatCOP(e.base)}</span>
              {e.recargoNocturno > 0 && <span className="text-amber-400">RN: {formatCOP(e.recargoNocturno)}</span>}
              {e.recargoDominical > 0 && <span className="text-red-400">RD: {formatCOP(e.recargoDominical)}</span>}
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
              <div className="font-mono font-bold text-[var(--text-primary)]">{formatCOP(kpis.totalCost)}</div>
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
              <th className="text-right p-2 text-[var(--text-secondary)]">HO</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">HN</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">HE</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Total</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Base</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">R.Noc</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">R.Dom</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">HE$</th>
              <th className="text-right p-2 text-[var(--text-secondary)] font-medium">Costo Est.</th>
            </tr>
          </thead>
          <tbody>
            {employeeCosts.map((e) => (
              <tr key={e.id} className="border-b border-[var(--border-default)]/50">
                <td className="p-2 font-medium text-[var(--text-primary)] sticky left-0 bg-[var(--bg-primary)] z-10">{e.alias}</td>
                <td className="p-2 text-right font-mono text-[var(--text-primary)]">{e.ho.toFixed(1)}</td>
                <td className="p-2 text-right font-mono text-[var(--text-primary)]">{e.hn.toFixed(1)}</td>
                <td className="p-2 text-right font-mono text-[var(--text-primary)]">{e.he.toFixed(1)}</td>
                <td className="p-2 text-right font-mono text-[var(--text-primary)]">{e.totalHours}h</td>
                <td className="p-2 text-right font-mono">{formatCOP(e.base)}</td>
                <td className="p-2 text-right font-mono text-amber-400">{e.recargoNocturno > 0 ? formatCOP(e.recargoNocturno) : '-'}</td>
                <td className="p-2 text-right font-mono text-red-400">{e.recargoDominical > 0 ? formatCOP(e.recargoDominical) : '-'}</td>
                <td className="p-2 text-right font-mono text-blue-400">{e.horasExtra > 0 ? formatCOP(e.horasExtra) : '-'}</td>
                <td className="p-2 text-right font-mono font-semibold text-[var(--text-primary)]">{formatCOP(e.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border-default)] font-semibold">
              <td className="p-2 text-[var(--text-primary)] sticky left-0 bg-[var(--bg-primary)] z-10">TOTAL</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">{kpis.totalHO.toFixed(1)}</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">{kpis.totalHN.toFixed(1)}</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">{kpis.totalHE.toFixed(1)}</td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">{kpis.totalHours}h</td>
              <td className="p-2 text-right font-mono">{formatCOP(kpis.totalBase)}</td>
              <td className="p-2 text-right font-mono text-amber-400">{formatCOP(kpis.totalRN)}</td>
              <td className="p-2 text-right font-mono text-red-400">{formatCOP(kpis.totalRD)}</td>
              <td className="p-2 text-right font-mono text-blue-400">{formatCOP(kpis.totalHECost)}</td>
              <td className="p-2 text-right font-mono font-bold text-[var(--text-primary)]">{formatCOP(kpis.totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}