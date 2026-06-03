import { LEGAL_PARAMS, ShiftType, ShiftTypeSegment, ShiftCostEstimate } from '@/lib/types/shifts';

/**
 * Calcula horas ordinarias y nocturnas de un segmento de horario (entrada → salida)
 */
export function calcularHorasSegmento(entrada: string, salida: string): { ordinarias: number; nocturnas: number; total: number } {
  if (!entrada || !salida) return { ordinarias: 0, nocturnas: 0, total: 0 };
  const [eh, em] = entrada.split(':').map(Number);
  const [sh, sm] = salida.split(':').map(Number);
  let entMin = eh * 60 + em;
  let salMin = sh * 60 + sm;
  if (salMin <= entMin) salMin += 1440; // cruza medianoche

  const totalMin = salMin - entMin;
  const total = Math.round((totalMin / 60) * 10) / 10;

  // Minutos nocturnos (21:00-06:00)
  const NOC_INICIO = 21;
  const NOC_FIN = 6;
  let nocMin = 0;
  for (let m = entMin; m < salMin; m += 30) {
    const h = (m / 60) % 24;
    if (h >= NOC_INICIO || h < NOC_FIN) nocMin += 30;
  }
  const nocturnas = Math.round((nocMin / 60) * 10) / 10;
  const ordinarias = Math.round((total - nocturnas) * 10) / 10;

  return { ordinarias, nocturnas, total };
}

/**
 * Calcula horas totales de un turno (simple o partido)
 * Para turnos partidos, suma los segmentos
 */
export function calcularHorasTurno(shiftType: ShiftType): { ordinarias: number; nocturnas: number; total: number } {
  if (shiftType.is_split && shiftType.segments && shiftType.segments.length > 0) {
    let ordinarias = 0;
    let nocturnas = 0;
    for (const seg of shiftType.segments) {
      const h = calcularHorasSegmento(seg.entrada, seg.salida);
      ordinarias += h.ordinarias;
      nocturnas += h.nocturnas;
    }
    // Redondear a 1 decimal
    ordinarias = Math.round(ordinarias * 10) / 10;
    nocturnas = Math.round(nocturnas * 10) / 10;
    return { ordinarias, nocturnas, total: Math.round((ordinarias + nocturnas) * 10) / 10 };
  }
  return { ordinarias: shiftType.ordinarias, nocturnas: shiftType.nocturnas, total: shiftType.ordinarias + shiftType.nocturnas };
}

/**
 * Calcula el valor hora de un empleado (salario / 30 / 8)
 */
export function calcularValorHora(salarioMensual: number): number {
  return salarioMensual / 30 / 8;
}

/**
 * Calcula el costo estimado de un turno para un empleado,
 * siguiendo la ley laboral colombiana:
 *
 * - Recargo nocturno: 35% sobre horas entre 19:00-06:00
 * - Recargo dominical: 75% sobre TODAS las horas del dia domingo
 * - Horas extra diurnas (antes de 19:00): 25% sobre valor hora
 * - Horas extra nocturnas (despues de 19:00): 75% sobre valor hora
 * - HE dominical diurna: 1.05 (recargo compuesto = 75% dom + 25% HE diurna)
 *   => valor hora + valor hora * 0.75 + valor hora * 1.05 = valor hora * (1 + 0.75 + 1.05) NO
 *   => La HE dominical diurna se paga a valor hora * 1.05 ADICIONAL al recargo dominical
 *   => Total por HE domingo diurna = valor hora * (1 + 0.75 + 1.05) = valor hora * 2.80?? NO
 *
 * CORRECTO segun ley colombiana (CST Art 168-179):
 * - Hora ordinaria diurna: 1.0x
 * - Hora ordinaria nocturna: 1.35x (recargo 35%)
 * - Hora ordinaria dominical diurna: 1.75x (recargo 75%)
 * - Hora ordinaria dominical nocturna: 1.75 * 1.35 = 2.3625x
 *   (o mejor: 1.0 + 0.75 dom + 0.35 noct = 2.10x) — no es multiplicativo
 * - HE diurna: 1.25x
 * - HE nocturna: 1.75x
 * - HE dominical diurna: 2.0x (1.0 + 0.75 dom + 0.25 HE = 2.0)
 * - HE dominical nocturna: 2.5x (1.0 + 0.75 dom + 0.75 HE = 2.5)
 */
