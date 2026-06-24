'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { StaffMemberForShift, ShiftType } from '@/lib/types/shifts';
import { DAY_NAMES, LEGAL_PARAMS } from '@/lib/types/shifts';
import { calcularRecargosTurnoEmpresa, formatCOP } from '@/lib/utils/costCalculator';

interface CostEstimationBarProps {
  staff: StaffMemberForShift[];
  shiftTypes: ShiftType[];
  grid: Record<string, Record<number, string>>;
  weekStr: string;
  area?: string;
}

interface DayDetail {
  dayIndex: number;
  dayName: string;
  shiftCode: string;
  shiftName: string;
  entrada: string;
  salida: string;
  ho: number;
  hn: number;
  he: number;
  recargoNocturno: number;
  recargoDominical: number;
  horasExtra: number;
  totalRecargos: number;
}

interface EmployeeCostRow {
  id: string;
  alias: string;
  area: string;
  totalHours: number;
  ho: number;
  hn: number;
  he: number;
  recargoNocturno: number;
  recargoDominical: number;
  horasExtra: number;
  totalRecargos: number;
  shiftCodes: string[];
  dayDetails: DayDetail[];
}

/* ──────────── Popup content for day-by-day breakdown ──────────── */
function DayDetailPopup({ employee }: { employee: EmployeeCostRow }) {
  return (
    <div className="space-y-1.5">
      {employee.dayDetails.map((d) => {
        const hours = d.ho + d.hn;
        return (
          <div
            key={d.dayIndex}
            className="rounded-md px-3 py-2"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
          >
            {/* Day + Code + Time */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--text-primary)] text-xs">
                {d.dayName}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold"
                style={{
                  background: 'var(--color-ak-borgona)',
                  color: '#fff',
                }}
              >
                {d.shiftCode}
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {d.entrada} – {d.salida}
            </div>

            {/* Hours */}
            <div className="flex gap-3 mt-1 text-[10px]">
              <span className="text-[var(--text-primary)]">
                HO: {d.ho.toFixed(1)}
              </span>
              <span className="text-[var(--text-primary)]">
                HN: {d.hn.toFixed(1)}
              </span>
              {d.he > 0 && (
                <span className="text-blue-400">
                  HE: {d.he.toFixed(1)}
                </span>
              )}
            </div>

            {/* Surcharges (only if > 0) */}
            {(d.recargoNocturno > 0 || d.recargoDominical > 0 || d.horasExtra > 0) && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px]">
                {d.recargoNocturno > 0 && (
                  <span className="text-[var(--color-warning)]">
                    R.Noc: {formatCOP(d.recargoNocturno)}
                  </span>
                )}
                {d.recargoDominical > 0 && (
                  <span className="text-[var(--color-danger)]">
                    R.Dom: {formatCOP(d.recargoDominical)}
                  </span>
                )}
                {d.horasExtra > 0 && (
                  <span className="text-blue-400">
                    HE$: {formatCOP(d.horasExtra)}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Total row */}
      <div
        className="rounded-md px-3 py-2 mt-1"
        style={{ background: 'var(--bg-card)', borderTop: '2px solid var(--color-ak-dorado)' }}
      >
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-[var(--text-primary)]">Total recargos</span>
          <span className="font-mono text-[var(--color-ak-dorado)]">
            {formatCOP(employee.totalRecargos)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CostEstimationBar({
  staff,
  shiftTypes,
  grid,
  weekStr,
  area,
}: CostEstimationBarProps) {
  const SUNDAY_DAY_INDEX = 0;
  const [popupEmpId, setPopupEmpId] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Close popup on outside click
  useEffect(() => {
    if (!popupEmpId) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        // Also check if click was on the trigger itself
        const triggerEl = triggerRefs.current[popupEmpId];
        if (triggerEl && triggerEl.contains(e.target as Node)) {
          return; // let the trigger handle toggle
        }
        setPopupEmpId(null);
        setPopupPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popupEmpId]);

  const handleRowClick = useCallback((empId: string) => {
    if (popupEmpId === empId) {
      setPopupEmpId(null);
      setPopupPosition(null);
    } else {
      // Calculate position from the trigger element
      const triggerEl = triggerRefs.current[empId];
      if (triggerEl) {
        const rect = triggerEl.getBoundingClientRect();
        setPopupPosition({
          top: rect.bottom + window.scrollY + 4,
          left: Math.min(rect.left + window.scrollX, window.innerWidth - 320),
        });
      }
      setPopupEmpId(empId);
    }
  }, [popupEmpId]);

  const closePopup = useCallback(() => {
    setPopupEmpId(null);
    setPopupPosition(null);
  }, []);

  /* ──────────── Compute employee costs with day details ──────────── */
  const employeeCosts = useMemo(() => {
    const results: EmployeeCostRow[] = [];

    for (const emp of staff) {
      const empGrid = grid[emp.id] || {};
      let totalHours = 0, ho = 0, hn = 0, he = 0;
      let rn = 0, rd = 0, heTotal = 0, totalRecargos = 0;
      const shiftCodes: string[] = [];
      const dayDetails: DayDetail[] = [];

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const code = empGrid[dayIdx];
        if (!code || code === 'OFF') continue;
        const st = shiftTypes.find((t) => t.code === code);
        if (!st) continue;
        const hours = st.ordinarias + st.nocturnas;
        const dayHO = st.ordinarias;
        const dayHN = st.nocturnas;
        const dayHE = hours > LEGAL_PARAMS.MAX_DAILY_HOURS ? hours - LEGAL_PARAMS.MAX_DAILY_HOURS : 0;
        ho += dayHO;
        hn += dayHN;
        he += dayHE;
        totalHours += hours;
        const isSunday = dayIdx === SUNDAY_DAY_INDEX;
        const recargos = calcularRecargosTurnoEmpresa(st, emp.salario_mensual, isSunday);
        rn += recargos.night_surcharge;
        rd += recargos.sunday_surcharge;
        heTotal += recargos.overtime_surcharge;
        totalRecargos += recargos.total_recargos;
        if (!shiftCodes.includes(code)) shiftCodes.push(code);

        dayDetails.push({
          dayIndex: dayIdx,
          dayName: DAY_NAMES[dayIdx],
          shiftCode: code,
          shiftName: st.name,
          entrada: st.entrada,
          salida: st.salida,
          ho: dayHO,
          hn: dayHN,
          he: dayHE,
          recargoNocturno: Math.round(recargos.night_surcharge),
          recargoDominical: Math.round(recargos.sunday_surcharge),
          horasExtra: Math.round(recargos.overtime_surcharge),
          totalRecargos: Math.round(recargos.total_recargos),
        });
      }

      results.push({
        id: emp.id, alias: emp.alias, area: emp.area, totalHours,
        ho, hn, he,
        recargoNocturno: Math.round(rn), recargoDominical: Math.round(rd),
        horasExtra: Math.round(heTotal), totalRecargos: Math.round(totalRecargos),
        shiftCodes,
        dayDetails,
      });
    }
    return results;
  }, [staff, shiftTypes, grid]);

  /* ──────────── Filter: only employees with shifts ──────────── */
  const activeEmployees = useMemo(
    () => employeeCosts.filter((e) => e.totalHours > 0),
    [employeeCosts]
  );

  /* ──────────── KPIs computed on active employees only ──────────── */
  const kpis = useMemo(() => {
    const totalRecargos = activeEmployees.reduce((s, e) => s + e.totalRecargos, 0);
    const totalHO = activeEmployees.reduce((s, e) => s + e.ho, 0);
    const totalHN = activeEmployees.reduce((s, e) => s + e.hn, 0);
    const totalHE = activeEmployees.reduce((s, e) => s + e.he, 0);
    const totalHours = activeEmployees.reduce((s, e) => s + e.totalHours, 0);
    const totalRN = activeEmployees.reduce((s, e) => s + e.recargoNocturno, 0);
    const totalRD = activeEmployees.reduce((s, e) => s + e.recargoDominical, 0);
    const totalHECost = activeEmployees.reduce((s, e) => s + e.horasExtra, 0);
    return {
      totalRecargos, totalHours, totalHO, totalHN, totalHE,
      totalRN, totalRD, totalHECost,
      avgPerEmployee: activeEmployees.length > 0 ? totalRecargos / activeEmployees.length : 0,
    };
  }, [activeEmployees]);

  /* ──────────── Chart data ──────────── */
  const chartData = useMemo(() => {
    return activeEmployees.map((e) => ({
      name: e.alias,
      'R. Nocturno': e.recargoNocturno,
      'R. Dominical': e.recargoDominical,
      'HE/Extra': e.horasExtra,
    }));
  }, [activeEmployees]);

  /* ──────────── Area groups (only active employees) ──────────── */
  const areaGroups = useMemo(() => {
    if (area !== 'todos') return null;
    const groups: Record<string, { label: string; employees: EmployeeCostRow[]; totalRecargos: number; totalHours: number; totalRN: number; totalRD: number; totalHEHours: number; totalHECost: number }> = {};
    const areaLabels: Record<string, string> = { cocina: 'Cocina', barra: 'Barra', servicio: 'Servicio' };
    for (const emp of activeEmployees) {
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
  }, [activeEmployees, area]);

  /* ──────────── Popup element for selected employee ──────────── */
  const selectedEmployee = popupEmpId ? activeEmployees.find((e) => e.id === popupEmpId) : null;

  /* ──────────── Desktop popover (positioned absolutely) ──────────── */
  const desktopPopup = selectedEmployee && popupPosition ? (
    <div
      ref={popupRef}
      className="hidden md:block fixed z-50 w-80 max-h-[70vh] overflow-y-auto rounded-xl shadow-2xl"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        top: popupPosition.top,
        left: popupPosition.left,
      }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}>
        <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedEmployee.alias}</span>
        <button
          onClick={closePopup}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-lg leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
      <div className="p-3">
        <DayDetailPopup employee={selectedEmployee} />
      </div>
    </div>
  ) : null;

  /* ──────────── Mobile bottom sheet ──────────── */
  const mobilePopup = selectedEmployee ? (
    <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center" onClick={closePopup}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        ref={popupRef}
        className="relative w-full max-h-[80vh] overflow-y-auto rounded-t-2xl shadow-2xl animate-slide-up"
        style={{ background: 'var(--bg-card)', borderTop: '2px solid var(--color-ak-dorado)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedEmployee.alias}</span>
          <button
            onClick={closePopup}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-lg leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <DayDetailPopup employee={selectedEmployee} />
        </div>
      </div>
    </div>
  ) : null;

  if (activeEmployees.length === 0) {
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
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">{kpis.totalHours.toFixed(1)}h</div>
          <div className="text-xs text-[var(--text-secondary)]">
            HO:{kpis.totalHO.toFixed(1)} | HN:{kpis.totalHN.toFixed(1)} | HE:{kpis.totalHE.toFixed(1)}
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)]">Promedio/empleado</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">{formatCOP(kpis.avgPerEmployee)}</div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {activeEmployees.length} colaborador{activeEmployees.length !== 1 ? 'es' : ''} con turno
          </div>
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
        {activeEmployees.map((e) => (
          <div
            key={e.id}
            ref={(el) => { triggerRefs.current[e.id] = el; }}
            className="bg-[var(--bg-card)] rounded-lg p-3 cursor-pointer hover:bg-[var(--bg-primary)] transition-colors"
            onClick={() => handleRowClick(e.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-[var(--text-primary)] text-sm">{e.alias}</div>
                <div className="text-[10px] font-mono text-[var(--accent-primary)]">
                  {e.shiftCodes.join(' · ')}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  HO:{e.ho.toFixed(1)} | HN:{e.hn.toFixed(1)} | HE:{e.he.toFixed(1)} | Total: {e.totalHours.toFixed(1)}h
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold text-[var(--text-primary)]">{formatCOP(e.totalRecargos)}</div>
                <div className="text-[10px] text-[var(--color-ak-dorado)]">Toca para detalle ▾</div>
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
              <div className="font-mono text-[var(--text-primary)]">{kpis.totalHours.toFixed(1)}h</div>
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
            {activeEmployees.map((e) => (
              <tr
                key={e.id}
                className={`border-b border-[var(--border-default)]/50 cursor-pointer hover:bg-[var(--bg-card)] transition-colors ${
                  popupEmpId === e.id ? 'bg-[var(--bg-card)]' : ''
                }`}
                ref={(el) => { if (el) triggerRefs.current[e.id] = el; }}
                onClick={() => handleRowClick(e.id)}
              >
                <td className="p-2 font-medium text-[var(--text-primary)] sticky left-0 bg-[var(--bg-primary)] z-10">
                  <div className="flex items-center gap-1.5">
                    {e.alias}
                    <span className="text-[var(--color-ak-dorado)] text-[10px]">▾</span>
                  </div>
                </td>
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

      {/* Desktop popover popup */}
      {desktopPopup}

      {/* Mobile bottom sheet popup */}
      {mobilePopup}

      {/* Slide-up animation keyframes */}
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}