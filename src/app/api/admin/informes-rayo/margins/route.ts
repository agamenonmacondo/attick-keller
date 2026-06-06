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

    // ── CLASIFICACIÓN POR MARGEN BRUTO EN PESOS ──
    const margenesBrutos = filtered
      .map((p: any) => Number(p.margin_bruto || 0))
      .sort((a: number, b: number) => a - b)

    // Threshold: bottom 5% por margen bruto = DRENA
    const drenaIdx = Math.max(0, Math.floor(margenesBrutos.length * 0.05))
    const drenaThreshold = margenesBrutos.length > 0 ? margenesBrutos[drenaIdx] : 0

    // Threshold: top 40% por revenue + margen > mediana = IMPORTA
    const revenues = filtered.map((p: any) => Number(p.revenue || 0)).sort((a: number, b: number) => a - b)
    const medianRevenue = revenues.length > 0 ? revenues[Math.floor(revenues.length / 2)] : 0
    const medianMargin = filtered.map((p: any) => Number(p.margin_pct || 0)).sort((a: number, b: number) => a - b)[Math.floor(filtered.length / 2)] || 0

    for (const p of filtered) {
      const cat = p.macro_category
      const mb = Number(p.margin_bruto || 0)
      const rev = Number(p.revenue || 0)
      const mrg = Number(p.margin_pct || 0)

      // IMPORTA: alto margen bruto Y revenue significativo
      if (mb > drenaThreshold * 3 && rev >= medianRevenue * 0.4) {
        catSummary[cat].importan++
      }

      // DRENA: bottom 5% por margen bruto en pesos
      if (mb <= drenaThreshold && mb >= 0 && filtered.length > 20) {
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

    // ── LO QUE DRENA (bottom 10 por margen bruto en pesos) ──
    // Excluir productos con margen bruto > drenaThreshold * 2 (son viables, solo bajos relativos)
    const drenan = [...filtered]
      .filter((p: any) => {
        const mb = Number(p.margin_bruto || 0)
        // Margen bruto negativo SIEMPRE es drena
        if (mb < 0) return true
        // Bottom 5% por contribución neta
        if (filtered.length > 20 && mb <= drenaThreshold) return true
        return false
      })
      .sort((a: any, b: any) => Number(a.margin_bruto || 0) - Number(b.margin_bruto || 0))
      .slice(0, 10)

    // ── DIAGNÓSTICO PARA CADA PRODUCTO DRENA ──
    const drenanConDiagnostico = drenan.map((p: any) => {
      const mb = Number(p.margin_bruto || 0)
      const rev = Number(p.revenue || 0)
      const qty = Number(p.quantity_sold || 0)
      const mrg = Number(p.margin_pct || 0)

      let diagnostico = ''
      if (mb < 0) {
        diagnostico = `Margen bruto negativo: cuesta más producirlo ($${Math.abs(mb).toLocaleString('es-CO')}) de lo que genera en ventas ($${rev.toLocaleString('es-CO')}). Requiere rediseño de receta o eliminación.`
      } else if (qty <= 2) {
        diagnostico = `Solo ${qty} venta(s) en el período. Margen alto (${mrg}%) pero contribución mínima al negocio: $${mb.toLocaleString('es-CO')} netos en total. Ocupa espacio en menú e inventario.`
      } else if (mb < drenaThreshold * 0.5) {
        diagnostico = `Contribución neta muy baja: $${mb.toLocaleString('es-CO')}. Aunque tiene margen del ${mrg}%, el volumen de ventas es insuficiente para justificar su lugar en el menú.`
      } else {
        diagnostico = `En el 5% inferior por ganancia neta ($${mb.toLocaleString('es-CO')}). Evaluar si su presencia en el menú está justificada por rol estratégico.`
      }

      return { ...p, diagnostico }
    })

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
      drenan: drenanConDiagnostico,
      todos: filtered
    })

  } catch (err: any) {
    console.error('[margins] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
