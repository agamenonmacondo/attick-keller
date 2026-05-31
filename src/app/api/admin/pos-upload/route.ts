import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const results: Record<string, { inserted: number; updated: number; errors: number }> = {}

  // Supported tables with their unique keys for upsert
  const tables: Array<{ key: string; table: string; uniqueCols: string[] }> = [
    { key: 'pos_sales', table: 'pos_sales', uniqueCols: ['pos_folio', 'pos_series'] },
    { key: 'pos_sale_items', table: 'pos_sale_items', uniqueCols: ['id'] },
    { key: 'pos_products', table: 'pos_products', uniqueCols: ['pos_product_id'] },
    { key: 'pos_product_groups', table: 'pos_product_groups', uniqueCols: ['pos_product_group_id'] },
    { key: 'pos_staff', table: 'pos_staff', uniqueCols: ['pos_staff_id'] },
    { key: 'pos_areas', table: 'pos_areas', uniqueCols: ['pos_area_id'] },
    { key: 'pos_sale_payments', table: 'pos_sale_payments', uniqueCols: ['id'] },
    { key: 'pos_payment_methods', table: 'pos_payment_methods', uniqueCols: ['pos_payment_method_id'] },
  ]

  for (const { key, table, uniqueCols } of tables) {
    const rows = body[key]
    if (!Array.isArray(rows) || rows.length === 0) continue

    // Insert in batches of 500
    let inserted = 0
    let updated = 0
    let errors = 0

    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { data, error } = await sb
        .from(table)
        .upsert(batch, { onConflict: uniqueCols.join(','), ignoreDuplicates: false })
        .select()

      if (error) {
        errors += batch.length
      } else {
        inserted += (data || []).length
      }
    }

    results[key] = { inserted, updated, errors }
  }

  const totalInserted = Object.values(results).reduce((s, r) => s + r.inserted, 0)
  const totalErrors = Object.values(results).reduce((s, r) => s + r.errors, 0)

  return NextResponse.json({
    summary: `${totalInserted} registros procesados${totalErrors > 0 ? `, ${totalErrors} errores` : ''}`,
    details: results,
  })
}