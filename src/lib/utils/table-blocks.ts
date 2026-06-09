/**
 * Get blocked table IDs for a given date and time range.
 * Returns table IDs that should be excluded from the assignment algorithm.
 * 
 * Blocked tables are reserved by the host for walk-ins or maintenance.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

export async function getBlockedTableIds(
  date: string,
  timeStart: string,
  timeEnd: string,
): Promise<string[]> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/table_blocks?restaurant_id=eq.${RESTAURANT_ID}&date=eq.${date}&time_start=lt.${timeEnd}&time_end=gt.${timeStart}&select=table_id`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  )

  if (!response.ok) {
    console.error('[getBlockedTableIds] Error:', response.status)
    return []
  }

  const data = await response.json()
  return data.map((row: { table_id: string }) => row.table_id)
}

/**
 * Fetch all blocked tables for a given date (for UI display).
 * Uses direct REST call — no Supabase client dependency.
 */
export async function getTableBlocksForDate(
  date: string,
): Promise<Array<{
  id: string
  table_id: string
  date: string
  time_start: string
  time_end: string
  reason: string | null
  created_by_name: string | null
}>> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/table_blocks?restaurant_id=eq.${RESTAURANT_ID}&date=eq.${date}&order=created_at.asc&select=id,table_id,date,time_start,time_end,reason,created_by_name`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  )

  if (!response.ok) {
    console.error('[getTableBlocksForDate] Error:', response.status)
    return []
  }

  return response.json()
}