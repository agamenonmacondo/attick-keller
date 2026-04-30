import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { sendCampaignEmailBatch } from '@/lib/email/send'

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

  if (error) {
    if (error.message && error.message.includes('does not exist')) {
      return NextResponse.json({ campaigns: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
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

  // Resolve audience
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

  // Insert campaign
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

  // Insert all recipients as pending
  const recipientRows = uniqueRecipients
    .filter((r: Record<string, unknown>) => r.email)
    .map((r: Record<string, unknown>) => ({
      campaign_id: campaignId,
      customer_id: r.id,
      email: r.email as string,
      status: 'pending' as const,
    }))

  if (recipientRows.length > 0) {
    // Insert in chunks to avoid Supabase payload limits (max ~1000 rows per request)
    const CHUNK_SIZE = 500
    for (let i = 0; i < recipientRows.length; i += CHUNK_SIZE) {
      const chunk = recipientRows.slice(i, i + CHUNK_SIZE)
      await sb.from('campaign_recipients').insert(chunk).then(() => {}, () => {})
    }
  }

  // Prepare batch recipients
  const batchRecipients = uniqueRecipients
    .filter((r: Record<string, unknown>) => r.email)
    .map((r: Record<string, unknown>) => {
      const statsArr = r.customer_stats as Record<string, unknown>[]
      const s = Array.isArray(statsArr) && statsArr.length > 0 ? statsArr[0] : {}
      return {
        to: r.email as string,
        customerName: (r.full_name as string) || 'Cliente',
        loyaltyTier: (s.loyalty_tier as string) || 'none',
        tagNames,
      }
    })

  // Send in batches (non-blocking response to client)
  const sendCampaignAsync = async () => {
    const result = await sendCampaignEmailBatch(batchRecipients, subject, body_html)

    // Update sent recipients
    if (result.succeeded > 0 && batchRecipients.length > 0) {
      // Since we don't know exactly which ones succeeded individually in a batch,
      // we mark the first N as sent where N = succeeded (best-effort approximation).
      // For more granular tracking, individual API would be needed.
      const sentEmails = batchRecipients.slice(0, result.succeeded).map(r => r.to)
      const failedEmails = batchRecipients.slice(result.succeeded).map(r => r.to)

      // Update in chunks
      const CHUNK_SIZE = 100
      for (let i = 0; i < sentEmails.length; i += CHUNK_SIZE) {
        const chunk = sentEmails.slice(i, i + CHUNK_SIZE)
        await sb.from('campaign_recipients')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('campaign_id', campaignId)
          .in('email', chunk)
          .then(() => {}, () => {})
      }

      for (let i = 0; i < failedEmails.length; i += CHUNK_SIZE) {
        const chunk = failedEmails.slice(i, i + CHUNK_SIZE)
        await sb.from('campaign_recipients')
          .update({ status: 'failed', error: 'Batch send failure or API error' })
          .eq('campaign_id', campaignId)
          .in('email', chunk)
          .then(() => {}, () => {})
      }
    } else if (result.failed > 0) {
      // All failed
      await sb.from('campaign_recipients')
        .update({ status: 'failed', error: result.errors.join('; ') || 'Unknown error' })
        .eq('campaign_id', campaignId)
        .then(() => {}, () => {})
    }

    // Update campaign status
    await sb.from('email_campaigns').update({
      sent_count: result.succeeded,
      failed_count: result.failed,
      status: result.failed === batchRecipients.length && batchRecipients.length > 0 ? 'failed' : 'completed',
      sent_at: new Date().toISOString(),
    }).eq('id', campaignId)
  }

  // Send emails with await (Vercel serverless kills fire-and-forget)
  let sendResult
  try {
    sendResult = await sendCampaignEmailBatch(batchRecipients, subject, body_html)
  } catch (sendErr: any) {
    console.error('[campaigns] Batch send exception:', sendErr)
    sendResult = { succeeded: 0, failed: batchRecipients.length, errors: [sendErr.message] }
  }

  // Update sent recipients
  if (sendResult.succeeded > 0 && batchRecipients.length > 0) {
    const sentEmails = batchRecipients.slice(0, sendResult.succeeded).map(r => r.to)
    const failedEmails = batchRecipients.slice(sendResult.succeeded).map(r => r.to)

    const CHUNK_SIZE = 100
    for (let i = 0; i < sentEmails.length; i += CHUNK_SIZE) {
      const chunk = sentEmails.slice(i, i + CHUNK_SIZE)
      await sb.from('campaign_recipients')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('campaign_id', campaignId)
        .in('email', chunk)
        .then(() => {}, () => {})
    }

    for (let i = 0; i < failedEmails.length; i += CHUNK_SIZE) {
      const chunk = failedEmails.slice(i, i + CHUNK_SIZE)
      await sb.from('campaign_recipients')
        .update({ status: 'failed', error: 'Batch send failure or API error' })
        .eq('campaign_id', campaignId)
        .in('email', chunk)
        .then(() => {}, () => {})
    }
  } else if (sendResult.failed > 0) {
    await sb.from('campaign_recipients')
      .update({ status: 'failed', error: sendResult.errors.join('; ') || 'Unknown error' })
      .eq('campaign_id', campaignId)
      .then(() => {}, () => {})
  }

  // Update campaign status
  await sb.from('email_campaigns').update({
    sent_count: sendResult.succeeded,
    failed_count: sendResult.failed,
    status: sendResult.failed === batchRecipients.length && batchRecipients.length > 0 ? 'failed' : 'completed',
    sent_at: new Date().toISOString(),
  }).eq('id', campaignId)

  return NextResponse.json({
    campaign: {
      id: campaignId,
      recipient_count: uniqueRecipients.length,
      sent_count: sendResult.succeeded,
      failed_count: sendResult.failed,
      status: sendResult.failed === batchRecipients.length && batchRecipients.length > 0 ? 'failed' : 'completed',
    },
  }, { status: 201 })
}
