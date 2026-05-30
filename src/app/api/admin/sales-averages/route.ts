import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth';

export const revalidate = 3600; // 1 hour cache

// Percentile helper
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

// Display order: Lun(1)=0, Mar(2)=1, Mie(3)=2, Jue(4)=3, Vie(5)=4, Sab(6)=5, Dom(0)=6
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request);
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const sb = getServiceClient();

  // Fetch all non-cancelled sales
  const { data: sales, error } = await sb
    .from('pos_sales')
    .select('total, tip_amount, opened_at, is_cancelled')
    .eq('is_cancelled', false);

  if (error) {
    return NextResponse.json({ error: 'Error consultando ventas' }, { status: 500 });
  }

  if (!sales || sales.length === 0) {
    return NextResponse.json({ days: [], weekly_total: { avg_per_week: 0, total_days: 0, total_revenue: 0 } });
  }

  // Group sales by (date in Colombia timezone, day_of_week)
  // Using America/Bogota (UTC-5) timezone conversion
  const dailyMap = new Map<string, { dayIndex: number; revenue: number; tips: number; txCount: number }>();

  for (const sale of sales) {
    if (!sale.opened_at) continue;

    // Convert to Colombia timezone using toLocaleString
    const localDateStr = new Date(sale.opened_at).toLocaleString('en-US', { timeZone: 'America/Bogota' });
    const localDate = new Date(localDateStr);
    const dayIndex = localDate.getDay(); // 0=Sunday ... 6=Saturday

    // Create a date key for grouping by day
    const dateKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

    const existing = dailyMap.get(dateKey);
    const total = sale.total || 0;
    const tip = sale.tip_amount || 0;

    if (existing) {
      existing.revenue += total;
      existing.tips += tip;
      existing.txCount += 1;
    } else {
      dailyMap.set(dateKey, { dayIndex, revenue: total, tips: tip, txCount: 1 });
    }
  }

  // Group by day-of-week
  const dayOfWeekData: Record<number, { revenues: number[]; tips: number[]; txCounts: number[] }> = {};
  for (let i = 0; i < 7; i++) {
    dayOfWeekData[i] = { revenues: [], tips: [], txCounts: [] };
  }

  for (const [, data] of dailyMap) {
    dayOfWeekData[data.dayIndex].revenues.push(data.revenue);
    dayOfWeekData[data.dayIndex].tips.push(data.tips);
    dayOfWeekData[data.dayIndex].txCounts.push(data.txCount);
  }

  // Calculate statistics for each day
  const days = DISPLAY_ORDER.map(dayIndex => {
    const d = dayOfWeekData[dayIndex];
    const revenues = d.revenues;
    const tips = d.tips;
    const txCounts = d.txCounts;
    const count = revenues.length;

    const totalRevenue = revenues.reduce((s, v) => s + v, 0);
    const avg = count > 0 ? totalRevenue / count : 0;
    const median = percentile(revenues, 50);
    const q1 = percentile(revenues, 25);
    const q3 = percentile(revenues, 75);
    const min = count > 0 ? Math.min(...revenues) : 0;
    const max = count > 0 ? Math.max(...revenues) : 0;
    const tx_avg = count > 0 ? txCounts.reduce((s, v) => s + v, 0) / count : 0;
    const tip_avg = count > 0 ? tips.reduce((s, v) => s + v, 0) / count : 0;

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
      tx_avg: Math.round(tx_avg * 10) / 10,
      tip_avg: Math.round(tip_avg),
    };
  });

  // Weekly totals
  const allRevenues = [...dailyMap.values()].map(d => d.revenue);
  const totalDays = allRevenues.length;
  const totalRevenueAll = allRevenues.reduce((s, v) => s + v, 0);
  // Average per week: total revenue / number of weeks spanned
  // Approximate: sum of daily averages for all 7 days
  const avgPerWeek = days.reduce((s, d) => s + d.avg, 0);

  return NextResponse.json({
    days,
    weekly_total: {
      avg_per_week: Math.round(avgPerWeek),
      total_days: totalDays,
      total_revenue: Math.round(totalRevenueAll),
    },
  });
}