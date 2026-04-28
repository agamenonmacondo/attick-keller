import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { sendCampaignEmail } from '@/lib/email/send'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('email_campaigns')
    .select('id, name, subject, recipient_count, sent_count, failed_count, status, created_at, sent_at')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns: data || [] })
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const {
    name, subject, body_html,
    filter_tag_ids, filter_has_email,
    filter_min_visits, filter_last_visit_days,
    filter_date_from, filter_date_to,
  } = body

  if (!name || !subject || !body_html) {
    return NextResponse.json({ error: 'Nombre, asunto y cuerpo requeridos' }, { status: 400 })
  }

  let query = sb
    .from('customers')
    .select(`
      id, full_name, email,
      customer_stats!inner(total_visits, loyalty_tier),
      customer_tag_links!left(tag_id)
    `)
    .eq('restaurant_id', RESTAURANT_ID)

  if (filter_has_email) {
    query = query.not('email', 'is', null).neq('email', '')
  }

  if (filter_tag_ids && filter_tag_ids.length > 0) {
    query = query.in('customer_tag_links.tag_id', filter_tag_ids)
  }

  if (filter_min_visits && filter_min_visits > 0) {
    query = query.gte('customer_stats.total_visits', filter_min_visits)
  }

  if (filter_last_visit_days && filter_last_visit_days > 0) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - filter_last_visit_days)
    query = query.gte('customer_stats.last_visit_date', cutoff.toISOString().split('T')[0])
  }

  const { data: recipients, error: resolveError } = await query

  if (resolveError) {
    return NextResponse.json({ error: `Error resolviendo audiencia: ${resolveError.message}` }, { status: 500 })
  }

  const seen = new Set<string>()
  const uniqueRecipients = (recipients || []).filter((r: Record<string, unknown>) => {
    if (seen.has(r.id as string)) return false
    seen.add(r.id as string)
    return true
  })

  const tagNames: string[] = []
  if (filter_tag_ids && filter_tag_ids.length > 0) {
    const { data: tags } = await sb
      .from('customer_tags')
      .select('name')
      .in('id', filter_tag_ids)
    tagNames.push(...(tags || []).map((t: { name: string }) => t.name))
  }

  const { data: campaign, error: insertError } = await sb
    .from('email_campaigns')
    .insert({
      restaurant_id: RESTAURANT_ID,
      name,
      subject,
      body_html,
      filter_tag_ids: filter_tag_ids || [],
      filter_has_email: filter_has_email ?? true,
      filter_min_visits: filter_min_visits || null,
      filter_last_visit_days: filter_last_visit_days || null,
      filter_date_from: filter_date_from || null,
      filter_date_to: filter_date_to || null,
      recipient_count: uniqueRecipients.length,
      status: 'sending',
      created_by: admin.id,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const campaignId = campaign.id

  const sendPromises = uniqueRecipients.map(async (r: Record<string, unknown>) => {
    const statsArr = r.customer_stats as Record<string, unknown>[]
    const s = Array.isArray(statsArr) && statsArr.length > 0 ? statsArr[0] : {}

    if (!r.email) return { id: r.id, success: false, error: 'Sin email' }

    const result = await sendCampaignEmail({
      to: r.email as string,
      customerName: (r.full_name as string) || 'Cliente',
      subject,
      bodyHtml: body_html,
      loyaltyTier: (s.loyalty_tier as string) || 'none',
      tagNames,
    })

    await sb.from('campaign_recipients').insert({
      campaign_id: campaignId,
      customer_id: r.id,
      email: r.email as string,
      status: result.success ? 'sent' : 'failed',
      sent_at: result.success ? new Date().toISOString() : null,
      error: result.error || null,
    }).then(() => {}, () => {})

    return { id: r.id, ...result }
  })

  Promise.allSettled(sendPromises).then(async (results) => {
    const succeeded = results.filter((r: PromiseSettledResult<unknown>) =>
      r.status === 'fulfilled' && (r.value as Record<string, unknown>)?.success
    ).length
    const failed = results.length - succeeded

    await sb.from('email_campaigns').update({
      sent_count: succeeded,
      failed_count: failed,
      status: 'completed',
      sent_at: new Date().toISOString(),
    }).eq('id', campaignId)
  })

  return NextResponse.json({
    campaign: { id: campaignId, recipient_count: uniqueRecipients.length },
  }, { status: 201 })
}
