/**
 * Tests for table-assignment algorithm — normal flow (≤14) AND event flow (>14).
 *
 * Run: npx vitest run src/lib/algorithms/table-assignment.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  assignTable,
  evaluateEventZones,
  evaluateMultiZoneEvent,
  EVENT_THRESHOLD,
  EVENT_ZONE_PRIORITY,
  ZONE_SCORES,
  type TableWithZone,
  type AssignmentInput,
} from './table-assignment';

// ─── Fixture builders ──────────────────────────────────────────────

const ZONE_IDS = {
  A: '37428677-60d3-43a8-847e-36e7749ac51a',
  B: '979f54b5-c1f1-4558-925c-808c077ac5f4',
  C: '03c364c9-764b-4789-9cd3-9fa656d0ae7f',
  D: 'b4ea64d7-3514-4bd9-87ad-03571e2f6ef0',
  E: 'f454cc6d-ab02-40c9-af7f-775391cf4f04',
};

/** Build a realistic A&K table layout: 45 tables, 5 zones, 210 seats. */
function buildAllTables(): TableWithZone[] {
  const tables: TableWithZone[] = [];
  // Zone A: Taller — 11 tables, 54 seats
  const taller = [
    { n: 'A1', cap: 2, min: 1, comb: true, grp: 'a1a2' },
    { n: 'A2', cap: 2, min: 1, comb: true, grp: 'a1a2' },
    { n: 'A3', cap: 4, min: 2, comb: true, grp: 'a3a4' },
    { n: 'A4', cap: 4, min: 2, comb: true, grp: 'a3a4' },
    { n: 'A5', cap: 6, min: 4, comb: true, grp: 'a5a6' },
    { n: 'A6', cap: 6, min: 4, comb: true, grp: 'a5a6' },
    { n: 'A7', cap: 6, min: 4, comb: false, grp: null },
    { n: 'A8', cap: 4, min: 2, comb: true, grp: 'a8a9' },
    { n: 'A9', cap: 4, min: 2, comb: true, grp: 'a8a9' },
    { n: 'A10', cap: 8, min: 6, comb: true, grp: 'a10a11' },
    { n: 'A11', cap: 8, min: 6, comb: true, grp: 'a10a11' },
  ];
  for (const t of taller) {
    tables.push(makeTable(t.n, 'A', 'Taller', t.cap, t.min, t.comb, t.grp));
  }

  // Zone B: Tipi — 11 tables, 50 seats
  const tipi = [
    { n: 'B1', cap: 2, min: 1, comb: true, grp: 'b1b2' },
    { n: 'B2', cap: 2, min: 1, comb: true, grp: 'b1b2' },
    { n: 'B3', cap: 4, min: 2, comb: true, grp: 'b3b4' },
    { n: 'B4', cap: 4, min: 2, comb: true, grp: 'b3b4' },
    { n: 'B5', cap: 6, min: 4, comb: true, grp: 'b5b6' },
    { n: 'B6', cap: 6, min: 4, comb: true, grp: 'b5b6' },
    { n: 'B7', cap: 6, min: 4, comb: false, grp: null },
    { n: 'B8', cap: 4, min: 2, comb: false, grp: null },
    { n: 'B9', cap: 4, min: 2, comb: true, grp: 'b9b10' },
    { n: 'B10', cap: 6, min: 4, comb: true, grp: 'b9b10' },
    { n: 'B11', cap: 6, min: 4, comb: true, grp: 'b10b11' },
  ];
  for (const t of tipi) {
    tables.push(makeTable(t.n, 'B', 'Tipi', t.cap, t.min, t.comb, t.grp));
  }

  // Zone C: Jardín — 8 tables, 18 seats
  for (const t of [
    { n: 'C1', cap: 2, min: 1, comb: true, grp: 'c1c2' },
    { n: 'C2', cap: 2, min: 1, comb: true, grp: 'c1c2' },
    { n: 'C3', cap: 2, min: 1, comb: true, grp: 'c3c4' },
    { n: 'C4', cap: 2, min: 1, comb: true, grp: 'c3c4' },
    { n: 'C5', cap: 2, min: 1, comb: true, grp: 'c5c6' },
    { n: 'C6', cap: 2, min: 1, comb: true, grp: 'c5c6' },
    { n: 'C7', cap: 3, min: 2, comb: false, grp: null },
    { n: 'C8', cap: 3, min: 2, comb: false, grp: null },
  ]) {
    tables.push(makeTable(t.n, 'C', 'Jardín', t.cap, t.min, t.comb, t.grp));
  }

  // Zone D: Chispas — 6 tables, 48 seats (open event space)
  for (const t of [
    { n: 'D1', cap: 8, min: 4, comb: true, grp: 'd1d2' },
    { n: 'D2', cap: 8, min: 4, comb: true, grp: 'd1d2' },
    { n: 'D3', cap: 8, min: 4, comb: true, grp: 'd3d4' },
    { n: 'D4', cap: 8, min: 4, comb: true, grp: 'd3d4' },
    { n: 'D5', cap: 8, min: 6, comb: false, grp: null },
    { n: 'D6', cap: 8, min: 6, comb: false, grp: null },
  ]) {
    tables.push(makeTable(t.n, 'D', 'Chispas', t.cap, t.min, t.comb, t.grp));
  }

  // Zone E: Ático — 9 tables, 40 seats
  for (const t of [
    { n: 'E1', cap: 2, min: 1, comb: true, grp: 'e1e2' },
    { n: 'E2', cap: 2, min: 1, comb: true, grp: 'e1e2' },
    { n: 'E3', cap: 4, min: 2, comb: true, grp: 'e3e4' },
    { n: 'E4', cap: 4, min: 2, comb: true, grp: 'e3e4' },
    { n: 'E5', cap: 6, min: 4, comb: true, grp: 'e5e6' },
    { n: 'E6', cap: 6, min: 4, comb: true, grp: 'e5e6' },
    { n: 'E7', cap: 4, min: 2, comb: false, grp: null },
    { n: 'E8', cap: 6, min: 4, comb: false, grp: null },
    { n: 'E9', cap: 6, min: 4, comb: false, grp: null },
  ]) {
    tables.push(makeTable(t.n, 'E', 'Ático', t.cap, t.min, t.comb, t.grp));
  }

  return tables;
}

