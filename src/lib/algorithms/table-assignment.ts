/**
 * Attick & Keller — Table Assignment Algorithm
 *
 * Pure-function automatic table assignment engine for restaurant reservations.
 * No DB calls, no external dependencies — fully testable.
 *
 * Scoring weights:
 *   - Capacity fit:  40%  (how well party fills the table)
 *   - Zone priority: 30%  (popularity, adjusted by time-of-day routing)
 *   - Waste penalty: 20%  (empty seats — inverted, lower waste = better)
 *   - Combine bonus: 10%  (using combinable tables as intended)
 *
 * Core rules:
 *   1. PROTECT combinable tables — couples (≤2pax) never get them unless no other option
 *   2. PRIORITISE large groups first — caller should sort reservations descending
 *   3. COMBINE tables for groups ≥4 when no single table fits
 *   4. RELEGATE small groups (2-3pax) to low-priority zones (E, D)
 *   5. ROUTE BY TIME: early (18:00-19:00) → low zones; peak (20:00-22:00) → high zones
 *   6. NO TABLE ROTATION — each table used ONCE per night
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface TableWithZone {
  id: string;
  number: string;
  zone_letter: string;
  zone_name: string;
  capacity: number;
  capacity_min: number;
  can_combine: boolean;
  combine_group: string | null;
  floor_num: number;
}

export interface ZoneScore {
  zone_letter: string;
  score: number;
  adjusted_score: number;
  acceptance_rate: number;
}

export interface ScoreBreakdown {
  capacity_fit: number;
  zone_priority: number;
  waste_penalty: number;
  combine_bonus: number;
}

export interface Alternative {
  table_id: string;
  combination_id?: string;
  table_numbers: string[];
  zone_letter: string;
  zone_name: string;
  score: number;
  breakdown: ScoreBreakdown;
  reason: string;
}

export interface AssignmentInput {
  reservation: {
    id: string;
    party_size: number;
    date: string;        // YYYY-MM-DD
    time_start: string;  // HH:MM
    time_end: string;    // HH:MM
  };
  available_tables: TableWithZone[];
  existing_reservations: {
    table_id: string;
    time_start: string;
    time_end: string;
  }[];
  combinations: {
    id: string;
    table_ids: string[];
    combined_capacity: number;
    is_active: boolean;
    name: string | null;
  }[];
  /** Optional override for zone scores (used by auto-learning system). */
  zone_scores?: Record<string, number>;
}

export interface AssignmentResult {
  suggested_table_id: string | null;
  suggested_combination_id: string | null;
  alternatives: Alternative[];
  score: number;
  breakdown: ScoreBreakdown;
  reason: string;
}

export interface AvailabilitySlot {
  time: string;
  available: boolean;
  tables_count: number;
}

export interface AvailabilityInput {
  date: string;
  party_size: number;
  available_tables: TableWithZone[];
  existing_reservations: {
    table_id: string;
    time_start: string;
    time_end: string;
  }[];
  combinations: {
    id: string;
    table_ids: string[];
    combined_capacity: number;
    is_active: boolean;
    name: string | null;
  }[];
  service_hours: {
    day_of_week: number;
    open: string;
    close: string;
  }[];
}

// ─── Constants ──────────────────────────────────────────────────────

/** Base zone priority scores. */
export const ZONE_SCORES: Record<string, number> = {
  A: 80,   // Taller
  B: 100,  // Tipi  (highest priority)
  C: 60,   // Jardín
  D: 40,   // Chispas
  E: 20,   // Ático  (lowest priority)
};

const ZONE_NAMES: Record<string, string> = {
  A: 'Taller',
  B: 'Tipi',
  C: 'Jardín',
  D: 'Chispas',
  E: 'Ático',
};

const SCORE_WEIGHTS = {
  CAPACITY_FIT: 0.4,
  ZONE_PRIORITY: 0.3,
  WASTE_PENALTY: 0.2,
  COMBINE_BONUS: 0.1,
} as const;

// ─── Helpers ────────────────────────────────────────────────────────

