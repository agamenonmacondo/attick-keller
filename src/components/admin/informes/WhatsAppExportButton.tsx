'use client'

import { useState, useCallback } from 'react'
import { Lightning, Copy, Check, Spinner } from '@phosphor-icons/react'

interface WhatsAppExportButtonProps {
  data: any
  from: string
  to: string
  kpis?: any
  zones?: any[]
  payments?: any[]
  comparison?: { kpis: any } | null
  marginsData?: any
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${parseInt(d)} ${months[parseInt(m)]} ${y}`
}

export function WhatsAppExportButton({ data, from, to, kpis, zones, payments, comparison, marginsData }: WhatsAppExportButtonProps) {
  const [copied, setCopied] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCopy = useCallback(async () => {
    setError(null)
    setAnalyzing(true)

    try {
      // Call the LLM analysis endpoint
      const analysisText = await fetchAnalysisAndFormat(data, from, to, kpis, zones, payments, comparison, marginsData)

      try {
        await navigator.clipboard.writeText(analysisText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch {
        // Fallback for older browsers
        const ta = document.createElement('textarea')
        ta.value = analysisText
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch (err: any) {
      setError(err.message || 'Error al analizar')
    } finally {
      setAnalyzing(false)
    }
  }, [data, from, to, kpis, zones, payments, comparison, marginsData])

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        disabled={analyzing}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
          bg-[var(--color-ak-borgona)] text-white
          shadow-sm hover:shadow-md active:scale-95
          disabled:opacity-60 disabled:cursor-wait"
      >
        {analyzing ? (
          <>
            <Spinner size={16} className="animate-spin" />
            Analizando...
          </>
        ) : copied ? (
          <>
            <Check size={16} weight="bold" />
            Copiado
          </>
        ) : (
          <>
            <Lightning size={16} weight="fill" />
            Copiar WhatsApp
          </>
        )}
      </button>
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  )
}

// ═══ Fetch LLM analysis + format WhatsApp text ═══
async function fetchAnalysisAndFormat(
  data: any,
  from: string,
  to: string,
  kpis?: any,
  zones?: any[],
  payments?: any[],
  comparison?: { kpis: any } | null,
  marginsData?: any,
): Promise<string> {
  let analysis: any = null

  // Try to get LLM analysis
  try {
    const reportData = {
      kpis: kpis || data?.kpis || {},
      daily: data?.daily || [],
      zones: zones || data?.zones || [],
      staff: data?.staff || [],
      payments: payments || data?.payments || [],
      clientSplit: data?.clientSplit || [],
      topProducts: data?.topProducts || [],
      comparison: comparison || data?.comparison || null,
      period: { from, to, zone: 'all', compareFrom: '', compareTo: '' },
      margins: marginsData || data?.margins || null,
    }

    const res = await fetch('/api/admin/informes-rayo/analyze-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportData }),
    })

    if (res.ok) {
      const json = await res.json()
      if (json.analysis) {
        analysis = json.analysis
      }
    }
  } catch {
    // LLM failed — continue with rule-based generation
  }

  return generateWhatsAppText(data, from, to, kpis, zones, payments, comparison, marginsData, analysis)
}

// ═══ Generate WhatsApp-formatted text ═══
function generateWhatsAppText(
  data: any,
  from: string,
  to: string,
  kpis?: any,
  zones?: any[],
  payments?: any[],
  comparison?: { kpis: any } | null,
  marginsData?: any,
  analysis?: any,
): string {
  const lines: string[] = []
  const kpi = kpis || data?.kpis || {}
  const marginsDataObj = marginsData || data?.margins
  const margins = marginsDataObj?.todos || marginsDataObj?.importan || marginsDataObj?.drenan ? marginsDataObj : null
  const topProducts = data?.topProducts || []
  const zoneData = zones || data?.zones || []
  const paymentData = payments || data?.payments || []
  const compKpi = comparison?.kpis || data?.comparison?.kpis || null

  // ── Header ──
  lines.push(`⚡ INFORME RAYO`)
  lines.push(`${fmtDate(from)} — ${fmtDate(to)}`)
  lines.push('')

  // ── KPIs con comparación ──
  const revenue = Number(kpi.total_ventas ?? kpi.revenue ?? 0)
  const cheques = Number(kpi.total_cheques ?? kpi.cheques ?? 0)
  const ticket = cheques > 0 ? revenue / cheques : 0
  const propina = Number(kpi.propina_total ?? kpi.tip_total ?? 0)
  const personas = Number(kpi.personas ?? kpi.party_size_total ?? 0)
  const propinaPer = personas > 0 ? propina / personas : 0

  // Comparison deltas
  const cRevenue = Number(compKpi?.total_ventas ?? compKpi?.revenue ?? 0)
  const cCheques = Number(compKpi?.total_cheques ?? compKpi?.cheques ?? 0)
  const cPersonas = Number(compKpi?.personas ?? compKpi?.party_size_total ?? 0)
  const cTicket = cCheques > 0 ? cRevenue / cCheques : 0

  function delta(current: number, previous: number): string {
    if (!previous || previous === 0) return ''
    const pct = ((current - previous) / previous) * 100
    const arrow = pct >= 0 ? '↑' : '↓'
    return ` ${arrow}${Math.abs(pct).toFixed(1)}%`
  }

  lines.push(`💰 Ventas: ${fmtMoney(revenue)}${delta(revenue, cRevenue)}`)
  lines.push(`👥 Cheques: ${cheques.toLocaleString('es-CO')}${delta(cheques, cCheques)}`)
  lines.push(`🎫 Ticket prom: ${fmtMoney(ticket)}${delta(ticket, cTicket)}`)
  lines.push(`🤝 Personas: ${personas.toLocaleString('es-CO')}${delta(personas, cPersonas)}`)
  if (propina > 0) {
    lines.push(`💸 Propina: ${fmtMoney(propina)}`)
  }

  // ── Margen general ──
  if (margins) {
    const allProducts = margins.todos || margins.importan || []
    if (allProducts.length > 0) {
      const totalRev = allProducts.reduce((s: number, p: any) => s + (p.revenue || 0), 0)
      const totalMB = allProducts.reduce((s: number, p: any) => s + (p.margin_bruto || 0), 0)
      const margenPct = totalRev > 0 ? (totalMB / totalRev) * 100 : 0
      lines.push(`📊 Margen: ${fmtPct(margenPct)}`)
    }
  }
  lines.push('')

  // ── Zonas ──
  if (zoneData.length > 0) {
    lines.push('🏙 ZONAS')
    for (const z of zoneData) {
      const name = z.zone || z.derived_zone_name || '?'
      const rev = z.revenue || z.total_ventas || 0
      const chq = z.cheques || z.total_cheques || 0
      lines.push(`  • ${name}: ${fmtMoney(rev)} (${chq} chq)`)
    }
    lines.push('')
  }

  // ── Pagos ──
  if (paymentData.length > 0) {
    lines.push('💳 PAGOS')
    for (const p of paymentData.slice(0, 5)) {
      const method = p.payment_method || p.metodo || p.method || '?'
      const total = p.total ?? p.amount ?? 0
      const pct = p.pct || 0
      lines.push(`  • ${method}: ${fmtMoney(total)} (${fmtPct(pct)})`)
    }
    lines.push('')
  }

  // ── Quién puso la plata ──
  if (margins) {
    const allP = margins.todos || []
    if (allP.length > 0) {
      const byMargin = [...allP].sort((a: any, b: any) => (b.margin_bruto || 0) - (a.margin_bruto || 0))
      lines.push('🏆 QUIEN PUSO LA PLATA')
      const top7 = byMargin.slice(0, 7)
      top7.forEach((p: any, i: number) => {
        const mpct = p.margin_pct || 0
        const flag = mpct >= 75 ? ' 🟢' : mpct >= 50 ? ' 🟡' : ''
        lines.push(`  ${i + 1}. ${p.product_name} → ${fmtMoney(p.revenue)} (${fmtPct(mpct)} margen)${flag}`)
      })
      lines.push('')
    }
  } else if (topProducts.length > 0) {
    lines.push('🏆 TOP PRODUCTOS')
    topProducts.slice(0, 7).forEach((p: any, i: number) => {
      const name = p.product_name || p.name || '?'
      const rev = p.revenue || p.total_ventas || 0
      lines.push(`  ${i + 1}. ${name} → ${fmtMoney(rev)}`)
    })
    lines.push('')
  }

  // ── Lo que drena ──
  if (margins) {
    const allP = margins.todos || []
    const low = allP
      .filter((p: any) => (p.margin_pct || 0) < 30 && (p.revenue || 0) > 500000)
      .sort((a: any, b: any) => (a.margin_pct || 0) - (b.margin_pct || 0))

    if (low.length > 0) {
      lines.push('⚠️ LO QUE DRENA (margen <30%)')
      low.slice(0, 8).forEach((p: any) => {
        lines.push(`  • ${p.product_name} → ${fmtPct(p.margin_pct)} margen, ${fmtMoney(p.revenue)} revenue`)
      })
    } else {
      lines.push('✅ Todos con margen >30%. Buen mes.')
    }
    lines.push('')
  }

  // ── Categorías ──
  if (margins) {
    const allP = margins.todos || []
    if (allP.length > 0) {
      const cats: Record<string, { revenue: number; margin_bruto: number; count: number }> = {}
      for (const p of allP) {
        const cat = p.macro_category || '?'
        if (!cats[cat]) cats[cat] = { revenue: 0, margin_bruto: 0, count: 0 }
        cats[cat].revenue += p.revenue || 0
        cats[cat].margin_bruto += p.margin_bruto || 0
        cats[cat].count++
      }
      const sorted = Object.entries(cats).sort((a, b) => b[1].revenue - a[1].revenue)
      lines.push('📊 CATEGORIAS')
      for (const [cat, d] of sorted) {
        const pct = d.revenue > 0 ? (d.margin_bruto / d.revenue) * 100 : 0
        lines.push(`  • ${cat} → ${fmtMoney(d.revenue)} (${fmtPct(pct)} margen)`)
      }
      lines.push('')
    }
  }

  // ── LLM Analysis: Mensaje al equipo ──
  if (analysis) {
    // slide_junta_mensaje is the key field — WhatsApp-style message from Rayo
    if (analysis.slide_junta_mensaje) {
      lines.push('━━━━━━━━━━━━━━━━━━')
      lines.push('💬 MENSAJE DE RAYO')
      lines.push('━━━━━━━━━━━━━━━━━━')
      lines.push('')
      lines.push(analysis.slide_junta_mensaje)
      lines.push('')
    }

    // Insights from LLM
    if (analysis.slide_7_insights && analysis.slide_7_insights.length > 0) {
      lines.push('🔍 INSIGHTS')
      for (const ins of analysis.slide_7_insights) {
        lines.push(`  • ${ins}`)
      }
      lines.push('')
    }

    // Junta recommendations
    if (analysis.slide_8_junta && analysis.slide_8_junta.length > 0) {
      lines.push('📋 PARA LA JUNTA')
      for (const j of analysis.slide_8_junta) {
        lines.push(`  ${j}`)
      }
      lines.push('')
    }
  } else {
    // Fallback: generate from data without LLM
    lines.push('━━━━━━━━━━━━━━━━━━')
    lines.push('📋 PARA LA JUNTA')
    lines.push('━━━━━━━━━━━━━━━━━━')
    lines.push('')

    const jugadas: string[] = []

    if (margins) {
      const allP = margins.todos || []
      const cats: Record<string, { revenue: number; margin_bruto: number }> = {}
      for (const p of allP) {
        const cat = p.macro_category || '?'
        if (!cats[cat]) cats[cat] = { revenue: 0, margin_bruto: 0 }
        cats[cat].revenue += p.revenue || 0
        cats[cat].margin_bruto += p.margin_bruto || 0
      }
      const sorted = Object.entries(cats).sort((a, b) => {
        const pctA = a[1].revenue > 0 ? a[1].margin_bruto / a[1].revenue : 1
        const pctB = b[1].revenue > 0 ? b[1].margin_bruto / b[1].revenue : 1
        return pctA - pctB
      })

      if (sorted.length > 0) {
        const [worstCat, worstData] = sorted[0]
        const worstPct = worstData.revenue > 0 ? (worstData.margin_bruto / worstData.revenue) * 100 : 0
        jugadas.push(`${worstCat} tiene el margen mas bajo (${fmtPct(worstPct)}) — revisar costos y precios`)
      }

      const byMB = [...allP].sort((a: any, b: any) => (b.margin_bruto || 0) - (a.margin_bruto || 0))
      if (byMB.length > 0) {
        const top = byMB[0]
        jugadas.push(`${top.product_name} es el motor (${fmtMoney(top.revenue)}, ${fmtPct(top.margin_pct)} margen) — empujar mas`)
      }
    }

    if (zoneData.length > 1) {
      const mainZone = zoneData.reduce((a: any, b: any) =>
        (b.revenue || b.total_ventas || 0) > (a.revenue || a.total_ventas || 0) ? b : a
      )
      const mainName = mainZone.zone || mainZone.derived_zone_name || '?'
      const mainRev = mainZone.revenue || mainZone.total_ventas || 0
      const totalRev = zoneData.reduce((s: number, z: any) => s + (z.revenue || z.total_ventas || 0), 0)
      const mainPct = totalRev > 0 ? (mainRev / totalRev) * 100 : 0
      jugadas.push(`${mainName} concentra ${fmtPct(mainPct)} del revenue — activar otras zonas`)
    }

    if (jugadas.length === 0) {
      jugadas.push('Revisar datos del periodo para identificar oportunidades')
    }

    jugadas.forEach((j, i) => {
      lines.push(`${i + 1}. ${j}`)
    })
  }

  // ── Footer ──
  lines.push('')
  lines.push('— Attick & Keller ⚡')

  return lines.join('\n')
}