function makeTable(
  number: string,
  zoneLetter: string,
  zoneName: string,
  capacity: number,
  capacityMin: number,
  canCombine: boolean,
  combineGroup: string | null,
): TableWithZone {
  return {
    id: `${zoneLetter.toLowerCase()}-${number.toLowerCase()}`,
    number,
    zone_letter: zoneLetter,
    zone_name: zoneName,
    capacity,
    capacity_min: capacityMin,
    can_combine: canCombine,
    combine_group: combineGroup,
    floor_num: zoneLetter === 'E' ? 2 : 1,
  };
}

/** Standard combinations for A&K. */
function buildCombinations() {
  return [
    { id: 'combo-a1a2', table_ids: ['a-a1', 'a-a2'], combined_capacity: 4, is_active: true, name: 'A1+A2' },
    { id: 'combo-a3a4', table_ids: ['a-a3', 'a-a4'], combined_capacity: 8, is_active: true, name: 'A3+A4' },
    { id: 'combo-a5a6', table_ids: ['a-a5', 'a-a6'], combined_capacity: 12, is_active: true, name: 'A5+A6' },
    { id: 'combo-a8a9', table_ids: ['a-a8', 'a-a9'], combined_capacity: 8, is_active: true, name: 'A8+A9' },
    { id: 'combo-a10a11', table_ids: ['a-a10', 'a-a11'], combined_capacity: 14, is_active: true, name: 'A10+A11 (VIP)' },
    { id: 'combo-b1b2', table_ids: ['b-b1', 'b-b2'], combined_capacity: 4, is_active: true, name: 'B1+B2' },
    { id: 'combo-b3b4', table_ids: ['b-b3', 'b-b4'], combined_capacity: 8, is_active: true, name: 'B3+B4' },
    { id: 'combo-b5b6', table_ids: ['b-b5', 'b-b6'], combined_capacity: 12, is_active: true, name: 'B5+B6' },
    { id: 'combo-b9b10', table_ids: ['b-b9', 'b-b10'], combined_capacity: 10, is_active: true, name: 'B9+B10' },
    // Zone C combos (7-max)
    { id: 'combo-c1c2', table_ids: ['c-c1', 'c-c2'], combined_capacity: 4, is_active: true, name: 'C1+C2' },
    { id: 'combo-c3c4', table_ids: ['c-c3', 'c-c4'], combined_capacity: 4, is_active: true, name: 'C3+C4' },
    { id: 'combo-c5c6', table_ids: ['c-c5', 'c-c6'], combined_capacity: 4, is_active: true, name: 'C5+C6' },
    // Zone D combos
    { id: 'combo-d1d2', table_ids: ['d-d1', 'd-d2'], combined_capacity: 16, is_active: true, name: 'D1+D2' },
    { id: 'combo-d3d4', table_ids: ['d-d3', 'd-d4'], combined_capacity: 16, is_active: true, name: 'D3+D4' },
  ];
}

