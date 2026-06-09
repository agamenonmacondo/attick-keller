/**
 * Reservation Logger — audit trail for all reservation changes.
 * 
 * Every status change, table reassignment, time change, note added, etc.
 * is logged with old/new values and who performed the action.
 */

export type ReservationAction =
  | 'created'
  | 'status_changed'
  | 'table_changed'
  | 'time_changed'
  | 'party_size_changed'
  | 'zone_changed'
  | 'note_added'
  | 'internal_note_added'
  | 'cancelled'
  | 'no_show'
  | 'seated'
  | 'completed'
  | 'walk_in_created'
  | 'table_block_created'
  | 'table_block_removed'

export interface ReservationLogEntry {
  reservation_id: string
  action: ReservationAction | string
  field_name?: string | null
  old_value?: string | null
  new_value?: string | null
  performed_by?: string | null
  performed_by_name?: string | null
  notes?: string | null
}

export interface ReservationLog extends ReservationLogEntry {
  id: string
  created_at: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Insert a log entry into reservation_logs.
 * Uses service_role key to bypass RLS.
 */
export async function logReservationChange(entry: ReservationLogEntry): Promise<void> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reservation_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(entry),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[reservation-logger] Failed to log: ${response.status} ${error}`)
    }
  } catch (err) {
    console.error('[reservation-logger] Error logging change:', err)
  }
}

/**
 * Log multiple changes at once (e.g., table + zone changed in same update).
 */
export async function logReservationChanges(entries: ReservationLogEntry[]): Promise<void> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reservation_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(entries),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[reservation-logger] Failed to log batch: ${response.status} ${error}`)
    }
  } catch (err) {
    console.error('[reservation-logger] Error logging batch:', err)
  }
}

/**
 * Fetch reservation logs for a specific reservation.
 * Uses anon key (RLS allows staff to read).
 */
export async function getReservationLogs(
  reservationId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<ReservationLog[]> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/reservation_logs?reservation_id=eq.${reservationId}&order=created_at.asc`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  )

  if (!response.ok) {
    console.error(`[reservation-logger] Failed to fetch logs: ${response.status}`)
    return []
  }

  return response.json()
}

/**
 * Human-readable labels for log actions.
 */
export const ACTION_LABELS: Record<string, string> = {
  created: 'Reserva creada',
  status_changed: 'Estado cambiado',
  table_changed: 'Mesa cambiada',
  time_changed: 'Hora cambiada',
  party_size_changed: 'Número de personas cambiado',
  zone_changed: 'Zona cambiada',
  note_added: 'Nota agregada',
  internal_note_added: 'Nota interna agregada',
  cancelled: 'Reserva cancelada',
  no_show: 'No se presentó',
  seated: 'Cliente sentado',
  completed: 'Reserva completada',
  walk_in_created: 'Walk-in creado',
  table_block_created: 'Mesa bloqueada',
  table_block_removed: 'Mesa desbloqueada',
}

/**
 * Action icons (Phosphor Icons names) for the timeline.
 */
export const ACTION_ICONS: Record<string, string> = {
  created: 'CalendarPlus',
  status_changed: 'ArrowsClockwise',
  table_changed: 'Chair',
  time_changed: 'Clock',
  party_size_changed: 'Users',
  zone_changed: 'MapPin',
  note_added: 'NotePencil',
  internal_note_added: 'LockKey',
  cancelled: 'XCircle',
  no_show: 'UserMinus',
  seated: 'Chair',
  completed: 'CheckCircle',
  walk_in_created: 'PersonSimpleWalk',
  table_block_created: 'LockSimple',
  table_block_removed: 'LockSimpleOpen',
}