export function calcularCostoTurno(
  shiftType: ShiftType,
  salarioMensual: number,
  esDomingo: boolean = false
): ShiftCostEstimate {
  const valorHora = calcularValorHora(salarioMensual);
  const { ordinarias, nocturnas } = shiftType;

  // Total de horas del turno
  const totalHoras = ordinarias + nocturnas;

  // Horas extra (exceso sobre 8h diarias)
  const horasExceso = Math.max(0, totalHoras - LEGAL_PARAMS.MAX_DAILY_HOURS);

  // Si hay HE, distribuir el exceso proporcionalmente entre diurnas y nocturnas
  const proporcionNocturna = totalHoras > 0 ? nocturnas / totalHoras : 0;
  const heDiurnas = horasExceso * (1 - proporcionNocturna);
  const heNocturnas = horasExceso * proporcionNocturna;

  // Horas ordinarias netas (sin el exceso que ya se cobro como HE)
  const hoNetas = ordinarias - heDiurnas;
  const hnNetas = nocturnas - heNocturnas;

  let base_pay = 0;
  let night_surcharge = 0;
  let overtime_surcharge = 0;
  let sunday_surcharge = 0;

  if (esDomingo) {
    // DOMINGO: tarifas compuestas
    // Horas ordinarias dominicales diurnas: 1.75x (1.0 base + 0.75 dom)
    base_pay += hoNetas * valorHora * 1.75;
    // Horas ordinarias dominicales nocturnas: 2.10x (1.0 base + 0.75 dom + 0.35 noct)
    base_pay += hnNetas * valorHora * 2.10;
    // HE dominicales diurnas: 2.0x (1.0 base + 0.75 dom + 0.25 HE)
    overtime_surcharge += heDiurnas * valorHora * 2.0;
    // HE dominicales nocturnas: 2.5x (1.0 base + 0.75 dom + 0.75 HE)
    overtime_surcharge += heNocturnas * valorHora * 2.5;

    // Para desglose: el recargo dominical es la parte del 0.75
    // y el recargo nocturno es la parte del 0.35
    sunday_surcharge = totalHoras * valorHora * LEGAL_PARAMS.SUNDAY_SURCHARGE;
    night_surcharge = hnNetas * valorHora * LEGAL_PARAMS.NIGHT_SURCHARGE;
  } else {
    // DIA NORMAL
    // Horas ordinarias diurnas: 1.0x
    base_pay += hoNetas * valorHora;
    // Horas ordinarias nocturnas: 1.35x (1.0 + 0.35 recargo)
    base_pay += hnNetas * valorHora * (1 + LEGAL_PARAMS.NIGHT_SURCHARGE);
    // HE diurnas: 1.25x
    overtime_surcharge += heDiurnas * valorHora * (1 + LEGAL_PARAMS.OVERTIME_DIURNAL);
    // HE nocturnas: 1.75x
    overtime_surcharge += heNocturnas * valorHora * (1 + LEGAL_PARAMS.OVERTIME_NIGHT);

    // Desglose
    night_surcharge = hnNetas * valorHora * LEGAL_PARAMS.NIGHT_SURCHARGE;
    sunday_surcharge = 0;
  }

  // El total se calcula como totalReal dentro de cada branch (domingo / normal)
  // y ya incluye todos los recargos correctamente
  if (esDomingo) {
    const totalReal = (hoNetas * valorHora * 1.75)
      + (hnNetas * valorHora * 2.10)
      + (heDiurnas * valorHora * 2.0)
      + (heNocturnas * valorHora * 2.5);

    return {
      base_pay: Math.round(hoNetas * valorHora + hnNetas * valorHora),
      night_surcharge: Math.round(hnNetas * valorHora * 0.35),
      overtime_surcharge: Math.round(
        heDiurnas * valorHora * 0.25
        + heNocturnas * valorHora * 0.75
      ),
      sunday_surcharge: Math.round(totalHoras * valorHora * 0.75),
      total: Math.round(totalReal),
    };
  } else {
    const totalReal = (hoNetas * valorHora)
      + (hnNetas * valorHora * 1.35)
      + (heDiurnas * valorHora * 1.25)
      + (heNocturnas * valorHora * 1.75);

    return {
      base_pay: Math.round(hoNetas * valorHora + hnNetas * valorHora),
      night_surcharge: Math.round(hnNetas * valorHora * 0.35),
      overtime_surcharge: Math.round(
        heDiurnas * valorHora * 0.25
        + heNocturnas * valorHora * 0.75
      ),
      sunday_surcharge: 0,
      total: Math.round(totalReal),
    };
  }
}

