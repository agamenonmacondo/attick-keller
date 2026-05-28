'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Warning, ClockClockwise, Sun, Moon, Lightning } from '@phosphor-icons/react';
import type { ShiftArea } from '@/lib/types/shifts';
import { formatCOP } from '@/lib/utils/costCalculator';

interface PerformanceDashboardProps {
  area: ShiftArea;
  weekStr: string;
}

interface PerformanceData {
  kpis: {
    total_horas_ord: number;
    total_horas_noc: number;
    total_horas_ext: number;
    recargo_nocturno: number;
    recargo_dominical: number;
    costo_total: number;
    empleados: number;
  } | null;
  employees: {
    id: string;
    name: string;
    cargo: string;
    ho: number;
    hn: number;
    hed: number;
    hen: number;
    total: number;
    costo: number;
    legal: boolean;
    alerts: string[];
  }[];
  alerts: { employee_id: string; name: string; message: string }[];
}

export default function PerformanceDashboard({ area, weekStr }: PerformanceDashboardProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPerformance() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/shift-performance?area=${area}&week_str=${weekStr}`);
        if (!res.ok) throw new Error('Error cargando performance');
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Error loading performance:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPerformance();
  }, [area, weekStr]);

  const chartData = useMemo(() => {
    if (!data?.employees) return [];
    return data.employees.map((e) => ({
      name: e.name,
      HO: e.ho,
      HN: e.hn,
      HE: e.hed + e.hen,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
        Cargando performance...
      </div>
    );
  }

  if (!data?.kpis) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
        No hay datos de performance para esta semana
      </div>
    );
  }

  const { kpis } = data;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-card)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
            <Sun size={14} /> Horas Ordinarias
          </div>
          <div className="text-2xl font-mono font-semibold text-[var(--text-primary)]">{kpis.total_horas_ord}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
            <Moon size={14} /> Horas Nocturnas
          </div>
          <div className="text-2xl font-mono font-semibold text-blue-400">{kpis.total_horas_noc}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
            <Lightning size={14} /> Horas Extra
          </div>
          <div className="text-2xl font-mono font-semibold text-red-400">{kpis.total_horas_ext}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
            <ClockClockwise size={14} /> Costo Total
          </div>
          <div className="text-2xl font-mono font-semibold text-[var(--text-primary)]">{formatCOP(kpis.costo_total)}</div>
        </div>
      </div>

      {/* Alertas */}
      {data.alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-red-400 font-medium text-sm">
            <Warning size={16} /> Alertas legales
          </div>
          {data.alerts.map((alert, i) => (
            <div key={i} className="text-xs text-red-300 pl-6">
              {alert.name}: {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Distribucion de horas por colaborador
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="HO" stackId="hours" fill="#f59e0b" name="Ordinarias" />
                <Bar dataKey="HN" stackId="hours" fill="#3b82f6" name="Nocturnas" />
                <Bar dataKey="HE" stackId="hours" fill="#ef4444" name="Extra" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla detallada */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Desglose por colaborador
        </h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left p-2 text-[var(--text-secondary)]">Nombre</th>
              <th className="text-center p-2 text-[var(--text-secondary)]">Cargo</th>
              <th className="text-center p-2 text-[var(--text-secondary)]">HO</th>
              <th className="text-center p-2 text-[var(--text-secondary)]">HN</th>
              <th className="text-center p-2 text-[var(--text-secondary)]">HE</th>
              <th className="text-center p-2 text-[var(--text-secondary)]">Total</th>
              <th className="text-right p-2 text-[var(--text-secondary)]">Costo</th>
              <th className="text-center p-2 text-[var(--text-secondary)]">Legal</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map((emp) => (
              <tr key={emp.id} className="border-b border-[var(--border-default)]/50">
                <td className="p-2 text-[var(--text-primary)] font-medium">{emp.name}</td>
                <td className="p-2 text-center text-[var(--text-secondary)]">{emp.cargo}</td>
                <td className="p-2 text-center font-mono">{emp.ho}</td>
                <td className="p-2 text-center font-mono text-blue-400">{emp.hn}</td>
                <td className="p-2 text-center font-mono text-red-400">{emp.hed + emp.hen}</td>
                <td className="p-2 text-center font-mono font-medium">{emp.total}</td>
                <td className="p-2 text-right font-mono">{formatCOP(emp.costo)}</td>
                <td className="p-2 text-center">
                  {emp.legal ? (
                    <span className="text-emerald-400">OK</span>
                  ) : (
                    <div className="space-y-0.5">
                      {emp.alerts.map((alert, i) => (
                        <div key={i} className="text-red-400 text-[10px]">{alert}</div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}