/**
 * Algoritmo de Asignación Automática de Mesas — Attick & Keller
 * 
 * Ranking de popularidad de zonas:
 * 1. Tipi (B)    — la más popular
 * 2. Taller (A)  — muy popular
 * 3. Jardín (C)  — popular, bonita
 * 4. Chispas (D)  — para fiesteros, menos demandada
 * 5. Ático (E)   — la menos popular
 * 
 * Reglas:
 * - Asignar mesas a su mayor número de comensales (no desperdiciar mesa grande con grupo pequeño)
 * - Priorizar zona según ranking de popularidad
 * - Si va llenando, seguir asignando sin trabarse
 */

// ─── Tipos ────────────────────────────────────────────────────

export interface RestaurantTable {
  id: string;
  number: string;        // "1A", "2B", etc.
  name_attick: string;   // "Sala 1", "T.P. 20", etc.
  zone_id: string;
  zone_name: string;
  zone_letter: string;  // A, B, C, D, E
  capacity: number;      // max personas
  capacity_min: number;  // min personas
  can_combine: boolean;
  combine_group: string | null;
  floor_num: number;
}

export interface Reservation {
  id: string;
  party_size: number;    // número de comensales
  time: string;          // hora de llegada (para orden)
  customer_name?: string;
}

export interface Assignment {
  reservation: Reservation;
  table: RestaurantTable;
  zone_name: string;
  score: number;         // puntaje de la asignación (para debugging)
  reason: string;        // explicación de por qué se eligió esta mesa
}

// ─── Ranking de popularidad ────────────────────────────────────

const ZONE_PRIORITY: Record<string, number> = {
  'B': 100,  // Tipi — la más popular
  'A': 80,   // Taller — muy popular
  'C': 60,   // Jardín — popular
  'D': 40,   // Chispas — para fiesteros
  'E': 20,   // Ático — la menos popular
};

const ZONE_NAMES: Record<string, string> = {
  'A': 'Taller',
  'B': 'Tipi',
  'C': 'Jardín',
  'D': 'Chispas',
  'E': 'Ático',
};

// ─── Algoritmo de asignación ───────────────────────────────────

/**
 * Calcula el "fit" de una mesa para un grupo.
 * Mejor fit = capacidad más cercana al tamaño del grupo (sin pasar).
 * Penaliza mesas donde sobre mucha capacidad (desperdicio).
 */
function calculateFit(table: RestaurantTable, partySize: number): { fit: number; waste: number } {
  if (partySize > table.capacity) {
    return { fit: -1, waste: Infinity }; // no cabe
  }
  if (partySize < table.capacity_min) {
    // grupo muy pequeño para esta mesa — penalización por desperdicio
    const waste = table.capacity - partySize;
    return { fit: 100 - waste * 15, waste };
  }
  // Grupo cabe perfectamente en rango
  const waste = table.capacity - partySize;
  return { fit: 100 - waste * 10, waste };
}

/**
 * Calcula el puntaje total para una asignación:
 * - fit (qué tan bien se ajusta la capacidad) 
 * - zona (popularidad)
 * Se prioriza fit sobre zona: primero que quepan bien, luego zona preferida.
 */
function calculateScore(fit: number, zonePriority: number, waste: number): number {
  // Fit es más importante (peso 70%), zona es secundario (peso 30%)
  const fitScore = Math.max(0, fit);
  return fitScore * 0.7 + zonePriority * 0.3;
}

/**
 * Asigna automáticamente mesas a reservas en orden de llegada.
 * 
 * @param tables - Mesas disponibles del restaurante
 * @param reservations - Reservas ordenadas por hora de llegada
 * @returns Array de asignaciones + mesas sin asignar
 */
