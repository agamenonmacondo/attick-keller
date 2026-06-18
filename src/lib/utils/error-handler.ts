/**
 * Shared error handler utilities for API routes.
 *
 * - sanitizeError: Strip internal details before sending to the client.
 *   In production, returns a generic message; in development, includes
 *   the original message for easier debugging.
 *
 * - handleApiError is already in api-security.ts and should remain the
 *   primary error-response helper. This module provides additional
 *   primitives so routes don't need to reach for `error.message` directly.
 */

/**
 * Return a safe error message string.
 * - In development: returns the real error message for debugging.
 * - In production: returns a generic Spanish message to avoid leaking internals.
 */
export function safeErrorMessage(error: unknown, fallback = 'Error interno del servidor'): string {
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    return error.message
  }
  return fallback
}

/**
 * Return a safe Supabase error description.
 * - In development: includes code + message for debugging.
 * - In production: returns a generic message.
 */
export function safeSupabaseError(
  error: { code?: string; message?: string } | null | undefined,
  fallback = 'Error interno del servidor',
): string {
  if (!error) return fallback
  if (process.env.NODE_ENV === 'development') {
    return `${error.code ?? 'UNKNOWN'}: ${error.message ?? 'No detail'}`
  }
  return fallback
}