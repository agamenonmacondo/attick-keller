'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Warning, ClockAfternoon, Coffee } from '@phosphor-icons/react';
import type { ShiftType, StaffMemberForShift, ShiftAssignment, ShiftAlert } from '@/lib/types/shifts';
import { calcularCostoTurno, calcularCostoSemanal, formatCOP, getWeekDates, dayIndexToDateIndex, dateToDayIndex } from '@/lib/utils/costCalculator';
import { LEGAL_PARAMS, DAY_NAMES } from '@/lib/types/shifts';

interface ShiftGridProps {
  staff: StaffMemberForShift[];
  shiftTypes: ShiftType[];
  assignments: ShiftAssignment[];
  scheduleId: string | null;
  weekStr: string;
  onAssignmentsChange: (assignments: Record<string, Record<number, string>>) => void;
  readOnly?: boolean;
}

export default function ShiftGrid({
  staff,
  shiftTypes,
  assignments,
  scheduleId,
  weekStr,
  onAssignmentsChange,
  readOnly = false,
}: ShiftGridProps) {
  // Estado local de la grilla
  const [localGrid, setLocalGrid] = useState<Record<string, Record<number, string>>>(() => {
    const initial: Record<string, Record<number, string>> = {};
    for (const s of staff) {
      initial[s.id] = {};
    }
    for (const a of assignments) {
      if (!initial[a.employee_id]) initial[a.employee_id] = {};
      initial[a.employee_id][a.day_index] = a.shift_code;
    }
    return initial;
  });

  // Ref para trackear si el usuario ha hecho cambios locales
  const hasLocalChanges = useRef(false);

  // Reset hasLocalChanges cuando se incrementa la cantidad de asignaciones (post-save)
  const prevAssignmentCount = useRef(assignments.length);
  useEffect(() => {
    // Si assignments crecio y antes habia cambios locales, es porque se guardo exitosamente
    if (assignments.length >= prevAssignmentCount.current && assignments.length > 0 && hasLocalChanges.current) {
      hasLocalChanges.current = false;
    }
    prevAssignmentCount.current = assignments.length;
  }, [assignments.length]);

  // Sincronizar cuando assignments cambia externamente (solo si no hay cambios locales sin guardar)
  const prevAssignmentsRef = useRef(assignments);
  useEffect(() => {
    if (assignments === prevAssignmentsRef.current) return;
    prevAssignmentsRef.current = assignments;

    // Si el usuario hizo cambios locales, no sobreescribir
    if (hasLocalChanges.current) return;

    const newGrid: Record<string, Record<number, string>> = {};
    for (const s of staff) {
      newGrid[s.id] = {};
    }
    for (const a of assignments) {
      if (!newGrid[a.employee_id]) newGrid[a.employee_id] = {};
      newGrid[a.employee_id][a.day_index] = a.shift_code;
    }
    setLocalGrid(newGrid);
  }, [assignments, staff]);

  // Sincronizar cuando staff cambia (agregar/eliminar empleados)
  const prevStaffRef = useRef(staff);
  useEffect(() => {
    if (staff === prevStaffRef.current) return;
    prevStaffRef.current = staff;

    setLocalGrid((prev) => {
      const newGrid: Record<string, Record<number, string>> = {};
      for (const s of staff) {
        newGrid[s.id] = prev[s.id] || {};
      }
      return newGrid;
    });
  }, [staff]);

  // Grid que se pasa al padre - siempre usa la versión más reciente
  const grid = localGrid;

  const weekDates = useMemo(() => getWeekDates(weekStr), [weekStr]);

  const COLUMNS = useMemo(() => [
    { dayIndex: 1, label: 'Lun' },
    { dayIndex: 2, label: 'Mar' },
    { dayIndex: 3, label: 'Mie' },
    { dayIndex: 4, label: 'Jue' },
    { dayIndex: 5, label: 'Vie' },
    { dayIndex: 6, label: 'Sab' },
    { dayIndex: 0, label: 'Dom' },
  ].map((c) => ({
    ...c,
    dateIndex: dayIndexToDateIndex(c.dayIndex),
  })), []);

  // Estadísticas por empleado
  const employeeStats = useMemo(() => {
    const stats: Record<string, {
      totalHours: number;
      dailyHours: Record<number, number>;
      cost: number;
      alerts: ShiftAlert[];
      hasRest: boolean;
      desglose: { base: number; recargoNocturno: number; recargoDominical: number; horasExtra: number };
    }> = {};

    for (const emp of staff) {
      const empGrid = grid[emp.id] || {};
      let totalHours = 0;
      const dailyHours: Record<number, number> = {};
      let cost = 0;
      let baseTotal = 0, rnTotal = 0, rdTotal = 0, heTotal = 0;
      const alerts: ShiftAlert[] = [];
      let diasTrabajados = 0;

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const code = empGrid[dayIdx];
        if (!code || code === 'OFF') {
          dailyHours[dayIdx] = 0;
          continue;
        }
        const st = shiftTypes.find((t) => t.code === code);
        if (!st) { dailyHours[dayIdx] = 0; continue; }

        const hours = st.ordinarias + st.nocturnas;
        dailyHours[dayIdx] = hours;
        totalHours += hours;
        diasTrabajados++;

        const isSunday = dayIdx === 0;
        const costo = calcularCostoTurno(st, emp.salario_mensual, isSunday);
        cost += costo.total;
        baseTotal += costo.base_pay;
        rnTotal += costo.night_surcharge;
        rdTotal += costo.sunday_surcharge;
        heTotal += costo.overtime_surcharge;

        // Alertas
        if (hours > LEGAL_PARAMS.MAX_DAILY_HOURS) {
          alerts.push({ type: 'overtime_daily', employee_id: emp.id, message: `${hours}h supera las ${LEGAL_PARAMS.MAX_DAILY_HOURS}h diarias`, day_index: dayIdx });
        }
      }

      if (totalHours > LEGAL_PARAMS.MAX_WEEKLY_HOURS) {
        alerts.push({
          type: 'overtime_weekly',
          employee_id: emp.id,
          message: `${totalHours}h supera las ${LEGAL_PARAMS.MAX_WEEKLY_HOURS}h semanales`,
        });
      }

      if (diasTrabajados >= 7) {
        alerts.push({
          type: 'no_day_off',
          employee_id: emp.id,
          message: 'Sin dia de descanso semanal',
        });
      }

      stats[emp.id] = {
        totalHours,
        dailyHours,
        cost,
        alerts,
        hasRest: diasTrabajados < 7,
        desglose: {
          base: Math.round(baseTotal),
          recargoNocturno: Math.round(rnTotal),
          recargoDominical: Math.round(rdTotal),
          horasExtra: Math.round(heTotal),
        },
      };
    }
    return stats;
  }, [grid, staff, shiftTypes]);

  // Totales del area
  const areaTotals = useMemo(() => {
    let totalHours = 0, totalCost = 0, totalBase = 0, totalRN = 0, totalRD = 0, totalHE = 0;
    for (const emp of staff) {
      const s = employeeStats[emp.id];
      if (s) {
        totalHours += s.totalHours;
        totalCost += s.cost;
        totalBase += s.desglose.base;
        totalRN += s.desglose.recargoNocturno;
        totalRD += s.desglose.recargoDominical;
        totalHE += s.desglose.horasExtra;
      }
    }
    return { totalHours, totalCost, totalBase, totalRN, totalRD, totalHE };
  }, [employeeStats, staff]);

  const handleCellChange = useCallback(
    (employeeId: string, dayIndex: number, shiftCode: string) => {
      hasLocalChanges.current = true;
      setLocalGrid((prev) => {
        const newGrid = { ...prev };
        if (!newGrid[employeeId]) newGrid[employeeId] = {};
        newGrid[employeeId] = { ...newGrid[employeeId] };
        if (shiftCode === '') {
          delete newGrid[employeeId][dayIndex];
        } else {
          newGrid[employeeId][dayIndex] = shiftCode;
        }
        onAssignmentsChange(newGrid);
        return newGrid;
      });
    },
    [onAssignmentsChange]
  );

  const shiftOptions = useMemo(() => [
    { code: 'OFF', name: 'Descanso', ordinarias: 0, nocturnas: 0, entrada: '', salida: '' },
    ...shiftTypes.map((st) => ({
      code: st.code, name: st.name, ordinarias: st.ordinarias, nocturnas: st.nocturnas, entrada: st.entrada, salida: st.salida,
    })),
  ], [shiftTypes]);

  const getCellBg = (code: string, empId: string, dayIndex: number) => {
    if (!code || code === 'OFF') return 'bg-[var(--bg-card)]';
    const stats = employeeStats[empId];
    if (stats) {
      const hasOvertime = stats.alerts.some((a) => a.type === 'overtime_daily' && a.day_index === dayIndex);
      if (hasOvertime) return 'bg-red-500/20';
      if (stats.totalHours > LEGAL_PARAMS.MAX_WEEKLY_HOURS) return 'bg-red-500/10';
      if (!stats.hasRest) return 'bg-amber-500/10';
    }
    const st = shiftTypes.find((t) => t.code === code);
    if (!st) return 'bg-amber-500/15';
    if (st.area === 'barra') return 'bg-blue-500/15';
    if (st.area === 'servicio') return 'bg-emerald-500/15';
    return 'bg-amber-500/15';
  };

  // Nombre corto del turno para mobile
  const getShiftLabel = (code: string, dayIndex: number) => {
    if (!code) return '';
    if (code === 'OFF') return 'OFF';
    const st = shiftTypes.find((t) => t.code === code);
    const hours = st ? st.ordinarias + st.nocturnas : 0;
    const isSunday = dayIndex === 0;
    const hoursClass = hours > 8 ? 'text-red-400' : isSunday ? 'text-red-300' : 'text-[var(--text-secondary)]';
    return { code, st, hours, hoursClass, isSunday };
  };

  return (
    <div className="space-y-4">
      {/* Alertas globales */}
      {staff.some((emp) => (employeeStats[emp.id]?.alerts.length || 0) > 0) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-red-400 font-medium text-sm">
            <Warning size={16} />
            Alertas legales
          </div>
          {staff.map((emp) =>
            (employeeStats[emp.id]?.alerts || []).map((alert, i) => (
              <div key={`${emp.id}-${i}`} className="text-xs text-red-300 pl-6">
                {emp.alias}: {alert.message}
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== VISTA MOBILE: Tarjetas por empleado ===== */}
      <div className="md:hidden space-y-3">
        {staff.map((emp) => {
          const stats = employeeStats[emp.id];
          const hasWeeklyOvertime = stats && stats.totalHours > LEGAL_PARAMS.MAX_WEEKLY_HOURS;
          const hasNoRest = stats && !stats.hasRest && Object.keys(grid[emp.id] || {}).length > 0;

          return (
            <div key={emp.id} className="bg-[var(--bg-card)] rounded-xl p-3 space-y-2">
              {/* Header del empleado */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[var(--text-primary)] text-sm">{emp.alias}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{emp.cargo}</div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-sm font-medium ${hasWeeklyOvertime ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                    {stats?.totalHours || 0}h
                  </div>
                  <div className="font-mono text-xs text-[var(--text-primary)]">
                    {formatCOP(stats?.cost || 0)}
                  </div>
                </div>
              </div>

              {/* Alertas del empleado */}
              {hasNoRest && (
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <ClockAfternoon size={12} /> Sin descanso semanal
                </div>
              )}

              {/* Selects por día */}
              <div className="grid grid-cols-7 gap-1">
                {COLUMNS.map(({ dayIndex, dateIndex, label }) => {
                  const code = grid[emp.id]?.[dayIndex] || '';
                  const hours = stats?.dailyHours[dayIndex] || 0;
                  const st = code && code !== 'OFF' ? shiftTypes.find((t) => t.code === code) : null;
                  const isSunday = dayIndex === 0;
                  const date = weekDates[dateIndex];

                  return (
                    <div key={dayIndex} className={`rounded-md p-1 text-center ${getCellBg(code, emp.id, dayIndex)}`}>
                      <div className={`text-[10px] font-medium ${isSunday ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                        {label}
                      </div>
                      {date && (
                        <div className="text-[9px] text-[var(--text-secondary)] opacity-70">
                          {date.getDate()}/{date.getMonth() + 1}
                        </div>
                      )}
                      {readOnly ? (
                        <div className="min-h-[28px] flex items-center justify-center">
                          {code && code !== 'OFF' ? (
                            <div>
                              <div className={`text-xs font-bold ${isSunday ? 'text-red-300' : ''}`}>{code}</div>
                              {st && <div className="text-[9px] text-[var(--text-secondary)]">{st.entrada?.slice(0,5)}</div>}
                            </div>
                          ) : code === 'OFF' ? (
                            <Coffee size={14} className="mx-auto text-[var(--text-secondary)]" />
                          ) : null}
                        </div>
                      ) : (
                        <select
                          value={code || ''}
                          onChange={(e) => handleCellChange(emp.id, dayIndex, e.target.value)}
                          className={`w-full min-h-[28px] px-0.5 py-0.5 text-[11px] rounded border-none bg-transparent
                            focus:ring-1 focus:ring-[var(--color-ak-borgona)]/50
                            ${hours > 8 ? 'text-red-400 font-bold' : 'text-[var(--text-primary)]'}
                            ${isSunday ? 'font-semibold' : ''}`}
                        >
                          <option value="">--</option>
                          {shiftOptions.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.code === 'OFF' ? 'OFF' : `${opt.code} ${opt.entrada?.slice(0,5)}-${opt.salida?.slice(0,5)}`}
                            </option>
                          ))}
                        </select>
                      )}
                      {code && code !== 'OFF' && hours > 0 && (
                        <div className={`text-[9px] ${hours > 8 ? 'text-red-400 font-bold' : 'text-[var(--text-secondary)]'}`}>
                          {hours}h
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desglose costo */}
              {stats && stats.cost > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--text-secondary)]">
                  {stats.desglose.base > 0 && <span>B:{formatCOP(stats.desglose.base)}</span>}
                  {stats.desglose.recargoNocturno > 0 && <span className="text-amber-400">RN:{formatCOP(stats.desglose.recargoNocturno)}</span>}
                  {stats.desglose.recargoDominical > 0 && <span className="text-red-400">RD:{formatCOP(stats.desglose.recargoDominical)}</span>}
                  {stats.desglose.horasExtra > 0 && <span className="text-blue-400">HE:{formatCOP(stats.desglose.horasExtra)}</span>}
                </div>
              )}
            </div>
          );
        })}

        {/* Totales mobile */}
        <div className="bg-[var(--bg-card)] rounded-xl p-3 flex items-center justify-between font-semibold">
          <span className="text-[var(--text-primary)]">TOTAL AREA</span>
          <div className="text-right">
            <div className="font-mono text-sm text-[var(--text-primary)]">{areaTotals.totalHours}h</div>
            <div className="font-mono text-xs text-[var(--text-primary)]">{formatCOP(areaTotals.totalCost)}</div>
          </div>
        </div>
      </div>

      {/* ===== VISTA DESKTOP: Tabla ===== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left p-2 text-[var(--text-secondary)] font-medium sticky left-0 bg-[var(--bg-primary)] z-10 min-w-[120px]">
                Colaborador
              </th>
              {COLUMNS.map(({ dayIndex, dateIndex, label }) => {
                const date = weekDates[dateIndex];
                const isSunday = dayIndex === 0;
                return (
                  <th key={dayIndex} className={`text-center p-2 font-medium min-w-[110px]
                    ${isSunday ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                    <div>{label}</div>
                    {date && (
                      <div className={`text-xs ${isSunday ? 'text-red-300' : 'opacity-60'}`}>
                        {date.getDate()}/{date.getMonth() + 1}
                      </div>
                    )}
                  </th>
                );
              })}
              <th className="text-center p-2 text-[var(--text-secondary)] font-medium min-w-[80px]">
                Horas
              </th>
              <th className="text-right p-2 text-[var(--text-secondary)] font-medium min-w-[110px]">
                Costo est.
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((emp) => {
              const stats = employeeStats[emp.id];
              const hasWeeklyOvertime = stats && stats.totalHours > LEGAL_PARAMS.MAX_WEEKLY_HOURS;
              const hasNoRest = stats && !stats.hasRest && Object.keys(grid[emp.id] || {}).length > 0;

              return (
                <tr
                  key={emp.id}
                  className="border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)]/50"
                >
                  <td className="p-2 sticky left-0 bg-[var(--bg-primary)] z-10">
                    <div className="font-medium text-[var(--text-primary)]">{emp.alias}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{emp.cargo}</div>
                  </td>

                  {COLUMNS.map(({ dayIndex, dateIndex }) => {
                    const code = grid[emp.id]?.[dayIndex] || '';
                    const hours = stats?.dailyHours[dayIndex] || 0;
                    const st = code && code !== 'OFF' ? shiftTypes.find((t) => t.code === code) : null;
                    const isSunday = dayIndex === 0;

                    return (
                      <td key={dayIndex} className={`p-1 text-center ${getCellBg(code, emp.id, dayIndex)}`}>
                        {readOnly ? (
                          <div className="py-1 text-xs">
                            {code && code !== 'OFF' ? (
                              <>
                                <div className={`font-bold ${isSunday ? 'text-red-300' : ''}`}>
                                  {code}
                                </div>
                                {st && (
                                  <div className="text-xs text-[var(--text-secondary)]">
                                    {st.entrada}-{st.salida}
                                  </div>
                                )}
                                <div className="text-[var(--text-secondary)]">{hours}h</div>
                              </>
                            ) : code === 'OFF' ? (
                              <Coffee size={14} className="mx-auto text-[var(--text-secondary)]" />
                            ) : null}
                          </div>
                        ) : (
                          <select
                            value={code || ''}
                            onChange={(e) => handleCellChange(emp.id, dayIndex, e.target.value)}
                            className={`w-full px-1 py-1.5 text-xs rounded border-none bg-transparent min-h-[36px]
                              focus:ring-1 focus:ring-[var(--color-ak-borgona)]/50
                              ${hours > 8 ? 'text-red-400 font-bold' : 'text-[var(--text-primary)]'}
                              ${isSunday ? 'font-semibold' : ''}`}
                          >
                            <option value="">--</option>
                            {shiftOptions.map((opt) => (
                              <option key={opt.code} value={opt.code}>
                                {opt.code === 'OFF'
                                  ? 'OFF - Descanso'
                                  : `${opt.code} | ${opt.entrada}-${opt.salida} | ${opt.ordinarias + opt.nocturnas}h`}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    );
                  })}

                  {/* Total horas */}
                  <td className="p-2 text-center">
                    <span className={`font-mono text-sm font-medium
                      ${hasWeeklyOvertime ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                      {stats?.totalHours || 0}h
                    </span>
                    {hasNoRest && (
                      <ClockAfternoon size={12} className="inline ml-1 text-amber-400" />
                    )}
                  </td>

                  {/* Costo estimado */}
                  <td className="p-2 text-right">
                    <div className="font-mono text-sm font-medium text-[var(--text-primary)]">
                      {formatCOP(stats?.cost || 0)}
                    </div>
                    {stats && stats.cost > 0 && (
                      <div className="text-xs text-[var(--text-secondary)] leading-tight">
                        {stats.desglose.base > 0 && <div>B:{formatCOP(stats.desglose.base)}</div>}
                        {stats.desglose.recargoNocturno > 0 && <div>RN:{formatCOP(stats.desglose.recargoNocturno)}</div>}
                        {stats.desglose.recargoDominical > 0 && <div>RD:{formatCOP(stats.desglose.recargoDominical)}</div>}
                        {stats.desglose.horasExtra > 0 && <div>HE:{formatCOP(stats.desglose.horasExtra)}</div>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-[var(--border-default)] font-semibold">
              <td className="p-2 sticky left-0 bg-[var(--bg-primary)] z-10 text-[var(--text-primary)]">
                TOTAL AREA
              </td>
              {COLUMNS.map(({ dayIndex }) => (
                <td key={dayIndex} className="p-2 text-center font-mono text-xs text-[var(--text-secondary)]">
                  {staff.reduce((sum, emp) => sum + (employeeStats[emp.id]?.dailyHours[dayIndex] || 0), 0)}h
                </td>
              ))}
              <td className="p-2 text-center font-mono text-[var(--text-primary)]">
                {areaTotals.totalHours}h
              </td>
              <td className="p-2 text-right font-mono text-[var(--text-primary)]">
                <div className="text-sm">{formatCOP(areaTotals.totalCost)}</div>
                <div className="text-xs text-[var(--text-secondary)] leading-tight">
                  <span>B:{formatCOP(areaTotals.totalBase)}</span>
                  {areaTotals.totalRN > 0 && <span> RN:{formatCOP(areaTotals.totalRN)}</span>}
                  {areaTotals.totalRD > 0 && <span> RD:{formatCOP(areaTotals.totalRD)}</span>}
                  {areaTotals.totalHE > 0 && <span> HE:{formatCOP(areaTotals.totalHE)}</span>}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}