export function assignTables(
  tables: RestaurantTable[],
  reservations: Reservation[]
): {
  assignments: Assignment[];
  unassigned: Reservation[];
  remainingTables: RestaurantTable[];
} {
  const availableTables = [...tables]; // copia mutable
  const assignments: Assignment[] = [];
  const unassigned: Reservation[] = [];

  for (const reservation of reservations) {
    let bestTable: RestaurantTable | null = null;
    let bestScore = -1;
    let bestFit = -1;
    let bestWaste = Infinity;
    let bestReason = '';

    for (const table of availableTables) {
      const { fit, waste } = calculateFit(table, reservation.party_size);
      
      if (fit < 0) continue; // no cabe

      const zonePriority = ZONE_PRIORITY[table.zone_letter] || 0;
      const score = calculateScore(fit, zonePriority, waste);

      let reason = `Fit:${fit.toFixed(0)} Zona:${ZONE_NAMES[table.zone_letter]}(${zonePriority}) Score:${score.toFixed(1)}`;

      if (score > bestScore) {
        bestTable = table;
        bestScore = score;
        bestFit = fit;
        bestWaste = waste;
        bestReason = reason;
      }
    }

    if (bestTable) {
      // Asignar
      assignments.push({
        reservation,
        table: bestTable,
        zone_name: ZONE_NAMES[bestTable.zone_letter] || bestTable.zone_name,
        score: bestScore,
        reason: bestReason,
      });

      // Remover mesa de disponibles
      const idx = availableTables.indexOf(bestTable);
      if (idx > -1) availableTables.splice(idx, 1);
    } else {
      // No encontró mesa
      unassigned.push(reservation);
    }
  }

  return {
    assignments,
    unassigned,
    remainingTables: availableTables,
  };
}

// ─── Generador de mesas de prueba (basado en dato real) ────────

export function generateTestTables(): RestaurantTable[] {
  const tables: RestaurantTable[] = [];

  // Taller (A) — 11 mesas, capacity 2-6
  const tallerCaps = [4, 4, 2, 2, 6, 6, 4, 4, 2, 2, 4];
  tallerCaps.forEach((cap, i) => {
    const num = `${i + 1}A`;
    tables.push({
      id: `t-${num}`,
      number: num,
      name_attick: `T.P. ${20 + i}`,
      zone_id: 'zone-a',
      zone_name: 'Taller',
      zone_letter: 'A',
      capacity: cap,
      capacity_min: Math.max(1, cap - 2),
      can_combine: i >= 3 && i <= 9,
      combine_group: (i >= 3 && i <= 9) ? 'taller_combine' : null,
      floor_num: 1,
    });
  });

  // Tipi (B) — 11 mesas, capacity 2-6
  const tipiCaps = [6, 6, 4, 4, 2, 2, 4, 4, 6, 6, 4];
  tipiCaps.forEach((cap, i) => {
    const num = `${i + 1}B`;
    tables.push({
      id: `t-${num}`,
      number: num,
      name_attick: `Sala ${i + 1}`,
      zone_id: 'zone-b',
      zone_name: 'Tipi',
      zone_letter: 'B',
      capacity: cap,
      capacity_min: Math.max(1, cap - 2),
      can_combine: false,
      combine_group: null,
      floor_num: 1,
    });
  });

  // Jardín (C) — 8 mesas, capacity 2-4
  const jardinCaps = [2, 2, 2, 2, 4, 4, 4, 4];
  jardinCaps.forEach((cap, i) => {
    const num = `${i + 1}C`;
    tables.push({
      id: `t-${num}`,
      number: num,
      name_attick: `Jardín ${i + 1}`,
      zone_id: 'zone-c',
      zone_name: 'Jardín',
      zone_letter: 'C',
      capacity: cap,
      capacity_min: Math.max(1, cap - 1),
      can_combine: i >= 1 && i <= 7,
      combine_group: (i >= 1 && i <= 7) ? 'jardin_combine' : null,
      floor_num: 1,
    });
  });

  // Chispas (D) — 6 mesas, capacity 4-8
  const chispasCaps = [4, 4, 6, 6, 8, 8];
  chispasCaps.forEach((cap, i) => {
    const num = `${i + 1}D`;
    tables.push({
      id: `t-${num}`,
      number: num,
      name_attick: `Chispas ${i + 1}`,
      zone_id: 'zone-d',
      zone_name: 'Chispas',
      zone_letter: 'D',
      capacity: cap,
      capacity_min: Math.max(2, cap - 2),
      can_combine: false,
      combine_group: null,
      floor_num: 1,
    });
  });

  // Ático (E) — 9 mesas, capacity 2-6
  const aticoCaps = [2, 2, 4, 4, 4, 6, 6, 4, 4];
  aticoCaps.forEach((cap, i) => {
    const num = `${i + 1}E`;
    tables.push({
      id: `t-${num}`,
      number: num,
      name_attick: `Ático ${i + 1}`,
      zone_id: 'zone-e',
      zone_name: 'Ático',
      zone_letter: 'E',
      capacity: cap,
      capacity_min: Math.max(1, cap - 2),
      can_combine: false,
      combine_group: null,
      floor_num: 2,
    });
  });

  return tables;
}