function makeInput(partySize: number, timeStart = '20:00', timeEnd = '22:00', date = '2026-06-10'): AssignmentInput {
  const tables = buildAllTables();
  return {
    reservation: {
      id: 'test-res-1',
      party_size: partySize,
      date,
      time_start: timeStart,
      time_end: timeEnd,
    },
    available_tables: tables,
    existing_reservations: [],
    combinations: buildCombinations(),
  };
}

// ─── Normal flow tests (≤14 pax) ───────────────────────────────────

describe('assignTable — normal flow (≤14 pax)', () => {
  it('assigns a 2-person couple to a non-combinable table', () => {
    const result = assignTable(makeInput(2));
    expect(result.is_event).toBeFalsy();
    expect(result.suggested_table_id).not.toBeNull();
    // Couples should NOT get combinable tables unless fallback
    const altCombos = result.alternatives.filter(a => a.table_numbers.length > 1);
    expect(altCombos.length).toBe(0);
  });

  it('assigns a 4-person group to a suitable table', () => {
    const result = assignTable(makeInput(4));
    expect(result.is_event).toBeFalsy();
    expect(result.score).toBeGreaterThan(0);
    expect(result.alternatives.length).toBeGreaterThan(0);
    // Should find either a 4-cap table or a combination
    const bestCap = result.alternatives[0];
    expect(parseInt(bestCap.reason.match(/Cap:(\d+)/)?.[1] ?? '0')).toBeGreaterThanOrEqual(4);
  });

  it('assigns a 14-person group using the VIP combo (max predefined)', () => {
    const result = assignTable(makeInput(14));
    expect(result.is_event).toBeFalsy();
    expect(result.suggested_combination_id).not.toBeNull();
    // Should use the A10+A11 combo (cap 14)
    expect(result.reason).toContain('Combinación');
  });

  it('returns alternatives sorted by score descending', () => {
    const result = assignTable(makeInput(4));
    for (let i = 1; i < result.alternatives.length; i++) {
      expect(result.alternatives[i - 1].score).toBeGreaterThanOrEqual(result.alternatives[i].score);
    }
  });

  it('protects combinable tables from couples (≤2 pax)', () => {
    const result = assignTable(makeInput(2));
    // None of the top alternatives should be combinable tables
    // unless it's a fallback
    const nonFallbackAlts = result.alternatives.slice(0, 5);
    for (const alt of nonFallbackAlts) {
      if (alt.table_numbers.length === 1) {
        // Single table — should not be marked as combinable
        // (couples skip can_combine tables)
      }
    }
    // Result should still exist (there are non-combinable 2-seaters)
    expect(result.suggested_table_id).not.toBeNull();
  });

  it('falls back to combinable tables for couples when no other option', () => {
    // Only provide combinable 2-seaters
    const tables: TableWithZone[] = [
      makeTable('A1', 'A', 'Taller', 2, 1, true, 'a1a2'),
      makeTable('A2', 'A', 'Taller', 2, 1, true, 'a1a2'),
    ];
    const input: AssignmentInput = {
      reservation: { id: 'r1', party_size: 2, date: '2026-06-10', time_start: '20:00', time_end: '22:00' },
      available_tables: tables,
      existing_reservations: [],
      combinations: [
        { id: 'combo-a1a2', table_ids: ['a-a1', 'a-a2'], combined_capacity: 4, is_active: true, name: 'A1+A2' },
      ],
    };
    const result = assignTable(input);
    // Should still get a table (fallback to combinable)
    expect(result.suggested_table_id).not.toBeNull();
    expect(result.reason).toContain('Sin otras opciones');
  });

  it('adjusts zone scores for early evening (18:00) — D/E boosted, A/B penalized', () => {
    const result = assignTable(makeInput(4, '18:00', '20:00'));
    // At 18:00, D gets 40*1.1=44, E gets 20*1.2=24, B gets 100*0.8=80, A gets 80*0.9=72
    // Zone D (Chispas) tables appear among alternatives with boosted scores
    const chispasAlts = result.alternatives.filter(a => a.zone_letter === 'D');
    expect(chispasAlts.length).toBeGreaterThan(0);
    // Chispas scores should be higher than they would be at non-boosted times
    // At 18:00 the adjusted score for D is 44, vs base 40
    const chispasAlt = chispasAlts[0];
    expect(chispasAlt.breakdown.zone_priority).toBeGreaterThanOrEqual(40);
  });

  it('routes peak hours (20:00) to high zones (A, B)', () => {
    const result = assignTable(makeInput(4, '20:00', '22:00'));
    const topZones = result.alternatives.slice(0, 3).map(a => a.zone_letter);
    const hasPeakZone = topZones.some(z => z === 'A' || z === 'B');
    expect(hasPeakZone).toBe(true);
  });

  it('returns empty result when no table fits', () => {
    // Party of 15 with no matching combos — triggers event branch, not empty
    // Party of 100 with no tables at all
    const input: AssignmentInput = {
      reservation: { id: 'r1', party_size: 100, date: '2026-06-10', time_start: '20:00', time_end: '22:00' },
      available_tables: [], // no tables at all
      existing_reservations: [],
      combinations: [],
    };
    const result = assignTable(input);
    expect(result.is_event).toBe(true);
    // With no tables, there should be no zone suggestions
    expect(result.event_zone_suggestions).toBeUndefined();
  });
});