/** Extract hour number from "HH:MM" string. */
function parseHour(time: string): number {
  return parseInt(time.split(':')[0], 10);
}

/** Check whether two time ranges [start, end) overlap. */
function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Check whether a table is free at a given time window. */
function isTableAvailable(
  tableId: string,
  timeStart: string,
  timeEnd: string,
  existingReservations: { table_id: string; time_start: string; time_end: string }[],
): boolean {
  return !existingReservations.some(
    r =>
      r.table_id === tableId &&
      timesOverlap(timeStart, timeEnd, r.time_start, r.time_end),
  );
}

/**
 * Return the effective zone score adjusted by time-of-day routing.
 *
 * Early evening (18:00 – 19:59): redirect to low zones (D, E).
 * Peak          (20:00 – 21:59): favour high zones (A, B).
 * Other hours:                   use base score.
 */
function getTimeAdjustedZoneScore(zoneLetter: string, timeStart: string): number {
  const base = ZONE_SCORES[zoneLetter] ?? 0;
  const hour = parseHour(timeStart);

  if (hour >= 18 && hour < 20) {
    if (zoneLetter === 'E') return base * 1.2;
    if (zoneLetter === 'D') return base * 1.1;
    if (zoneLetter === 'B') return base * 0.8;
    if (zoneLetter === 'A') return base * 0.9;
    return base;
  }

  if (hour >= 20 && hour < 22) {
    if (zoneLetter === 'B') return base * 1.1;
    if (zoneLetter === 'A') return base * 1.05;
    if (zoneLetter === 'E') return base * 0.8;
    if (zoneLetter === 'D') return base * 0.9;
    return base;
  }

  return base;
}

// ─── Scoring ────────────────────────────────────────────────────────

/**
 * Capacity-fit score (0-100).
 *
 * - party >= capacity_min: ratio of party / capacity  (100 = full table)
 * - party <  capacity_min: severely discounted       (soft constraint)
 * - party >  capacity:     0                          (hard constraint)
 */
function calculateCapacityFit(partySize: number, capacity: number, capacityMin: number): number {
  if (partySize > capacity) return 0;
  if (partySize >= capacityMin) {
    return (partySize / capacity) * 100;
  }
  // Below minimum: steep penalty but not a hard block
  return Math.max(0, (partySize / capacityMin) * 30);
}

/**
 * Waste penalty (0-100). Higher = more empty seats wasted.
 * 0 when party exactly fills capacity.
 */
function calculateWastePenalty(partySize: number, capacity: number): number {
  if (partySize >= capacity) return 0;
  return ((capacity - partySize) / capacity) * 100;
}

/** Combine bonus (100 when tables are combined, 0 otherwise). */
function calculateCombineBonus(isCombination: boolean): number {
  return isCombination ? 100 : 0;
}

/**
 * Total weighted score from breakdown components.
 * Waste is inverted (100 - waste) so lower waste contributes positively.
 */
function calculateTotalScore(breakdown: ScoreBreakdown): number {
  const wasteInverted = Math.max(0, 100 - breakdown.waste_penalty);
  return (
    breakdown.capacity_fit * SCORE_WEIGHTS.CAPACITY_FIT +
    breakdown.zone_priority * SCORE_WEIGHTS.ZONE_PRIORITY +
    wasteInverted * SCORE_WEIGHTS.WASTE_PENALTY +
    breakdown.combine_bonus * SCORE_WEIGHTS.COMBINE_BONUS
  );
}

// ─── Table evaluation ──────────────────────────────────────────────

/**
 * Evaluate a single table (or combined-virtual table) against a reservation.
 *
 * Returns `null` when the party doesn't physically fit (capacity exceeded).
 * Below-minimum parties are penalised but not hard-blocked.
 */
