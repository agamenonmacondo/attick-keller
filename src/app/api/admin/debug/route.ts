import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { requireSuperAdmin } from '@/lib/utils/api-security'
import { safeSupabaseError } from '@/lib/utils/error-handler'

export async function GET(request: NextRequest) {
  // ── AUTH CHECK FIRST — before any environment info is exposed ──
  const admin = await requireSuperAdmin(request)
  if (admin instanceof NextResponse) return admin

  if (process.env.ALLOW_DEBUG !== 'true') {
    return NextResponse.json({ error: 'Debug endpoint disabled' }, { status: 404 })
  }

  const steps: { step: string; ok: boolean; detail: string }[] = []

  // Step 1: Check env vars (only show boolean, not values)
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  steps.push({
    step: '1. Env vars',
    ok: hasUrl && hasAnonKey && hasServiceKey,
    detail: `URL: ${hasUrl}, ANON_KEY: ${hasAnonKey}, SERVICE_KEY: ${hasServiceKey}`,
  })

  if (!hasUrl || !hasAnonKey || !hasServiceKey) {
    return NextResponse.json({ steps, error: 'Missing env vars' })
  }

  // Step 2: Service client - query customers (no PII)
  const sb = getServiceClient()
  let customersResult
  try {
    customersResult = await sb
      .from('customers')
      .select('id', { count: 'exact' })
      .eq('restaurant_id', RESTAURANT_ID)
      .limit(1)
    steps.push({
      step: '2. customers table',
      ok: !customersResult.error,
      detail: customersResult.error
        ? safeSupabaseError(customersResult.error)
        : `Found ${customersResult.count} rows`,
    })
  } catch (err) {
    steps.push({ step: '2. customers table', ok: false, detail: String(err) })
  }

  // Step 3: Query customer_stats
  let statsResult
  try {
    statsResult = await sb
      .from('customer_stats')
      .select('customer_id, total_visits, last_visit_date, loyalty_tier')
      .limit(1)
    steps.push({
      step: '3. customer_stats table',
      ok: !statsResult.error,
      detail: statsResult.error
        ? safeSupabaseError(statsResult.error)
        : `Sample: ${JSON.stringify(statsResult.data?.[0])}`,
    })
  } catch (err) {
    steps.push({ step: '3. customer_stats table', ok: false, detail: String(err) })
  }

  // Step 4: Query customer_tag_links
  let tagsResult
  try {
    tagsResult = await sb
      .from('customer_tag_links')
      .select('customer_id, tag_id')
      .limit(1)
    steps.push({
      step: '4. customer_tag_links table',
      ok: !tagsResult.error,
      detail: tagsResult.error
        ? safeSupabaseError(tagsResult.error)
        : `Sample: ${JSON.stringify(tagsResult.data?.[0])}`,
    })
  } catch (err) {
    steps.push({ step: '4. customer_tag_links table', ok: false, detail: String(err) })
  }

  // Step 5: Customers count only (no PII exposure)
  try {
    const fullResult = await sb
      .from('customers')
      .select('id', { count: 'exact' })
      .eq('restaurant_id', RESTAURANT_ID)
      .range(0, 0)

    steps.push({
      step: '5. Customers count',
      ok: !fullResult.error,
      detail: fullResult.error
        ? safeSupabaseError(fullResult.error)
        : `Count: ${fullResult.count}`,
    })
  } catch (err) {
    steps.push({ step: '5. Customers count', ok: false, detail: String(err) })
  }

  // Step 6: customers + stats join (no PII)
  try {
    const customerId = customersResult?.data?.[0]?.id
    if (customerId) {
      const joinResult = await sb
        .from('customer_stats')
        .select('customer_id, total_visits, total_spent, last_visit_date, loyalty_tier, is_recurring')
        .eq('customer_id', customerId)
        .single()

      steps.push({
        step: '6. customer_stats for one customer',
        ok: !joinResult.error,
        detail: joinResult.error
          ? safeSupabaseError(joinResult.error)
          : `Data: ${JSON.stringify(joinResult.data)}`,
      })
    } else {
      steps.push({ step: '6. customer_stats for one customer', ok: true, detail: 'No customer ID to test with' })
    }
  } catch (err) {
    steps.push({ step: '6. customer_stats for one customer', ok: false, detail: String(err) })
  }

  return NextResponse.json({
    restaurantId: RESTAURANT_ID,
    steps,
    allOk: steps.every(s => s.ok),
  })
}