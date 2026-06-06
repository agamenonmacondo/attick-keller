import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const category = searchParams.get('category') || ''

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data, error } = await supabase.rpc('get_product_margins', {
      from_date: from,
      to_date: to
    })

    if (error) throw error

    let filtered = data || []
    if (category && category !== 'Todas') {
      filtered = filtered.filter((p: any) => p.macro_category === category)
    }

    // ── RESUMEN POR CATEGORÍA ──
    const catSummary: Record<string, { revenue: number; margin_pct: number; count: number; importan: number; drenan: number }> = {}
    for (const p of filtered) {
      const cat = p.macro_category
      if (!catSummary[cat]) {
        catSummary[cat] = { revenue: 0, margin_pct: 0, count: 0, importan: 0, drenan: 0 }
      }
      catSummary[cat].revenue += Number(p.revenue || 0)
      catSummary[cat].count++
    }

    // ── CLASIFICACIÓN (auditoría jun-2026, márgenes reales verificados) ──
    const revenues = filtered.map((p: any) => Number(p.revenue || 0)).sort((a: number, b: number) => a - b)
    const medianRevenue = revenues.length > 0 ? revenues[Math.floor(revenues.length / 2)] : 0

    for (const p of filtered) {
      const rev = Number(p.revenue || 0)
      const mrg = Number(p.margin_pct || 0)
      const cat = p.macro_category

      // Adiciones/micro-productos con margen >50%: NO son lastre, son complementos
      const isAdicion = rev < medianRevenue * 0.15 && mrg > 50

      if (mrg >= 25 && rev >= medianRevenue * 0.3) {
        catSummary[cat].importan++
      } else if (!isAdicion && (mrg < 20 || Number(p.margin_bruto || 0) < 0)) {
        catSummary[cat].drenan++
      }
    }

    // ── MARGEN PONDERADO POR REVENUE ──
    for (const cat of Object.keys(catSummary)) {
      const prods = filtered.filter((p: any) => p.macro_category === cat)
      const totalRev = prods.reduce((s: number, p: any) => s + Number(p.revenue || 0), 0)
      const totalMrg = prods.reduce((s: number, p: any) => s + Number(p.margin_bruto || 0), 0)
      catSummary[cat].margin_pct = totalRev > 0 ? Math.round((totalMrg / totalRev) * 100) : 0
    }

    // ── KPIs GLOBALES ──
    const totalRevenue = filtered.reduce((s: number, p: any) => s + Number(p.revenue || 0), 0)
    const totalCost = filtered.reduce((s: number, p: any) => s + Number(p.cost_total || 0), 0)
    const totalMarginPct = totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10 : 0
    const totalMarginBruto = totalRevenue - totalCost

    // ── LO QUE IMPORTA (top 15 por margen bruto en pesos) ──
    const sorted = [...filtered].sort((a: any, b: any) => Number(b.margin_bruto || 0) - Number(a.margin_bruto || 0))
    const importan = sorted.slice(0, 15)

    // ── LO QUE DRENA (margen <20% o margen bruto negativo, excluyendo adiciones) ──
    const drenanCandidates = filtered
      .filter((p: any) => {
        const rev = Number(p.revenue || 0)
        const mrg = Number(p.margin_pct || 0)
        if (rev < medianRevenue * 0.15 && mrg > 50) return false
        return mrg < 20 || Number(p.margin_bruto || 0) < 0
      })
      .sort((a: any, b: any) => Number(a.margin_pct || 0) - Number(b.margin_pct || 0))
    const drenan = drenanCandidates.slice(0, 10)

    return NextResponse.json({
      kpis: {
        total_revenue: totalRevenue,
        margin_bruto: totalMarginBruto,
        margin_pct: totalMarginPct,
        total_productos: filtered.length
      },
      resumen_ejecutivo: {
        categorias: Object.entries(catSummary).map(([cat, info]) => ({
          categoria: cat,
          revenue: info.revenue,
          margin_pct: info.margin_pct,
          importan: info.importan,
          drenan: info.drenan,
          count: info.count
        }))
      },
      importan,
      drenan,
      todos: filtered
    })

  } catch (err: any) {
    console.error('[margins] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
