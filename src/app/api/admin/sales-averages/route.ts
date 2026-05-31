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

/**
 * Extract date parts in Colombia timezone WITHOUT the toLocaleString→new Date bug.
 * new Date(localeString) re-interprets as UTC, shifting day boundaries in UTC-5.
 * Instead, use Intl.DateTimeFormat to get year/month/day directly.
 */
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

/**
 * Compute ISO week string for a Colombia-local date.
 * Replicates the frontend getWeekStr() algorithm (costCalculator.ts) but using
 * Colombia date parts as input instead of a JS Date object.
 * Algorithm: Thursday-based ISO 8601 week numbering via UTC math.
 */
function colombiaWeekStr(year: number, month: number, day: number): string {
  // Build a UTC noon date for this calendar day (avoids DST/offset edge cases)
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayNum = d.getUTCDay() || 7; // Sunday = 7, Monday = 1

  // Set to Thursday of the same ISO week
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  // January 4th is always in ISO week 1
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.floor((d.getTime() - yearStart.getTime()) / 86400000 / 7) + 1;

  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request);
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const sb = getServiceClient();

  // Fetch all non-cancelled sales with subtotal for accurate revenue
  const { data: sales, error } = await sb
    .from('pos_sales')
    .select('subtotal, tax_amount, total, tip_amount, opened_at, is_cancelled')
    .eq('is_cancelled', false)
    .limit(50000);

  if (error) {
    return NextResponse.json({ error: 'Error consultando ventas', detail: error.message }, { status: 500 });
  }

  if (!sales || sales.length === 0) {
    return NextResponse.json({
      days: [],
      weekly_total: { avg_per_week: 0, median_per_week: 0, total_days: 0, total_revenue: 0 },
      debug: 'No sales returned from Supabase',
    });
  }

  // Pass 1: Group sales by Colombia date (YYYY-MM-DD key)
  const dailyMap = new Map<string, { dayIndex: number; revenue: number; tips: number; txCount: number }>();

  for (const sale of sales) {
    if (!sale.opened_at) continue;

    const parts = getColombiaDateParts(sale.opened_at);
    if (!parts) continue;

    const { year, month, day, dayIndex } = parts;
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Revenue = subtotal + tax (total may have discounts applied)
    const revenue = (sale.subtotal || 0) + (sale.tax_amount || 0);
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

  // Fill in missing dates in range as $0 (closed days)
  const allDates = Array.from(dailyMap.keys()).sort();

  function parseDateKey(key: string): Date {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }

  const firstDate = parseDateKey(allDates[0]);
  const lastDate = parseDateKey(allDates[allDates.length - 1]);

  const current = new Date(firstDate);
  while (current <= lastDate) {
    const key = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`;
    if (!dailyMap.has(key)) {
      const dayIndex = current.getUTCDay();
      dailyMap.set(key, { dayIndex, revenue: 0, tips: 0, txCount: 0 });
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // ================================================================
  // FIX 2: Weekly medians — group by real ISO weeks, then percentile
  // ================================================================
  const weeklyTotals = new Map<string, number>(); // weekStr → totalRevenue

  dailyMap.forEach((data, dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const weekStr = colombiaWeekStr(y, m, d);
    const prev = weeklyTotals.get(weekStr) || 0;
    weeklyTotals.set(weekStr, prev + data.revenue);
  });

  const allWeeklyTotals = Array.from(weeklyTotals.values());
  const realWeeklyMedian = allWeeklyTotals.length > 0 ? percentile(allWeeklyTotals, 50) : 0;
  const realWeeklyAvg = allWeeklyTotals.length > 0
    ? allWeeklyTotals.reduce((s, v) => s + v, 0) / allWeeklyTotals.length
    : 0;

  // ================================================================
  // FIX 1: Day-of-week stats only from OPEN days (revenue >= threshold)
  // ================================================================
  const dayOfWeekData: Record<number, {
    revenues: number[];      // all days (including $0) — for count only
    openRevenues: number[];  // only days with revenue >= MIN_DAILY_REVENUE
    tips: number[];
    txCounts: number[];
  }> = {};
  for (let i = 0; i < 7; i++) {
    dayOfWeekData[i] = { revenues: [], openRevenues: [], tips: [], txCounts: [] };
  }

  dailyMap.forEach((data) => {
    dayOfWeekData[data.dayIndex].revenues.push(data.revenue);
    dayOfWeekData[data.dayIndex].tips.push(data.tips);
    dayOfWeekData[data.dayIndex].txCounts.push(data.txCount);
    if (data.revenue >= MIN_DAILY_REVENUE) {
      dayOfWeekData[data.dayIndex].openRevenues.push(data.revenue);
    }
  });

  const days = DISPLAY_ORDER.map(dayIndex => {
    const d = dayOfWeekData[dayIndex];
    const revenues = d.revenues;       // all days
    const openRevs = d.openRevenues;   // only open days
    const count = revenues.length;
    const openCount = openRevs.length;

    // Median, avg, q1, q3 — ONLY from open days
    const median = openCount > 0 ? percentile(openRevs, 50) : 0;
    const avg = openCount > 0 ? openRevs.reduce((s, v) => s + v, 0) / openCount : 0;
    const q1 = openCount > 0 ? percentile(openRevs, 25) : 0;
    const q3 = openCount > 0 ? percentile(openRevs, 75) : 0;
    const min = openCount > 0 ? Math.min(...openRevs) : 0;
    const max = openCount > 0 ? Math.max(...openRevs) : 0;

    // tx/tip averages only from open days
    const openTxCounts = d.txCounts.filter((_, i) => revenues[i] >= MIN_DAILY_REVENUE);
    const openTips = d.tips.filter((_, i) => revenues[i] >= MIN_DAILY_REVENUE);
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
      count,               // total days in range
      open_days: openCount, // days actually open
      tx_avg: Math.round(tx_avg * 10) / 10,
      tip_avg: Math.round(tip_avg),
    };
  });

  // Total revenue across all days (for reference)
  const totalDays = allDates.length;
  const totalRevenueAll = Array.from(dailyMap.values()).reduce((s, d) => s + d.revenue, 0);

  // For backward compat: "sum of medians" still useful as a quick estimate
  const sumOfMedians = days.reduce((s, d) => s + d.median, 0);

  return NextResponse.json({
    days,
    weekly_total: {
      avg_per_week: Math.round(realWeeklyAvg),
      median_per_week: Math.round(realWeeklyMedian),
      sum_of_medians: Math.round(sumOfMedians), // kept for reference
      total_days: totalDays,
      total_revenue: Math.round(totalRevenueAll),
      total_weeks: allWeeklyTotals.length,
    },
    _debug: {
      salesCount: sales.length,
      dailyMapSize: dailyMap.size,
      weeklyMapSize: allWeeklyTotals.length,
      sampleWeeks: Array.from(weeklyTotals.entries()).slice(0, 5),
    },
  });
}