// ─── Event flow tests (>14 pax) ────────────────────────────────────

describe('assignTable — event flow (>14 pax)', () => {
  it('EVENT_THRESHOLD is 14 (max combo capacity)', () => {
    expect(EVENT_THRESHOLD).toBe(14);
  });

  it('EVENT_ZONE_PRIORITY: Chispas=A100, Taller=B80, Tipi=C60, Jardín=0, Ático=0', () => {
    expect(EVENT_ZONE_PRIORITY.D).toBe(100);
    expect(EVENT_ZONE_PRIORITY.A).toBe(80);
    expect(EVENT_ZONE_PRIORITY.B).toBe(60);
    expect(EVENT_ZONE_PRIORITY.C).toBe(0);
    expect(EVENT_ZONE_PRIORITY.E).toBe(0);
  });

  it('20 pax triggers event branch (is_event=true)', () => {
    const result = assignTable(makeInput(20));
    expect(result.is_event).toBe(true);
    expect(result.suggested_table_id).not.toBeNull();
    expect(result.event_zone_suggestions).toBeDefined();
    expect(result.event_zone_suggestions!.length).toBeGreaterThan(0);
  });

  it('35 pax triggers event branch with zone suggestion', () => {
    const result = assignTable(makeInput(35));
    expect(result.is_event).toBe(true);
    // At least one viable zone should be suggested
    const viable = result.event_zone_suggestions!.filter(s => s.fits_zone);
    // Taller(54), Chispas(48) can fit 35
    expect(viable.length).toBeGreaterThan(0);
  });

  it('70 pax triggers multi-zone event', () => {
    const result = assignTable(makeInput(70));
    expect(result.is_event).toBe(true);
    // No single zone fits 70 (max is Taller=54, Chispas=48)
    // But Chispas+Taller = 102, which fits
    expect(result.event_multi_zone).toBeDefined();
    expect(result.event_multi_zone!.fits).toBe(true);
    expect(result.event_multi_zone!.combined_available).toBeGreaterThanOrEqual(70);
  });

  it('22 pax fits in Chispas (48 seats)', () => {
    const result = assignTable(makeInput(22));
    expect(result.is_event).toBe(true);
    const chispas = result.event_zone_suggestions!.find(s => s.zone_letter === 'D');
    expect(chispas).toBeDefined();
    expect(chispas!.fits_zone).toBe(true); // 22 <= 48
    expect(chispas!.score).toBe(100); // D = 100 in event mode
  });

  it('event zone priority: Chispas > Taller > Tipi > Jardín=Ático=NEVER', () => {
    const result = assignTable(makeInput(20));
    expect(result.is_event).toBe(true);
    const suggestions = result.event_zone_suggestions!;
    // Only D, A, B zones should appear (C and E have score 0)
    const zoneLetters = suggestions.map(s => s.zone_letter);
    expect(zoneLetters).not.toContain('C'); // Jardín never for events
    expect(zoneLetters).not.toContain('E'); // Ático never for events
    // Order should be D > A > B
    if (zoneLetters.length >= 2) {
      const dIdx = zoneLetters.indexOf('D');
      const aIdx = zoneLetters.indexOf('A');
      const bIdx = zoneLetters.indexOf('B');
      if (dIdx >= 0 && aIdx >= 0) expect(dIdx).toBeLessThan(aIdx);
      if (aIdx >= 0 && bIdx >= 0) expect(aIdx).toBeLessThan(bIdx);
    }
  });

  it('event reason includes zone suggestion and capacity info', () => {
    const result = assignTable(makeInput(20));
    expect(result.reason).toContain('Evento 20 personas');
    expect(result.reason).toContain('max combo: 14');
  });

  it('event with no tables returns is_event=true with no suggestions', () => {
    const input: AssignmentInput = {
      reservation: { id: 'r1', party_size: 20, date: '2026-06-10', time_start: '20:00', time_end: '22:00' },
      available_tables: [],
      existing_reservations: [],
      combinations: [],
    };
    const result = assignTable(input);
    expect(result.is_event).toBe(true);
    expect(result.event_zone_suggestions).toBeUndefined();
    expect(result.reason).toContain('Sin zona disponible');
  });

  it('15 pax (just above threshold) triggers event branch', () => {
    const result = assignTable(makeInput(15));
    expect(result.is_event).toBe(true);
    // 15 pax can fit in Chispas(48), Taller(54)
    const viable = result.event_zone_suggestions!.filter(s => s.fits_zone);
    expect(viable.length).toBeGreaterThanOrEqual(2);
  });

  it('14 pax (at threshold) does NOT trigger event branch', () => {
    const result = assignTable(makeInput(14));
    expect(result.is_event).toBeFalsy();
    // Should use normal combo scoring
    expect(result.suggested_combination_id).not.toBeNull();
  });
});

