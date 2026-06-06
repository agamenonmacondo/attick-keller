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

    // Si hay filtro de categoría, filtrar client-side (la RPC ya está optimizada)
    let filtered = data || []
    if (category && category !== 'Todas') {
      filtered = filtered.filter((p: any) => p.macro_category === category)
    }

    // Calcular resumen por macrocategoría
    const categorySummary: Record<string, { revenue: number; margin_pct: number; count: number; importan: number; drenan: number }> = {}

    for (const p of filtered) {
      const cat = p.macro_category
      if (!categorySummary[cat]) {
        categorySummary[cat] = { revenue: 0, margin_pct: 0, count: 0, importan: 0, drenan: 0 }
      }
      categorySummary[cat].revenue += Number(p.revenue || 0)
      categorySummary[cat].count++
      
      // Clasificar: importa (margen > 25% y revenue > mediana) o drena (margen < 15% o revenue < mediana)
      // La mediana se calcula sobre revenue
    }

    // Calcular medianas para clasificación
    const revenues = filtered.map((p: any) => Number(p.revenue || 0)).sort((a: number, b: number) => a - b)
    const medianRevenue = revenues.length > 0 ? revenues[Math.floor(revenues.length / 2)] : 0

    for (const p of filtered) {
      const rev = Number(p.revenue || 0)
      const mrg = Number(p.margin_pct || 0)
      const cat = p.macro_category

      if (mrg >= 25 && rev >= medianRevenue) {
        categorySummary[cat].importan++
      } else if (mrg < 15 || rev < medianRevenue * 0.1) {
        categorySummary[cat].drenan++
      }
    }

    // Calcular margen promedio por categoría
    for (const cat of Object.keys(categorySummary)) {
      const catProducts = filtered.filter((p: any) => p.macro_category === cat)
      const totalMargin = catProducts.reduce((s: number, p: any) => s + Number(p.margin_pct || 0), 0)
      categorySummary[cat].margin_pct = catProducts.length > 0 ? Math.round(totalMargin / catProducts.length) : 0
    }

    // Calcular KPIs globales
    const totalRevenue = filtered.reduce((s: number, p: any) => s + Number(p.revenue || 0), 0)
    const totalCost = filtered.reduce((s: number, p: any) => s + Number(p.cost_total || 0), 0)
    const totalMarginPct = totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10 : 0
    const totalMarginBruto = totalRevenue - totalCost

    // Top 15 (importan) y bottom 10 (drenan) por margen bruto
    const sorted = [...filtered].sort((a: any, b: any) => Number(b.margin_bruto || 0) - Number(a.margin_bruto || 0))
    const importan = sorted.slice(0, 15)
    const drenan = sorted.slice(-10).reverse()

    return NextResponse.json({
      kpis: {
        total_revenue: totalRevenue,
        margin_bruto: totalMarginBruto,
        margin_pct: totalMarginPct,
        total_productos: filtered.length
      },
      resumen_ejecutivo: {
        categorias: Object.entries(categorySummary).map(([cat, info]) => ({
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
