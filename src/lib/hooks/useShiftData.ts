'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type {
  ShiftType,
  ShiftSchedule,
  ShiftAssignment,
  StaffMemberForShift,
  ShiftArea,
} from '@/lib/types/shifts';

export function useShiftData(area: ShiftArea | null, weekStr: string | null) {
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [schedule, setSchedule] = useState<ShiftSchedule | null>(null);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [staff, setStaff] = useState<StaffMemberForShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar tipos de turno
  useEffect(() => {
    async function loadShiftTypes() {
      const { data, error: err } = await supabase
        .from('shift_types')
        .select('*')
        .order('code');

      if (err) {
        setError(err.message);
        return;
      }
      setShiftTypes(data as ShiftType[]);
    }
    loadShiftTypes();
  }, []);

  // Cargar personal del area
  useEffect(() => {
    async function loadStaff() {
      if (!area) return;
      const { data, error: err } = await supabase
        .from('pos_nomina_staff')
        .select('id, nombre_completo, cargo, area, secondary_areas, salario')
        .eq('sede', 'C75')
        .or(`area.eq.${area},secondary_areas.cs.{${area}}`)
        .order('nombre_completo');

      if (err) {
        setError(err.message);
        return;
      }

      // Enriquecer con alias principal
      const staffIds = (data || []).map((s: Record<string, unknown>) => s.id as string);
      const { data: aliases } = await supabase
        .from('staff_aliases')
        .select('employee_id, alias')
        .in('employee_id', staffIds);

      const aliasMap = new Map(
        (aliases || []).map((a: Record<string, unknown>) => [a.employee_id as string, a.alias as string])
      );

      const enriched: StaffMemberForShift[] = (data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        nombre: s.nombre_completo as string,
        cargo: s.cargo as string,
        area: s.area as ShiftArea | 'apoyo',
        secondary_areas: (s.secondary_areas as string[]) || [],
        salario_mensual: Number(s.salario) || 0,
        alias: aliasMap.get(s.id as string) || (s.nombre_completo as string).split(' ')[0],
      }));

      setStaff(enriched);
    }
    loadStaff();
  }, [area]);

  // Cargar cronograma y asignaciones
  const loadSchedule = useCallback(async () => {
    if (!area || !weekStr) return;
    setLoading(true);

    try {
      // Buscar cronograma existente
      const { data: schedData } = await supabase
        .from('shift_schedules')
        .select('*')
        .eq('area', area)
        .eq('week_str', weekStr)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (schedData) {
        setSchedule(schedData as ShiftSchedule);

        // Cargar asignaciones del cronograma
        const { data: assignData } = await supabase
          .from('shift_assignments')
          .select('*')
          .eq('schedule_id', schedData.id);

        setAssignments((assignData || []) as ShiftAssignment[]);
      } else {
        setSchedule(null);
        setAssignments([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [area, weekStr]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Filtrar tipos de turno por area
  const areaShiftTypes = shiftTypes.filter(
    (st) => st.area === area
  );

  return {
    shiftTypes,
    areaShiftTypes,
    schedule,
    assignments,
    staff,
    loading,
    error,
    refresh: loadSchedule,
  };
}