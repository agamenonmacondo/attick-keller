'use client'

import { useState, useCallback } from 'react'
import { Lightning, Copy, Check } from '@phosphor-icons/react'

interface WhatsAppExportButtonProps {
  data: any
  from: string
  to: string
  kpis?: any
  zones?: any[]
  payments?: any[]
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

export function WhatsAppExportButton({ data, from, to, kpis, zones, payments }: WhatsAppExportButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const text = generateWhatsAppText(data, from, to, kpis, zones, payments)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [data, from, to, kpis, zones, payments])

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
          bg-[var(--color-ak-borgona)] text-white
          shadow-sm hover:shadow-md active:scale-95"
      >
        {copied ? (
          <>
            <Check size={16} weight="bold" />
            Copiado
          </>
        ) : (
          <>
            <Copy size={16} weight="bold" />
            Copiar WhatsApp
          </>
        )}
      </button>
    </div>
  )
}

function generateWhatsAppText(
  data: any,
  from: string,
  to: string,
  kpis?: any,
  zones?: any[],
  payments?: any[]
): string {
  const lines: string[] = []
  const kpi = kpis || data?.kpis || {}
  const marginsData = data?.margins
  const margins = marginsData?.todos || marginsData?.importan || marginsData?.drenan ? marginsData : null
  const topProducts = data?.topProducts || []
  const zoneData = zones || data?.zones || []

  // ── Header ──
  lines.push(`⚡ INFORME RAYO — ${fmtDate(from)} a ${fmtDate(to)}`)
  lines.push('')

  // ── KPIs ──
  const revenue = kpi.total_ventas || kpi.revenue || 0
  const cheques = kpi.total_cheques || kpi.cheques || 0
  const ticket = kpi.ticket_promedio || 0
  const propina = kpi.propina_total || kpi.tip_total || 0
  const personas = kpi.personas || kpi.party_size_total || 0
  const propinaPer = kpi.propina_promedio || kpi.tip_promedio || 0

  lines.push(`💰 VENTAS: ${fmtMoney(revenue)}`)
  lines.push(`👥 Cheques: ${cheques.toLocaleString()}`)
  lines.push(`🎫 Ticket promedio: ${fmtMoney(ticket)}`)
  lines.push(`🤝 Personas: ${personas.toLocaleString()}`)
  lines.push(`💰 Propina: ${fmtMoney(propina)} (${fmtMoney(propinaPer)}/persona)`)

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
      lines.push(`• ${name} → ${fmtMoney(rev)} (${chq} chq)`)
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
        const flag = mpct >= 75 ? ' 🟢' : mpct >= 50 ? '' : ''
        lines.push(`${i + 1}. ${p.product_name} → ${fmtMoney(p.revenue)} (${fmtPct(mpct)} margen)${flag}`)
      })
      lines.push('')
    }
  } else if (topProducts.length > 0) {
    lines.push('🏆 TOP PRODUCTOS')
    topProducts.slice(0, 7).forEach((p: any, i: number) => {
      const name = p.product_name || p.name || '?'
      const rev = p.revenue || p.total_ventas || 0
      lines.push(`${i + 1}. ${name} → ${fmtMoney(rev)}`)
    })
    lines.push('')
  }

  // ── Bajo la meta ──
  if (margins) {
    const allP = margins.todos || []
    const low = allP
      .filter((p: any) => (p.margin_pct || 0) < 30 && (p.revenue || 0) > 500000)
      .sort((a: any, b: any) => (a.margin_pct || 0) - (b.margin_pct || 0))

    if (low.length > 0) {
      lines.push('⚠️ BAJO LA META (margen <30%)')
      low.slice(0, 8).forEach((p: any) => {
        lines.push(`• ${p.product_name} → ${fmtPct(p.margin_pct)} margen, ${fmtMoney(p.revenue)} revenue`)
      })
    } else {
      lines.push('✅ Todos los productos con margen >30%. Buen mes.')
    }
    lines.push('')
  }

  // ── Macrocategorías ──
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
        lines.push(`• ${cat} → ${fmtMoney(d.revenue)} (${fmtPct(pct)} margen)`)
      }
      lines.push('')
    }
  }

  // ── Para la junta ──
  lines.push('📋 PARA LA JUNTA')

  // Generate 3 actionable items from data
  const jugadas: string[] = []

  if (margins) {
    const allP = margins.todos || []
    // Find lowest margin category
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
      jugadas.push(`${worstCat} tiene el margen más bajo (${fmtPct(worstPct)}) — revisar costos y precios`)
    }

    // Find top product by margin for reinforcement
    const byMB = [...allP].sort((a: any, b: any) => (b.margin_bruto || 0) - (a.margin_bruto || 0))
    if (byMB.length > 0) {
      const top = byMB[0]
      jugadas.push(`${top.product_name} es el motor (${fmtMoney(top.revenue)}, ${fmtPct(top.margin_pct)} margen) — impulsar más`)
    }
  }

  // Zone insight
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
    jugadas.push('Revisar datos del período para identificar oportunidades')
  }

  jugadas.forEach((j, i) => {
    lines.push(`${i + 1}. ${j}`)
  })

  return lines.join('\n')
}