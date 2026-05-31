/**
 * Sanitize a user-provided string for use in PostgreSQL ILIKE patterns.
 * Escapes special LIKE characters: %, _, and the escape char itself.
 */
export function sanitizeLike(input: string): string {
  return input.replace(/[\\%_]/g, '\\$&')
}