/**
 * Calcula el costo semanal estimado para un empleado
 */
export function calcularCostoSemanal(
  assignments: { shiftType: ShiftType; esDomingo: boolean }[],
  salarioMensual: number
): {
  totalHoras: number;
  horasOrdinarias: number;
  horasNocturnas: number;
  horasExtra: number;
  costoTotal: number;
  tieneDescanso: boolean;
  desglose: { base: number; recargoNocturno: number; recargoDominical: number; horasExtra: number };
} {
  let totalHoras = 0;
  let horasOrdinarias = 0;
  let horasNocturnas = 0;
  let costoTotal = 0;
  let diasTrabajados = 0;
  let baseTotal = 0;
  let recargoNocturno = 0;
  let recargoDominical = 0;
  let horasExtraTotal = 0;

  for (const { shiftType, esDomingo } of assignments) {
    const hours = shiftType.ordinarias + shiftType.nocturnas;
    totalHoras += hours;
    horasOrdinarias += shiftType.ordinarias;
    horasNocturnas += shiftType.nocturnas;
    diasTrabajados++;

    const costo = calcularCostoTurno(shiftType, salarioMensual, esDomingo);
    costoTotal += costo.total;
    baseTotal += costo.base_pay;
    recargoNocturno += costo.night_surcharge;
    recargoDominical += costo.sunday_surcharge;
    horasExtraTotal += costo.overtime_surcharge;
  }

  // Horas extra semanales = exceso sobre 44h
  const horasExtra = Math.max(0, totalHoras - LEGAL_PARAMS.MAX_WEEKLY_HOURS);
  const tieneDescanso = diasTrabajados < 7;

  return {
    totalHoras,
    horasOrdinarias,
    horasNocturnas,
    horasExtra,
    costoTotal,
    tieneDescanso,
    desglose: {
      base: Math.round(baseTotal),
      recargoNocturno: Math.round(recargoNocturno),
      recargoDominical: Math.round(recargoDominical),
      horasExtra: Math.round(horasExtraTotal),
    },
  };
}

/**
 * Calcula el costo total para la empresa (salario + prestaciones + aportes de ley)
 * segun normativa colombiana 2026:
 * - Prima de servicios: 1 mes/12 = 8.33%
 * - Cesantias: 1 mes/12 = 8.33%
 * - Intereses sobre cesantias: 12% anual = 1% mensual
 * - Vacaciones: 15 dias/12 = 4.17%
 * - Aportes patronales:
 *   - Salud (EPS): 8.5% (12.5% total - 4% trabajador)
 *   - Pension: 12% (16% total - 4% trabajador)
 *   - ARL: ~0.522% (depende riesgo, comercio=0.522%)
 *   - Caja de compensacion: 4% (2% antiguedad + 2% ICBF)
 *   - Sena: 2%
 *   - ICBF: 3%
 *   - Auxilio de transporte: solo si gana <= 2 SMLV
 */
