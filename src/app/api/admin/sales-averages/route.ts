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

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MIN_DAILY_REVENUE = 100_000;
const PAGE_SIZE = 1000;

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

function colombiaWeekStr(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.floor((d.getTime() - yearStart.getTime()) / 86400000 / 7) + 1;
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

interface DailyBucket {
  dayIndex: number;
  revenue: number;
  tips: number;
  txCount: number;
}

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request);
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const sb = getServiceClient();

  // Fetch ALL sales via pagination (Supabase defaults to 1000 rows per page)
  const dailyMap = new Map<string, DailyBucket>();
  let page = 0;
  let fetchedOnThisPage = 0;

  do {
    const offset = page * PAGE_SIZE;
    const { data, error } = await sb
      .from('pos_sales')
      .select('subtotal, tax_amount, tip_amount, opened_at, is_cancelled')
      .eq('is_cancelled', false)
      .order('opened_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: 'Error consultando ventas' }, { status: 500 });
    }

    fetchedOnThisPage = data ? data.length : 0;

    if (data) {
      for (const sale of data) {
        if (!sale.opened_at) continue;

        const parts = getColombiaDateParts(sale.opened_at);
        if (!parts) continue;

        const { year, month, day, dayIndex } = parts;
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

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
    }

    page++;
  } while (fetchedOnThisPage >= PAGE_SIZE);

  if (dailyMap.size === 0) {
    return NextResponse.json({
      days: [],
      weekly_total: { avg_per_week: 0, median_per_week: 0, total_days: 0, total_revenue: 0 },
    });
  }

  // Fill missing dates
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

  // Weekly medians
  const weeklyTotals = new Map<string, number>();

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

  // Day-of-week stats ONLY from open days
  const dayOfWeekData: Record<number, {
    revenues: number[];
    openRevenues: number[];
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
    const revenues = d.revenues;
    const openRevs = d.openRevenues;
    const count = revenues.length;
    const openCount = openRevs.length;

    const median = openCount > 0 ? percentile(openRevs, 50) : 0;
    const avg = openCount > 0 ? openRevs.reduce((s, v) => s + v, 0) / openCount : 0;
    const q1 = openCount > 0 ? percentile(openRevs, 25) : 0;
    const q3 = openCount > 0 ? percentile(openRevs, 75) : 0;
    const min = openCount > 0 ? Math.min(...openRevs) : 0;
    const max = openCount > 0 ? Math.max(...openRevs) : 0;

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
      count,
      open_days: openCount,
      tx_avg: Math.round(tx_avg * 10) / 10,
      tip_avg: Math.round(tip_avg),
    };
  });

  const totalDays = allDates.length;
  const totalRevenueAll = Array.from(dailyMap.values()).reduce((s, d) => s + d.revenue, 0);
  const sumOfMedians = days.reduce((s, d) => s + d.median, 0);

  return NextResponse.json({
    days,
    weekly_total: {
      avg_per_week: Math.round(realWeeklyAvg),
      median_per_week: Math.round(realWeeklyMedian),
      sum_of_medians: Math.round(sumOfMedians),
      total_days: totalDays,
      total_revenue: Math.round(totalRevenueAll),
      total_weeks: allWeeklyTotals.length,
    },
    _debug: {
      totalPages: page,
      dailyMapSize: dailyMap.size,
      weeklyMapSize: allWeeklyTotals.length,
    },
  });
}
