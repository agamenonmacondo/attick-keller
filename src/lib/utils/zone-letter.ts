/**
 * Zone-letter mapping utility.
 *
 * The table assignment algorithm uses single-letter zone identifiers (A–E),
 * but the `letter` column may not yet exist in the `table_zones` table
 * (or may be NULL for newly-created zones).  This module provides a
 * deterministic fallback derived from the zone name.
 */

const ZONE_NAME_TO_LETTER: Record<string, string> = {
  taller: 'A',
  tipi: 'B',
  jardín: 'C',
  jardin: 'C',
  chispas: 'D',
  ático: 'E',
  atico: 'E',
  attic: 'E',
};

/**
 * Derive a zone letter (A–E) from the zone name.
 *
 * Matching is case-insensitive and accent-insensitive for the known
 * zone names.  Returns `'E'` as a safe default when the name is
 * unrecognised (Ático/Attic is the lowest-priority zone).
 */
export function getZoneLetter(zoneName: string | null | undefined): string {
  if (!zoneName) return 'E';

  const normalised = zoneName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, ''); // strip accents

  // Try exact match first (without accents)
  if (ZONE_NAME_TO_LETTER[normalised]) return ZONE_NAME_TO_LETTER[normalised];

  // Try matching against the original lowercased name (with accents)
  const lowerWithAccents = zoneName.trim().toLowerCase();
  if (ZONE_NAME_TO_LETTER[lowerWithAccents]) return ZONE_NAME_TO_LETTER[lowerWithAccents];

  // Fallback: partial / contains match
  if (normalised.includes('taller')) return 'A';
  if (normalised.includes('tipi')) return 'B';
  if (normalised.includes('jardin')) return 'C';
  if (normalised.includes('chispas')) return 'D';
  if (normalised.includes('atico') || normalised.includes('attic')) return 'E';

  return 'E';
}