// ─── Simulación interactiva ────────────────────────────────────

export function runSimulation(partySizes: number[]): string {
  const tables = generateTestTables();
  const reservations: Reservation[] = partySizes.map((size, i) => ({
    id: `res-${i + 1}`,
    party_size: size,
    time: `19:${(i * 15).toString().padStart(2, '0')}`, // cada 15 min
    customer_name: `Cliente ${i + 1}`,
  }));

  const result = assignTables(tables, reservations);

  let output = '═══════════════════════════════════════\n';
  output +=    '  SIMULACIÓN — Asignación Automática\n';
  output +=    '  Reservas: ' + partySizes.join(', ') + '\n';
  output +=    '═══════════════════════════════════════\n\n';

  result.assignments.forEach((a, i) => {
    output += `✅ Reserva ${i + 1}: ${a.reservation.party_size} personas\n`;
    output += `   → Mesa ${a.table.name_attick} (${a.table.number}) | ${a.zone_name}\n`;
    output += `   → Capacidad: ${a.table.capacity_min}-${a.table.capacity} | Puntaje: ${a.score.toFixed(1)}\n`;
    output += `   → ${a.reason}\n\n`;
  });

  if (result.unassigned.length > 0) {
    output += '⚠️ SIN MESA:\n';
    result.unassigned.forEach((r) => {
      output += `   ❌ ${r.party_size} personas — no encontró mesa disponible\n`;
    });
    output += '\n';
  }

  // Resumen por zona
  const zoneCount: Record<string, number> = {};
  result.assignments.forEach((a) => {
    zoneCount[a.zone_name] = (zoneCount[a.zone_name] || 0) + 1;
  });

  output += '📊 Resumen por zona:\n';
  ['Tipi', 'Taller', 'Jardín', 'Chispas', 'Ático'].forEach((z) => {
    const count = zoneCount[z] || 0;
    const bar = '█'.repeat(count) + '░'.repeat(Math.max(0, 5 - count));
    output += `   ${z.padEnd(8)} ${bar} ${count} reservas\n`;
  });

  output += `\n🪑 Mesas libres: ${result.remainingTables.length}\n`;
  result.remainingTables.forEach((t) => {
    output += `   ${t.name_attick} (${t.number}) — ${t.zone_letter === 'A' ? 'Taller' : t.zone_letter === 'B' ? 'Tipi' : t.zone_letter === 'C' ? 'Jardín' : t.zone_letter === 'D' ? 'Chispas' : 'Ático'} cap:${t.capacity}\n`;
  });

  return output;
}

// ─── Ejecutar desde terminal ───────────────────────────────────

// Si se ejecuta directamente con tsx/node
if (typeof require !== 'undefined' && require.main === module) {
  // Simulación con las reservas de ejemplo: 7, 3, 7, 4, 7, 5
  const result = runSimulation([7, 3, 7, 4, 7, 5]);
  console.log(result);
}