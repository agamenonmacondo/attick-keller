import { NextRequest, NextResponse } from 'next/server';
import { getStaffOrLeaderUser, getServiceClient } from '@/lib/utils/admin-auth';

export const dynamic = 'force-dynamic';

const MIN_DAILY_REVENUE = 100_000;
const PAGE_SIZE = 1000;

// ISO week string from a calendar date (YYYY, M 1-12, D).
// NOTE: duplicates the helper in sales-averages/route.ts (same algorithm as
// costCalculator.getWeekStr). Kept local to avoid a shared-file refactor.
function colombiaWeekStr(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.floor((d.getTime() - yearStart.getTime()) / 86400000 / 7) + 1;
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// GET /api/admin/monthly-sales?month=2026-06
// Suma las ventas REALES del mes (subtotal + tax_amount, is_cancelled=false),
// agrupando por dia operacional (hour < 4 → dia anterior) y por semana ISO.
export async function GET(request: NextRequest) {
  const admin = await getStaffOrLeaderUser(request);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const sb = getServiceClient();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month requerido (formato YYYY-MM)' }, { status: 400 });
  }

  const [year, mon] = month.split('-').map(Number);

  // Bounds: include early-morning of the 1st of next month (hour < 4) which
  // operationally belong to the last day of this month. Exclude via .lt()
  // and then keep only sales whose OPERATIONAL month matches the request.
  const fromDate = `${month}-01T00:00:00+00:00`;
  const nextMonthDate = new Date(Date.UTC(year, mon, 1)); // mon is 1-12; month arg = mon → next month's 1st
  const toDateExclusive = `${nextMonthDate.getUTCFullYear()}-${pad2(nextMonthDate.getUTCMonth() + 1)}-${pad2(nextMonthDate.getUTCDate())}T04:00:00+00:00`;

  const targetMonth = month; // 'YYYY-MM' to compare operational month against

  const dailyMap = new Map<string, { revenue: number; cheques: number }>();
  let page = 0;
  let fetchedOnThisPage = 0;

  do {
    const offset = page * PAGE_SIZE;
    const { data, error } = await sb
      .from('pos_sales')
      .select('subtotal, tax_amount, opened_at')
      .eq('is_cancelled', false)
      .gte('opened_at', fromDate)
      .lt('opened_at', toDateExclusive)
      .order('opened_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: 'Error consultando ventas' }, { status: 500 });
    }

    fetchedOnThisPage = data ? data.length : 0;

    if (data) {
      for (const sale of data as { subtotal: number | null; tax_amount: number | null; opened_at: string | null }[]) {
        if (!sale.opened_at) continue;

        const d = new Date(sale.opened_at);
        if (isNaN(d.getTime())) continue;

        let opY = d.getUTCFullYear();
        let opM = d.getUTCMonth(); // 0-11
        let opD = d.getUTCDate();
        const hour = d.getUTCHours();

        // Operational day: before 4 AM → previous calendar day
        if (hour < 4) {
          const prev = new Date(Date.UTC(opY, opM, opD - 1));
          opY = prev.getUTCFullYear();
          opM = prev.getUTCMonth();
          opD = prev.getUTCDate();
        }

        const opMonth = `${opY}-${pad2(opM + 1)}`;
        if (opMonth !== targetMonth) continue; // operational date outside requested month

        const dateKey = `${opY}-${pad2(opM + 1)}-${pad2(opD)}`;
        const revenue = (sale.subtotal || 0) + (sale.tax_amount || 0);

        const existing = dailyMap.get(dateKey);
        if (existing) {
          existing.revenue += revenue;
          existing.cheques += 1;
        } else {
          dailyMap.set(dateKey, { revenue, cheques: 1 });
        }
      }
    }

    page++;
  } while (fetchedOnThisPage >= PAGE_SIZE);

  // Agregar por semana
  const semanaMap = new Map<string, { week_str: string; ventas: number; cheques: number }>();
  let totalVentas = 0;
  let totalCheques = 0;
  let diasAbiertos = 0;

  for (const [dateKey, agg] of dailyMap.entries()) {
    const [y, m, dd] = dateKey.split('-').map(Number);
    const ws = colombiaWeekStr(y, m, dd);
    const sem = semanaMap.get(ws) || { week_str: ws, ventas: 0, cheques: 0 };
    sem.ventas += agg.revenue;
    sem.cheques += agg.cheques;
    semanaMap.set(ws, sem);

    totalVentas += agg.revenue;
    totalCheques += agg.cheques;
    if (agg.revenue >= MIN_DAILY_REVENUE) diasAbiertos++;
  }

  const por_semana = Array.from(semanaMap.values())
    .sort((a, b) => a.week_str.localeCompare(b.week_str))
    .map(s => ({ ...s, ventas: Math.round(s.ventas) }));

  return NextResponse.json({
    month: targetMonth,
    total_ventas: Math.round(totalVentas),
    total_cheques: totalCheques,
    dias_abiertos: diasAbiertos,
    por_semana,
    _debug: {
      pages: page,
      dailyDays: dailyMap.size,
    },
  });
}