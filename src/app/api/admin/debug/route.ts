import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const steps: { step: string; ok: boolean; detail: string }[] = []

  // Step 1: Check env vars
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  steps.push({
    step: '1. Env vars',
    ok: hasUrl && hasAnonKey && hasServiceKey,
    detail: `URL: ${hasUrl}, ANON_KEY: ${hasAnonKey}, SERVICE_KEY: ${hasServiceKey} (len=${process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0})`,
  })

  if (!hasUrl || !hasAnonKey || !hasServiceKey) {
    return NextResponse.json({ steps, error: 'Missing env vars' })
  }

  // Step 2: Auth check
  let admin
  try {
    admin = await getAdminUser(request)
    steps.push({
      step: '2. Auth',
      ok: !!admin,
      detail: admin ? `User: ${admin.email}, role: ${admin.role}` : 'No admin user found',
    })
    if (!admin) {
      return NextResponse.json({ steps, error: 'Not authenticated' })
    }
  } catch (err) {
    steps.push({ step: '2. Auth', ok: false, detail: String(err) })
    return NextResponse.json({ steps, error: 'Auth threw error' })
  }

  // Step 3: Service client - query customers
  const sb = getServiceClient()
  let customersResult
  try {
    customersResult = await sb
      .from('customers')
      .select('id', { count: 'exact' })
      .eq('restaurant_id', RESTAURANT_ID)
      .limit(1)
    steps.push({
      step: '3. customers table',
      ok: !customersResult.error,
      detail: customersResult.error
        ? `${customersResult.error.code}: ${customersResult.error.message}`
        : `Found ${customersResult.count} rows, sample: ${JSON.stringify(customersResult.data?.[0])}`,
    })
  } catch (err) {
    steps.push({ step: '3. customers table', ok: false, detail: String(err) })
  }

  // Step 4: Query customer_stats
  let statsResult
  try {
    statsResult = await sb
      .from('customer_stats')
      .select('customer_id, total_visits, last_visit_date, loyalty_tier')
      .limit(1)
    steps.push({
      step: '4. customer_stats table',
      ok: !statsResult.error,
      detail: statsResult.error
        ? `${statsResult.error.code}: ${statsResult.error.message}`
        : `Sample: ${JSON.stringify(statsResult.data?.[0])}`,
    })
  } catch (err) {
    steps.push({ step: '4. customer_stats table', ok: false, detail: String(err) })
  }

  // Step 5: Query customer_tag_links
  let tagsResult
  try {
    tagsResult = await sb
      .from('customer_tag_links')
      .select('customer_id, tag_id')
      .limit(1)
    steps.push({
      step: '5. customer_tag_links table',
      ok: !tagsResult.error,
      detail: tagsResult.error
        ? `${tagsResult.error.code}: ${tagsResult.error.message}`
        : `Sample: ${JSON.stringify(tagsResult.data?.[0])}`,
    })
  } catch (err) {
    steps.push({ step: '5. customer_tag_links table', ok: false, detail: String(err) })
  }

  // Step 6: Full customers query (like the endpoint does)
  try {
    const fullResult = await sb
      .from('customers')
      .select('id, full_name, phone, email, created_at', { count: 'exact' })
      .eq('restaurant_id', RESTAURANT_ID)
      .range(0, 0)

    steps.push({
      step: '6. Full customers query',
      ok: !fullResult.error,
      detail: fullResult.error
        ? `${fullResult.error.code}: ${fullResult.error.message}`
        : `Count: ${fullResult.count}, sample: ${JSON.stringify(fullResult.data?.[0])}`,
    })
  } catch (err) {
    steps.push({ step: '6. Full customers query', ok: false, detail: String(err) })
  }

  // Step 7: customers + stats join
  try {
    const customerId = customersResult?.data?.[0]?.id
    if (customerId) {
      const joinResult = await sb
        .from('customer_stats')
        .select('customer_id, total_visits, total_spent, last_visit_date, loyalty_tier, is_recurring')
        .eq('customer_id', customerId)
        .single()

      steps.push({
        step: '7. customer_stats for one customer',
        ok: !joinResult.error,
        detail: joinResult.error
          ? `${joinResult.error.code}: ${joinResult.error.message}`
          : `Data: ${JSON.stringify(joinResult.data)}`,
      })
    } else {
      steps.push({ step: '7. customer_stats for one customer', ok: true, detail: 'No customer ID to test with' })
    }
  } catch (err) {
    steps.push({ step: '7. customer_stats for one customer', ok: false, detail: String(err) })
  }

  return NextResponse.json({
    restaurantId: RESTAURANT_ID,
    steps,
    allOk: steps.every(s => s.ok),
  })
}