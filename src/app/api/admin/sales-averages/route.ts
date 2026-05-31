import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth';

export const dynamic = 'force-dynamic';

// Percentile helper (linear interpolation)
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

// Day names: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

// Display order: Lun(1), Mar(2), Mie(3), Jue(4), Vie(5), Sab(6), Dom(0)
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Minimum daily revenue to consider a day "open" (filters out adjustments/noise)
const MIN_DAILY_REVENUE = 100_000; // $100K COP

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request);
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const sb = getServiceClient();

  // Fetch all non-cancelled sales with subtotal for accurate revenue
  // NOTE: Supabase JS client defaults to 1000 rows. Must set explicit limit.
  const { data: sales, error } = await sb
    .from('pos_sales')
    .select('subtotal, tax_amount, total, tip_amount, opened_at, is_cancelled')
    .eq('is_cancelled', false)
    .limit(50000);

  if (error) {
    return NextResponse.json({ error: 'Error consultando ventas', detail: error.message }, { status: 500 });
  }

  if (!sales || sales.length === 0) {
    return NextResponse.json({ days: [], weekly_total: { avg_per_week: 0, total_days: 0, total_revenue: 0 }, debug: 'No sales returned from Supabase' });
  }

  // Group sales by date in Colombia timezone
  // Using America/Bogota (UTC-5) timezone conversion
  const dailyMap = new Map<string, { dayIndex: number; revenue: number; tips: number; txCount: number }>();

  // Debug: count how many have opened_at
  const withOpenedAt = sales.filter(s => s.opened_at).length;
  const firstSale = sales.find(s => s.opened_at);
  console.log(`[sales-averages] Total: ${sales.length}, with opened_at: ${withOpenedAt}, first: ${JSON.stringify(firstSale)}`);

  // Helper: extract date parts in Colombia timezone WITHOUT the toLocaleString→new Date bug.
  // new Date(localeString) re-interprets as UTC, shifting day boundaries in UTC-5.
  // Instead, use Intl.DateTimeFormat to get year/month/day directly.
  function getColombiaDateParts(isoStr: string): { year: number; month: number; day: number; dayIndex: number } | null {
    try {
      const utcDate = new Date(isoStr);
      if (isNaN(utcDate.getTime())) return null;
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
      });
      const parts = fmt.formatToParts(utcDate);
      const get = (type: string) => parts.find(p => p.type === type)?.value || '';
      return {
        year: parseInt(get('year')),
        month: parseInt(get('month')),
        day: parseInt(get('day')),
        dayIndex: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
      };
    } catch {
      return null;
    }
  }

  for (const sale of sales) {
    if (!sale.opened_at) continue;

    const parts = getColombiaDateParts(sale.opened_at);
    if (!parts) continue;

    const { year, month, day, dayIndex } = parts;
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Use subtotal + tax as revenue (total may have discounts applied)
    const subtotal = sale.subtotal || 0;
    const tax = sale.tax_amount || 0;
    const revenue = subtotal + tax;
    const tip = sale.tip_amount || 0;

    const existing = dailyMap.get(dateKey);
    if (existing) {
      existing.revenue += revenue;
      existing.tips += tip;
      existing.txCount += 1;
    } else {
      dailyMap.set(dateKey, { dayIndex, revenue, tips: tip, txCount: 1 });
    }
  }

  // Determine the full date range (including days with no sales as $0)
  const allDates = [...dailyMap.keys()].sort();

  // Parse first/last date safely (they are YYYY-MM-DD in Colombia timezone)
  function parseDateKey(key: string): Date {
    const [y, m, d] = key.split('-').map(Number);
    // Use noon UTC to avoid any DST/offset issues with date arithmetic
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }

  const firstDate = parseDateKey(allDates[0]);
  const lastDate = parseDateKey(allDates[allDates.length - 1]);

  // Add missing days in range as $0 revenue (closed days)
  const current = new Date(firstDate);
  while (current <= lastDate) {
    // Format key from UTC noon date (still represents the correct calendar day)
    const key = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`;
    if (!dailyMap.has(key)) {
      // getDay() on UTC noon = correct weekday for that calendar date in Colombia
      const dayIndex = current.getUTCDay();
      dailyMap.set(key, { dayIndex, revenue: 0, tips: 0, txCount: 0 });
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // Group by day-of-week (including $0 days for closed days)
  const dayOfWeekData: Record<number, { revenues: number[]; tips: number[]; txCounts: number[] }> = {};
  for (let i = 0; i < 7; i++) {
    dayOfWeekData[i] = { revenues: [], tips: [], txCounts: [] };
  }

  for (const [, data] of dailyMap) {
    dayOfWeekData[data.dayIndex].revenues.push(data.revenue);
    dayOfWeekData[data.dayIndex].tips.push(data.tips);
    dayOfWeekData[data.dayIndex].txCounts.push(data.txCount);
  }

  // Calculate statistics for each day using MEDIAN as primary metric
  const days = DISPLAY_ORDER.map(dayIndex => {
    const d = dayOfWeekData[dayIndex];
    const revenues = d.revenues;
    const tips = d.tips;
    const txCounts = d.txCounts;
    const count = revenues.length;

    // Filter: only consider "open" days (revenue >= threshold) for tx/tip averages
    const openDays = revenues.filter(r => r >= MIN_DAILY_REVENUE);
    const openCount = openDays.length;

    const median = percentile(revenues, 50);
    const avg = count > 0 ? revenues.reduce((s, v) => s + v, 0) / count : 0;
    const q1 = percentile(revenues, 25);
    const q3 = percentile(revenues, 75);
    const min = count > 0 ? Math.min(...revenues) : 0;
    const max = count > 0 ? Math.max(...revenues) : 0;

    // tx/tip averages only from open days (not $0 closed days)
    const openTxCounts = txCounts.filter((_, i) => revenues[i] >= MIN_DAILY_REVENUE);
    const openTips = tips.filter((_, i) => revenues[i] >= MIN_DAILY_REVENUE);
    const tx_avg = openCount > 0 ? openTxCounts.reduce((s, v) => s + v, 0) / openCount : 0;
    const tip_avg = openCount > 0 ? openTips.reduce((s, v) => s + v, 0) / openCount : 0;

    return {
      day_index: dayIndex,
      day_name: DAY_NAMES[dayIndex],
      avg: Math.round(avg),
      median: Math.round(median),
      q1: Math.round(q1),
      q3: Math.round(q3),
      min: Math.round(min),
      max: Math.round(max),
      count,
      open_days: openCount,
      tx_avg: Math.round(tx_avg * 10) / 10,
      tip_avg: Math.round(tip_avg),
    };
  });

  // Weekly total: sum of medians (more robust than sum of means)
  const medianPerWeek = days.reduce((s, d) => s + d.median, 0);

  // Also provide the mean-based weekly for comparison
  const avgPerWeek = days.reduce((s, d) => s + d.avg, 0);

  // Total revenue across all days
  const allRevenues = [...dailyMap.values()].map(d => d.revenue);
  const totalDays = allRevenues.length;
  const totalRevenueAll = allRevenues.reduce((s, v) => s + v, 0);

  return NextResponse.json({
    days,
    weekly_total: {
      avg_per_week: Math.round(avgPerWeek),
      median_per_week: Math.round(medianPerWeek),
      total_days: totalDays,
      total_revenue: Math.round(totalRevenueAll),
    },
    _debug: {
      salesCount: sales.length,
      withOpenedAt,
      dailyMapSize: dailyMap.size,
      firstSaleOpenedAt: firstSale?.opened_at || null,
      firstDateKey: allDates[0] || null,
      lastDateKey: allDates[allDates.length - 1] || null,
    },
  });
}