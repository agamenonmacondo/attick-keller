'use client';
import { useState, useEffect } from 'react';

export interface MonthlyNominaSemana {
  week_str: string;
  costo: number;
  personas: number;
}

export interface MonthlyNominaEmpleado {
  id: string;
  nombre: string;
  costo: number;
  turnos: number;
  is_fixed_salary?: boolean;
}

export interface MonthlyNomina {
  month: string;
  area: string;
  total_costo_empresa: number;
  total_personas: number;
  semanas: MonthlyNominaSemana[];
  empleados: MonthlyNominaEmpleado[];
  lideres_fijos: MonthlyNominaEmpleado[];
}

export interface MonthlySalesSemana {
  week_str: string;
  ventas: number;
  cheques: number;
}

export interface MonthlySales {
  month: string;
  total_ventas: number;
  total_cheques: number;
  dias_abiertos: number;
  por_semana: MonthlySalesSemana[];
}

interface MonthlyAccumulatedState {
  nomina: MonthlyNomina | null;
  sales: MonthlySales | null;
  loading: boolean;
}

// Hook que trae el acumulado real del mes: nómina (costo empresa) y ventas.
// Refetch cuando cambian month o area.
export function useMonthlyAccumulated(month: string | null, area: string): MonthlyAccumulatedState {
  const [state, setState] = useState<MonthlyAccumulatedState>({
    nomina: null,
    sales: null,
    loading: true,
  });

  useEffect(() => {
    if (!month) {
      setState({ nomina: null, sales: null, loading: false });
      return;
    }

    let cancelled = false;
    setState(prev => ({ ...prev, loading: true }));

    Promise.all([
      fetch(`/api/admin/monthly-nomina?month=${encodeURIComponent(month)}&area=${encodeURIComponent(area)}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
      fetch(`/api/admin/monthly-sales?month=${encodeURIComponent(month)}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ]).then(([nomina, sales]) => {
      if (cancelled) return;
      setState({ nomina: nomina || null, sales: sales || null, loading: false });
    });

    return () => { cancelled = true; };
  }, [month, area]);

  return state;
}