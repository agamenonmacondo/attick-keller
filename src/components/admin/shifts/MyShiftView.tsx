'use client';

import { useState, useEffect } from 'react';
import { ClockAfternoon, MapPin } from '@phosphor-icons/react';
import { formatCOP, getWeekDates } from '@/lib/utils/costCalculator';
import { getLocalDate } from '@/lib/utils/formatDate';
import type { ShiftType } from '@/lib/types/shifts';
import { DAY_NAMES } from '@/lib/types/shifts';

interface MyShiftViewProps {
  userId: string;
  weekStr: string;
}

interface MyAssignment {
  id: string;
  day_index: number;
  shift_code: string;
  estimated_hours: number | null;
  estimated_cost: number | null;
  checkin_at: string | null;
  checkout_at: string | null;
}

export default function MyShiftView({ userId, weekStr }: MyShiftViewProps) {
  const [data, setData] = useState<{
    employee: { nombre_completo: string; alias: string; cargo: string; area: string; salario: number };
    schedule: { id: string; week_str: string; status: string } | null;
    assignments: MyAssignment[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);

  useEffect(() => {
    async function loadMyWeek() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/shift-my-week?week_str=${weekStr}`);
        if (!res.ok) throw new Error('Error');
        const result = await res.json();
        setData(result);

        // Cargar tipos de turno
        if (result.employee?.area) {
          const stRes = await fetch(`/api/admin/shift-schedules?area=${result.employee.area}&week_str=${weekStr}`);
          if (stRes.ok) {
            const stData = await stRes.json();
            setShiftTypes(stData.shift_types || []);
          }
        }
      } catch (err) {
        console.error('Error loading my week:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMyWeek();
  }, [userId, weekStr]);

  const weekDates = getWeekDates(weekStr);

  if (loading) {
    return <div className="text-[var(--text-secondary)] text-center py-8">Cargando mi semana...</div>;
  }

  if (!data?.employee) {
    return <div className="text-[var(--text-secondary)] text-center py-8">Perfil de colaborador no encontrado</div>;
  }

  if (!data.schedule) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
        <ClockAfternoon size={48} className="mx-auto mb-3 opacity-30" />
        <p>No hay cronograma publicado para la semana {weekStr}</p>
        <p className="text-sm mt-1">Contacta a tu lider de area</p>
      </div>
    );
  }

  // Asignaciones indexadas por day_index
  const assignmentMap = new Map(data.assignments.map((a) => [a.day_index, a]));

  // Calcular totales
  let totalHours = 0;
  let totalCost = 0;
  for (const a of data.assignments) {
    totalHours += a.estimated_hours || 0;
    totalCost += a.estimated_cost || 0;
  }

  return (
    <div className="space-y-4">
      {/* Info del empleado */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">{data.employee.alias}</div>
          <div className="text-sm text-[var(--text-secondary)]">{data.employee.cargo} — {data.employee.area}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-[var(--text-secondary)]">Semana {weekStr}</div>
          <div className="text-xs text-[var(--text-secondary)]">{data.schedule.status === 'published' ? 'Publicado' : 'Borrador'}</div>
        </div>
      </div>

      {/* Dias de la semana */}
      <div className="space-y-2">
        {DAY_NAMES.map((day, i) => {
          const assignment = assignmentMap.get(i);
          const st = assignment ? shiftTypes.find((t) => t.code === assignment.shift_code) : null;
          const date = weekDates[i];
          const isToday = date && getLocalDate() === getLocalDate(date);

          return (
            <div
              key={i}
              className={`bg-[var(--bg-card)] rounded-lg p-3 flex items-center justify-between
                ${isToday ? 'ring-2 ring-[var(--accent-primary)]/50' : ''}
                ${!assignment ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 text-center">
                  <div className="text-xs text-[var(--text-secondary)]">{day}</div>
                  {date && (
                    <div className="text-sm font-mono font-medium text-[var(--text-primary)]">
                      {date.getDate()}/{date.getMonth() + 1}
                    </div>
                  )}
                </div>

                {assignment && st ? (
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      {st.code} — {st.name}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {st.entrada} - {st.salida} ({st.ordinarias + st.nocturnas}h)
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--text-secondary)]">Descanso</div>
                )}
              </div>

              {/* Check-in status */}
              {assignment && (
                <div className="text-xs text-[var(--text-secondary)]">
                  {assignment.checkin_at ? (
                    <span className="text-emerald-400">
                      IN {new Date(assignment.checkin_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                  {assignment.checkout_at ? (
                    <span className="text-blue-400 ml-2">
                      OUT {new Date(assignment.checkout_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Totales */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 flex justify-between">
        <div>
          <div className="text-xs text-[var(--text-secondary)]">Horas totales</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">{totalHours}h</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--text-secondary)]">Costo estimado</div>
          <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">{formatCOP(totalCost)}</div>
        </div>
      </div>
    </div>
  );
}