function evaluateTable(
  table: TableWithZone,
  partySize: number,
  timeStart: string,
  isCombination: boolean,
  zoneScoreOverride?: number,
): { breakdown: ScoreBreakdown; score: number } | null {
  if (partySize > table.capacity) return null;

  const capacityFit = calculateCapacityFit(partySize, table.capacity, table.capacity_min);
  const zonePriority = zoneScoreOverride ?? getTimeAdjustedZoneScore(table.zone_letter, timeStart);
  const wastePenalty = calculateWastePenalty(partySize, table.capacity);
  const combineBonus = calculateCombineBonus(isCombination);

  const breakdown: ScoreBreakdown = {
    capacity_fit: round1(capacityFit),
    zone_priority: round1(zonePriority),
    waste_penalty: round1(wastePenalty),
    combine_bonus: combineBonus,
  };

  return { breakdown, score: round1(calculateTotalScore(breakdown)) };
}

/** Round to 1 decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── Combinations ──────────────────────────────────────────────────

/**
 * Find table combinations that can accommodate a party size.
 *
 * Returns active combinations whose total capacity >= partySize and whose
 * member tables are all present in the available set and not overlapping
 * with existing reservations (when reservation data is provided).
 */
export function getCombinationsForPartySize(
  partySize: number,
  tables: TableWithZone[],
  combinations: {
    id: string;
    table_ids: string[];
    combined_capacity: number;
    is_active: boolean;
    name: string | null;
  }[],
  timeStart?: string,
  timeEnd?: string,
  existingReservations?: { table_id: string; time_start: string; time_end: string }[],
): (typeof combinations[0] & { tables: TableWithZone[] })[] {
  const tableMap = new Map(tables.map(t => [t.id, t]));

  return combinations
    .filter(c => {
      if (!c.is_active) return false;
      if (c.combined_capacity < partySize) return false;

      // Every required table must be in the available set
      if (!c.table_ids.every(id => tableMap.has(id))) return false;

      // Optional overlap check
      if (timeStart && timeEnd && existingReservations) {
        return c.table_ids.every(id =>
          isTableAvailable(id, timeStart, timeEnd, existingReservations),
        );
      }
      return true;
    })
    .map(c => ({
      ...c,
      tables: c.table_ids.map(id => tableMap.get(id)!).filter(Boolean),
    }));
}

/**
 * Build virtual "combined table" entries from stored combinations.
 *
 * These are used as scoring candidates alongside single tables so the
 * algorithm can compare them on the same scale.
 */
function buildCombinedTables(
  partySize: number,
  tables: TableWithZone[],
  combinations: {
    id: string;
    table_ids: string[];
    combined_capacity: number;
    is_active: boolean;
    name: string | null;
  }[],
  timeStart: string,
  timeEnd: string,
  existingReservations: { table_id: string; time_start: string; time_end: string }[],
): (TableWithZone & {
  combination_id: string;
  table_ids: string[];
  table_numbers: string[];
})[] {
  const matching = getCombinationsForPartySize(
    partySize,
    tables,
    combinations,
    timeStart,
    timeEnd,
    existingReservations,
  );

  return matching.map(c => {
    const first = c.tables[0];
    const zoneLetters = Array.from(new Set(c.tables.map(t => t.zone_letter)));
    const zoneNames = Array.from(new Set(c.tables.map(t => t.zone_name)));

    return {
      id: `combo-${c.id}`,
      number: c.tables.map(t => t.number).join('+'),
      zone_letter: zoneLetters[0] ?? first.zone_letter,
      zone_name: zoneNames[0] ?? first.zone_name,
      capacity: c.combined_capacity,
      capacity_min: partySize, // guarantee the min-constraint passes
      can_combine: true,
      combine_group: null,
      floor_num: first.floor_num,
      combination_id: c.id,
      table_ids: c.table_ids,
      table_numbers: c.tables.map(t => t.number),
    };
  });
}

// ─── Reason builder ────────────────────────────────────────────────

function buildReason(
  candidate: {
    table: TableWithZone;
    breakdown: ScoreBreakdown;
    score: number;
    isCombination: boolean;
    tableNumbers: string[];
  },
  partySize: number,
  _hour: number,
  zoneName: string,
): string {
  const tableLabel = candidate.isCombination
    ? `Combinación ${candidate.tableNumbers.join(' + ')}`
    : `Mesa ${candidate.table.number}`;

  return `${tableLabel} · ${zoneName} (${candidate.table.zone_letter}) · Cap:${candidate.table.capacity} · Score:${candidate.score.toFixed(1)}`;
}

