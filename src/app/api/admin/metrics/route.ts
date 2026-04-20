import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const since30 = fmt(thirtyDaysAgo)
  const since14 = fmt(fourteenDaysAgo)

  const [recentRes, dailyRes] = await Promise.all([
    sb.from('reservations').select('time_start, source, status, party_size, date').eq('restaurant_id', RESTAURANT_ID).gte('date', since30),
    sb.from('reservations').select('date, status').eq('restaurant_id', RESTAURANT_ID).gte('date', since14).order('date', { ascending: true }),
  ])

  const recent = recentRes.data || []
  const daily = dailyRes.data || []

  const hourCounts = new Map<string, number>()
  for (const r of recent) {
    hourCounts.set(r.time_start, (hourCounts.get(r.time_start) || 0) + 1)
  }
  const peakHours = [...hourCounts.entries()].map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour.localeCompare(b.hour))

  const sourceCounts = new Map<string, number>()
  for (const r of recent) {
    const s = r.source || 'web'
    sourceCounts.set(s, (sourceCounts.get(s) || 0) + 1)
  }
  const bySource = [...sourceCounts.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count)

  const pending = recent.filter(r => r.status === 'pending').length
  const confirmed = recent.filter(r => ['confirmed', 'pre_paid', 'seated', 'completed'].includes(r.status)).length
  const conversionRate = (pending + confirmed) > 0 ? Math.round((confirmed / (pending + confirmed)) * 100) : 0

  const completed = recent.filter(r => r.status === 'completed').length
  const noShows = recent.filter(r => r.status === 'no_show').length
  const noShowRate = (completed + noShows) > 0 ? Math.round((noShows / (completed + noShows)) * 100) : 0

  const totalParty = recent.reduce((s, r) => s + r.party_size, 0)
  const avgPartySize = recent.length > 0 ? Math.round((totalParty / recent.length) * 10) / 10 : 0

  const dailyMap = new Map<string, { total: number; confirmed: number }>()
  for (const r of daily) {
    if (!dailyMap.has(r.date)) dailyMap.set(r.date, { total: 0, confirmed: 0 })
    const d = dailyMap.get(r.date)!
    d.total++
    if (['confirmed', 'pre_paid', 'seated', 'completed'].includes(r.status)) d.confirmed++
  }
  const dailyTrend = [...dailyMap.entries()].map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    peakHours,
    bySource,
    conversionRate,
    conversion: { pending, confirmed, rate: conversionRate },
    noShowRate,
    noShow: { total: completed + noShows, no_shows: noShows, rate: noShowRate },
    avgPartySize,
    dailyTrend,
  })
}