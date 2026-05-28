// Tipos para el modulo de Turnos y Nomina

export type ShiftArea = 'cocina' | 'barra' | 'servicio';

export type ShiftStatus = 'draft' | 'published' | 'approved';

export type NovedadType = 'vacaciones' | 'incapacidad' | 'permiso' | 'turnante';

export type CheckinType = 'checkin' | 'checkout' | 'falta' | 'tarde' | 'permiso' | 'incapacidad';

export type StaffArea = 'cocina' | 'barra' | 'servicio' | 'apoyo' | 'admin';

export type ContractType = 'fijo' | 'turnante';

export interface StaffMember {
  id: string;
  nombre_completo: string;
  cargo: string;
  area: StaffArea;
  contrato: ContractType;
  cedula: string | null;
  correo: string | null;
  salario_mensual: number;
  alias: string;
  secondary_areas: string[];
  sede: string;
  activo: boolean;
}

export interface ShiftType {
  id: string;
  code: string;
  name: string;
  area: ShiftArea;
  entrada: string; // HH:MM
  salida: string; // HH:MM
  ordinarias: number;
  nocturnas: number;
  is_split: boolean;
  description: string | null;
}

export interface ShiftSchedule {
  id: string;
  restaurant_id: string;
  area: ShiftArea;
  week_str: string; // '2026-W23'
  created_by: string | null;
  status: ShiftStatus;
  version: number;
  total_estimated_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: string;
  schedule_id: string;
  employee_id: string;
  day_index: number; // 0=Dom, 1=Lun, ..., 6=Sab
  shift_code: string;
  entrada: string | null; // override
  salida: string | null; // override
  novedad: NovedadType | null;
  turnante_nombre: string | null;
  is_overtime: boolean;
  estimated_hours: number | null;
  estimated_cost: number | null;
  checkin_at: string | null;
  checkout_at: string | null;
  checkin_location: { lat: number; lng: number; accuracy: number } | null;
  checkout_location: { lat: number; lng: number; accuracy: number } | null;
  created_at: string;
}

export interface ShiftNovedad {
  id: string;
  employee_id: string;
  schedule_id: string | null;
  date: string;
  type: CheckinType;
  checkin_at: string | null;
  checkout_at: string | null;
  location: { lat: number; lng: number; accuracy: number } | null;
  description: string | null;
  created_at: string;
}

export interface StaffAlias {
  id: string;
  employee_id: string;
  alias: string;
  source: 'excel' | 'rodri' | 'interno' | 'colombia';
  created_at: string;
}

// Nombres de dias (ISO: Lun=0 ... Dom=6) — ya declarado en shifts.ts
// (usar DAY_NAMES de shifts.ts directamente)

// Empleado extendido con datos de nomina para la grilla
export interface StaffMemberForShift {
  id: string;
  nombre: string;
  cargo: string;
  area: StaffArea;
  secondary_areas: string[];
  salario_mensual: number;
  alias: string; // alias principal para mostrar en UI
}

// Resultado de calculo de costo por turno
export interface ShiftCostEstimate {
  base_pay: number;
  night_surcharge: number;
  overtime_surcharge: number;
  sunday_surcharge: number;
  total: number;
}

// Grilla semanal — estructura para el frontend
export interface WeeklyShiftGrid {
  schedule: ShiftSchedule;
  employees: StaffMemberForShift[];
  assignments: ShiftAssignment[]; // flat, indexed by employee_id + day_index
  shift_types: ShiftType[];
  total_hours: number;
  total_cost: number;
  alerts: ShiftAlert[];
}

export interface ShiftAlert {
  type: 'overtime_weekly' | 'overtime_daily' | 'no_day_off' | 'missing_assignment';
  employee_id: string;
  day_index?: number;
  message: string;
}

// Parametros legales Colombia
export const LEGAL_PARAMS = {
  MAX_WEEKLY_HOURS: 44,
  MAX_DAILY_HOURS: 8,
  NIGHT_SURCHARGE: 0.35,     // 19:00-06:00
  SUNDAY_SURCHARGE: 0.75,     // Todo el dia domingo
  OVERTIME_DIURNAL: 0.25,     // HE antes de 19:00
  OVERTIME_NIGHT: 0.75,      // HE despues de 19:00
  OVERTIME_SUNDAY_DIURNAL: 1.05,  // HE domingo antes de 19:00
  OVERTIME_SUNDAY_NIGHT: 1.55,    // HE domingo despues de 19:00
  NIGHT_START: 19, // horas (19:00)
  NIGHT_END: 6,    // horas (06:00)
  TRANSPORT_ALLOWANCE: 249095, // Auxilio transporte 2026
  MIN_SALARY: 1423500,       // Salario minimo 2026
} as const;

// Colores por tipo de turno (para la grilla)
export const SHIFT_COLORS: Record<ShiftArea, string> = {
  cocina: 'var(--color-ak-borgona)',
  barra: 'var(--color-ak-dorado)',
  servicio: 'var(--color-ak-verde, #22c55e)',
};

// Nombres de dias (0=Dom, 1=Lun ... 6=Sab, segun day_index de BD)
export const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];