// ─── Main entry point ──────────────────────────────────────────────

/**
 * Assign the best table(s) for a single reservation.
 *
 * 1. Filters available tables (removes those with time overlap).
 * 2. Evaluates every candidate single table with weighted scoring.
 * 3. For groups ≥4, also evaluates table combinations.
 * 4. Returns the best suggestion + ordered alternatives for the host.
 *
 * Combinable tables are protected from couples (≤2 pax). If no other
 * option exists they are used as a last-resort fallback.
 */
export function assignTable(input: AssignmentInput): AssignmentResult {
  const {
    reservation,
    available_tables: availableTables,
    existing_reservations: existingReservations,
    combinations,
    zone_scores: customZoneScores,
  } = input;

  const {
    party_size: partySize,
    time_start: timeStart,
    time_end: timeEnd,
  } = reservation;

  const getZoneScore = (letter: string): number =>
    customZoneScores?.[letter] ?? ZONE_SCORES[letter] ?? 0;

  // ── 1. Filter by time availability ──
  let candidateTables = availableTables.filter(t =>
    isTableAvailable(t.id, timeStart, timeEnd, existingReservations),
  );

  // Deterministic sort: high-priority zones first
  candidateTables = [...candidateTables].sort(
    (a, b) => getZoneScore(b.zone_letter) - getZoneScore(a.zone_letter),
  );

  // ── 2. Evaluate single tables ──
  const scored: Array<{
    table: TableWithZone;
    breakdown: ScoreBreakdown;
    score: number;
    isCombination: boolean;
    combinationId?: string;
    tableNumbers: string[];
  }> = [];

  for (const table of candidateTables) {
    /* PROTECT combinable tables: couples (≤2pax) skip combinable tables
       unless we fall back to them at the very end. */
    const protectCombinable = partySize <= 2 && table.can_combine;
    if (protectCombinable) continue;

    const evaluated = evaluateTable(
      table,
      partySize,
      timeStart,
      false,
      customZoneScores?.[table.zone_letter],
    );
    if (evaluated) {
      scored.push({
        table,
        ...evaluated,
        isCombination: false,
        tableNumbers: [table.number],
      });
    }
  }

  // ── 3. Evaluate combinations (groups ≥4) ──
  if (partySize >= 4) {
    const combinedTables = buildCombinedTables(
      partySize,
      candidateTables,
      combinations,
      timeStart,
      timeEnd,
      existingReservations,
    );

    for (const ct of combinedTables) {
      const evaluated = evaluateTable(
        ct,
        partySize,
        timeStart,
        true,
        customZoneScores?.[ct.zone_letter],
      );
      if (evaluated) {
        scored.push({
          table: ct,
          ...evaluated,
          isCombination: true,
          combinationId: ct.combination_id,
          tableNumbers: ct.table_numbers,
        });
      }
    }
  }

  // ── 4. Sort descending by score ──
  scored.sort((a, b) => b.score - a.score);

  // ── 5. Build alternatives ──
  const alternatives: Alternative[] = scored.map(c => ({
    table_id: c.table.id,
    combination_id: c.combinationId,
    table_numbers: c.tableNumbers,
    zone_letter: c.table.zone_letter,
    zone_name: c.table.zone_name,
    score: c.score,
    breakdown: c.breakdown,
    reason: buildReason(c, partySize, parseHour(timeStart), ZONE_NAMES[c.table.zone_letter] ?? c.table.zone_name),
  }));

  // ── 6. Fallback: give combinable tables to couples as last resort ──
  if (alternatives.length === 0 && partySize <= 2) {
    for (const table of candidateTables.filter(t => t.can_combine)) {
      const evaluated = evaluateTable(
        table,
        partySize,
        timeStart,
        false,
        customZoneScores?.[table.zone_letter],
      );
      if (evaluated) {
        scored.push({
          table,
          ...evaluated,
          isCombination: false,
          tableNumbers: [table.number],
        });
      }
    }
    scored.sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      const fallback: Alternative[] = scored.map(c => ({
        table_id: c.table.id,
        combination_id: c.combinationId,
        table_numbers: c.tableNumbers,
        zone_letter: c.table.zone_letter,
        zone_name: c.table.zone_name,
        score: c.score,
        breakdown: c.breakdown,
        reason: buildReason(c, partySize, parseHour(timeStart), ZONE_NAMES[c.table.zone_letter] ?? c.table.zone_name),
      }));

      return {
        suggested_table_id: fallback[0].table_id,
        suggested_combination_id: fallback[0].combination_id ?? null,
        alternatives: fallback,
        score: fallback[0].score,
        breakdown: fallback[0].breakdown,
        reason: `Sin otras opciones — mesa combinable asignada a grupo de ${partySize} (${fallback[0].reason})`,
      };
    }
  }

  // ── 7. Return result ──
  if (alternatives.length === 0) {
    return {
      suggested_table_id: null,
      suggested_combination_id: null,
      alternatives: [],
      score: 0,
      breakdown: { capacity_fit: 0, zone_priority: 0, waste_penalty: 0, combine_bonus: 0 },
      reason: `No se encontró mesa disponible para ${partySize} personas a las ${timeStart}`,
    };
  }

  const best = alternatives[0];
  return {
    suggested_table_id: best.table_id,
    suggested_combination_id: best.combination_id ?? null,
    alternatives,
    score: best.score,
    breakdown: best.breakdown,
    reason: best.reason,
  };
}