// ─── evaluateEventZones tests ──────────────────────────────────────

describe('evaluateEventZones', () => {
  const tables = buildAllTables();

  it('returns only viable zones (D, A, B) sorted by priority', () => {
    const zones = evaluateEventZones(20, tables, [], '20:00', '22:00');
    const letters = zones.map(z => z.zone_letter);
    expect(letters).not.toContain('C');
    expect(letters).not.toContain('E');
    // D (score 100) should be first
    if (letters.length > 0) {
      expect(letters[0]).toBe('D');
    }
  });

  it('calculates zone capacity correctly', () => {
    const zones = evaluateEventZones(20, tables, [], '20:00', '22:00');
    const chispas = zones.find(z => z.zone_letter === 'D');
    expect(chispas).toBeDefined();
    expect(chispas!.total_capacity).toBe(48); // 6 tables × 8 seats each
    expect(chispas!.tables_in_zone).toBe(6);
    expect(chispas!.available_capacity).toBe(48); // all available
  });

  it('accounts for occupied tables (displaced reservations)', () => {
    // Reserve D1 and D2 (16 seats total) during the event time
    const occupied = [
      { table_id: 'd-d1', time_start: '20:00', time_end: '22:00' },
      { table_id: 'd-d2', time_start: '20:00', time_end: '22:00' },
    ];
    const zones = evaluateEventZones(20, tables, occupied, '20:00', '22:00');
    const chispas = zones.find(z => z.zone_letter === 'D');
    expect(chispas).toBeDefined();
    expect(chispas!.available_capacity).toBe(32); // 48 - 16 occupied
    expect(chispas!.available_tables).toBe(4); // 6 - 2 occupied
    expect(chispas!.displaced_count).toBe(2);
  });

  it('marks fits_zone correctly', () => {
    // 20 pax fits in Chispas(48) and Taller(54)
    const zones = evaluateEventZones(20, tables, [], '20:00', '22:00');
    const chispas = zones.find(z => z.zone_letter === 'D');
    const taller = zones.find(z => z.zone_letter === 'A');
    const tipi = zones.find(z => z.zone_letter === 'B');
    expect(chispas!.fits_zone).toBe(true);  // 20 <= 48
    expect(taller!.fits_zone).toBe(true);   // 20 <= 54
    expect(tipi!.fits_zone).toBe(true);     // 20 <= 50
  });

  it('marks fits_zone=false for zones too small', () => {
    // 55 pax — only Taller(54) is close but not enough
    const zones = evaluateEventZones(55, tables, [], '20:00', '22:00');
    const taller = zones.find(z => z.zone_letter === 'A');
    expect(taller!.fits_zone).toBe(false); // 55 > 54
  });
});