export function calcularCostoEmpresa(salarioMensual: number): {
  salarioMensual: number;
  primaServicios: number;
  cesantias: number;
  interesesCesantias: number;
  vacaciones: number;
  aporteSalud: number;
  aportePension: number;
  aporteARL: number;
  aporteCaja: number;
  aporteSena: number;
  aporteICBF: number;
  auxilioTransporte: number;
  costoMensualTotal: number;
  costoDiario: number;
  valorHoraOrdinaria: number;
  valorHoraExtraDiurna: number;
  valorHoraExtraNocturna: number;
  valorHoraNocturna: number;
} {
  const LEGAL_PARAMS_LOCAL = {
    SMMLV: 1750905,
    TRANSPORT_ALLOWANCE: 249095,
    ARL_RATE: 0.00522, // comercio
  };

  const primaServicios = salarioMensual * 8.33 / 100;
  const cesantias = salarioMensual * 8.33 / 100;
  const interesesCesantias = salarioMensual * 1 / 100; // 12% anual = 1% mensual
  const vacaciones = salarioMensual * 4.17 / 100;
  const aporteSalud = salarioMensual * 8.5 / 100;
  const aportePension = salarioMensual * 12 / 100;
  const aporteARL = salarioMensual * LEGAL_PARAMS_LOCAL.ARL_RATE;
  const aporteCaja = salarioMensual * 4 / 100;
  const aporteSena = salarioMensual * 2 / 100;
  const aporteICBF = salarioMensual * 3 / 100;

  // Auxilio de transporte solo si gana <= 2 SMLV
  const auxilioTransporte = salarioMensual <= LEGAL_PARAMS_LOCAL.SMMLV * 2
    ? LEGAL_PARAMS_LOCAL.TRANSPORT_ALLOWANCE
    : 0;

  const prestaciones = primaServicios + cesantias + interesesCesantias + vacaciones;
  const aportesPatronales = aporteSalud + aportePension + aporteARL + aporteCaja + aporteSena + aporteICBF;
  const costoMensualTotal = salarioMensual + auxilioTransporte + prestaciones + aportesPatronales;

  const valorHoraOrdinaria = costoMensualTotal / 30 / 8;
  const valorHoraExtraDiurna = valorHoraOrdinaria * 1.25;
  const valorHoraExtraNocturna = valorHoraOrdinaria * 1.75;
  const valorHoraNocturna = valorHoraOrdinaria * 1.35;

  return {
    salarioMensual,
    primaServicios: Math.round(primaServicios),
    cesantias: Math.round(cesantias),
    interesesCesantias: Math.round(interesesCesantias),
    vacaciones: Math.round(vacaciones),
    aporteSalud: Math.round(aporteSalud),
    aportePension: Math.round(aportePension),
    aporteARL: Math.round(aporteARL),
    aporteCaja: Math.round(aporteCaja),
    aporteSena: Math.round(aporteSena),
    aporteICBF: Math.round(aporteICBF),
    auxilioTransporte,
    costoMensualTotal: Math.round(costoMensualTotal),
    costoDiario: Math.round(costoMensualTotal / 30),
    valorHoraOrdinaria: Math.round(valorHoraOrdinaria),
    valorHoraExtraDiurna: Math.round(valorHoraExtraDiurna),
    valorHoraExtraNocturna: Math.round(valorHoraExtraNocturna),
    valorHoraNocturna: Math.round(valorHoraNocturna),
  };
}

/**
 * Formatea un valor en COP
 */
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Genera el string de semana ISO a partir de una fecha
 * Retorna formato '2026-W23' donde W23 empieza en Lunes
 */
export function getWeekStr(date: Date): string {
  // ISO 8601 week number — proper algorithm
  // Step 1: Find the Thursday of the week containing this date
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday = 7, not 0
  // Set to Thursday of the same week
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  // Step 2: Find Jan 1 of that year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Step 3: Week number = days since Jan 1 / 7 + 1
  const weekNumber = Math.floor((d.getTime() - yearStart.getTime()) / 86400000 / 7) + 1;
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Obtiene las fechas de una semana ISO.
 * Retorna 7 fechas donde index 0 = Lunes, ..., index 6 = Domingo
 * Esto alinea con los day_index de la BD: 0=Dom, 1=Lun, ... 6=Sab
 * NOTA: El array de fechas empieza en Lunes (ISO), no en Domingo.
 * Para usar con day_index de la BD, mapear: day_index 0 (Dom) = fechas[6], day_index 1 (Lun) = fechas[0], etc.
 */
export function getWeekDates(weekStr: string): Date[] {
  const [year, week] = weekStr.split('-W').map(Number);
  // January 4th is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Monday=1, Sunday=7
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d);
  }
  return dates;
  // dates[0] = Lunes, dates[6] = Domingo
}

/**
 * Convierte day_index de BD (0=Dom, 1=Lun, ..., 6=Sab)
 * al indice en el array de getWeekDates() (0=Lun, ..., 6=Dom)
 */
export function dayIndexToDateIndex(dayIndex: number): number {
  // BD: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
  // Dates: 0=Lun, 1=Mar, 2=Mie, 3=Jue, 4=Vie, 5=Sab, 6=Dom
  if (dayIndex === 0) return 6; // Domingo
  return dayIndex - 1; // Lun=0, Mar=1, ..., Sab=5
}

/**
 * Determina si una fecha es domingo
 */
export function esDomingo(date: Date): boolean {
  return date.getDay() === 0;
}

/**
 * Obtiene el day_index de BD (0=Dom, 1=Lun, ..., 6=Sab) a partir de una fecha
 */
export function dateToDayIndex(date: Date): number {
  return date.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
}