// ─── Availability ──────────────────────────────────────────────────

/**
 * Generate 30-minute availability slots for a given date and party size.
 *
 * Each slot checks:
 * 1. Single tables where the party fits and are not time-overlapping.
 * 2. (Fallback) table combinations for groups ≥4.
 *
 * Returns one entry per 30-min block within service hours.
 */
export function checkAvailability(input: AvailabilityInput): AvailabilitySlot[] {
  const {
    date,
    party_size: partySize,
    available_tables: availableTables,
    existing_reservations: existingReservations,
    combinations,
    service_hours,
  } = input;

  const dayOfWeek = new Date(date).getDay();
  const dayHours = service_hours.find(h => h.day_of_week === dayOfWeek);
  if (!dayHours) return [];

  const slots: AvailabilitySlot[] = [];
  const openHour = parseHour(dayHours.open);
  const closeHour = parseHour(dayHours.close);

  for (let h = openHour; h < closeHour; h++) {
    for (const m of ['00', '30'] as const) {
      const time = `${String(h).padStart(2, '0')}:${m}`;
      const timeEnd =
        m === '00'
          ? `${String(h).padStart(2, '0')}:30`
          : `${String(h + 1).padStart(2, '0')}:00`;

      let tablesCount = 0;
      let hasAvailability = false;

      // Count single tables that fit (exclude combinable for couples)
      for (const table of availableTables) {
        if (!isTableAvailable(table.id, time, timeEnd, existingReservations)) continue;
        if (partySize > table.capacity) continue;
        if (partySize < table.capacity_min) continue;
        if (partySize <= 2 && table.can_combine) continue; // protect combinable
        tablesCount++;
        hasAvailability = true;
      }

      // Fallback: combinations for groups ≥4
      if (!hasAvailability && partySize >= 4) {
        const matching = getCombinationsForPartySize(
          partySize,
          availableTables,
          combinations,
          time,
          timeEnd,
          existingReservations,
        );
        if (matching.length > 0) {
          tablesCount = matching.length;
          hasAvailability = true;
        }
      }

      // Last resort: include combinable tables for couples
      if (!hasAvailability && partySize <= 2) {
        for (const table of availableTables) {
          if (!isTableAvailable(table.id, time, timeEnd, existingReservations)) continue;
          if (partySize > table.capacity) continue;
          if (partySize < table.capacity_min) continue;
          tablesCount++;
          hasAvailability = true;
        }
      }

      slots.push({ time, available: hasAvailability, tables_count: tablesCount });
    }
  }

  return slots;
}