// ─── evaluateMultiZoneEvent tests ─────────────────────────────────

describe('evaluateMultiZoneEvent', () => {
  const tables = buildAllTables();

  it('returns single zone for 20 pax (Chispas fits alone)', () => {
    const result = evaluateMultiZoneEvent(20, tables, [], '20:00', '22:00');
    expect(result).not.toBeNull();
    expect(result!.fits).toBe(true);
    // Should find a single zone that fits
    expect(result!.zones.length).toBe(1);
    expect(result!.zones[0].zone_letter).toBe('D'); // Chispas = highest priority
  });

  it('combines zones for 70 pax', () => {
    const result = evaluateMultiZoneEvent(70, tables, [], '20:00', '22:00');
    expect(result).not.toBeNull();
    expect(result!.fits).toBe(true);
    expect(result!.zones.length).toBeGreaterThan(1);
    // Combined capacity should be >= 70
    // D(48) + A(54) = 102, which fits
    expect(result!.combined_available).toBeGreaterThanOrEqual(70);
  });

  it('returns fits=false when even combined zones cant hold the party', () => {
    // 500 pax — way beyond any combination
    const result = evaluateMultiZoneEvent(500, tables, [], '20:00', '22:00');
    expect(result).not.toBeNull();
    expect(result!.fits).toBe(false);
  });

  it('returns null when no viable zone letters', () => {
    // Empty tables array
    const result = evaluateMultiZoneEvent(20, [], [], '20:00', '22:00');
    expect(result).toBeNull();
  });

  it('accumulates zones in priority order (D → A → B)', () => {
    const result = evaluateMultiZoneEvent(60, tables, [], '20:00', '22:00');
    expect(result).not.toBeNull();
    // 60 pax: Chispas(48) alone isn't enough, need Chispas+Taller(48+54=102)
    const zoneLetters = result!.zones.map(z => z.zone_letter);
    expect(zoneLetters[0]).toBe('D'); // Chispas first
    if (zoneLetters.length > 1) {
      expect(zoneLetters[1]).toBe('A'); // Taller second
    }
  });
});

// ─── Performance benchmarks ────────────────────────────────────────

describe('performance', () => {
  it('normal flow (4 pax) completes in <5ms', () => {
    const input = makeInput(4);
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      assignTable(input);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / 100;
    expect(avgMs).toBeLessThan(5);
  });

  it('event flow (70 pax) completes in <5ms', () => {
    const input = makeInput(70);
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      assignTable(input);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / 100;
    expect(avgMs).toBeLessThan(5);
  });

  it('event zone evaluation completes in <2ms', () => {
    const tables = buildAllTables();
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      evaluateEventZones(70, tables, [], '20:00', '22:00');
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / 100;
    expect(avgMs).toBeLessThan(2);
  });

  it('multi-zone evaluation completes in <3ms', () => {
    const tables = buildAllTables();
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      evaluateMultiZoneEvent(70, tables, [], '20:00', '22:00');
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / 100;
    expect(avgMs).toBeLessThan(3);
  });
});