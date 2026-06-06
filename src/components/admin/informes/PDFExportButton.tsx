'use client'

import { useState, useCallback } from 'react'
import { Lightning } from '@phosphor-icons/react'
import { generatePDF } from '@/lib/informes-rayo/pdf-chartjs'
import type { AllData, KPIData, ZoneData, PaymentData, MarginKPIs, CategorySummary, ProductMargin, LLMAnalysis, DailyData } from '@/lib/informes-rayo/pdf-chartjs'

interface PDFExportButtonProps {
  data: any
  from: string
  to: string
  analysis: string | null
  productHourly?: any[]
}

function mapToAllData(data: any, marginsData: any, from: string, to: string, analysis: string | null): AllData {
  // Mapeo de KPIs
  const kpis: KPIData = {
    total_ventas: Number(data?.kpis?.total_ventas || 0),
    total_cheques: Number(data?.kpis?.total_cheques || 0),
    ticket_promedio: Number(data?.kpis?.ticket_promedio || 0),
    propina_total: Number(data?.kpis?.propina_total || 0),
    personas: Number(data?.kpis?.personas || 0),
    propina_promedio: Number(data?.kpis?.propina_promedio || 0),
    avg_service_time: Number(data?.kpis?.avg_service_time || 0),
    card_paid: Number(data?.kpis?.card_paid || 0),
    cash_paid: Number(data?.kpis?.cash_paid || 0),
  }

  // Mapeo de zonas
  const zones: ZoneData[] = (data?.zones || []).map((z: any) => ({
    zone: z.zone || 'Desconocido',
    total_ventas: Number(z.total_ventas || 0),
    total_cheques: Number(z.total_cheques || 0),
    propina: Number(z.propina || 0),
    avg_service_time: Number(z.avg_service_time || 0),
    personas: Number(z.personas || 0),
    ticket_promedio: Number(z.ticket_promedio || 0),
  }))

  // Mapeo de pagos
  const payments: PaymentData[] = (data?.payments || []).map((p: any) => ({
    payment_method: p.payment_method || 'Otro',
    total: Number(p.total || 0),
    cheques: Number(p.cheques || 0),
    pct: Number(p.pct || 0),
  }))

  // Mapeo de top products
  const topProducts = (data?.topProducts || []).map((p: any) => ({
    product_name: p.product_name || 'Sin nombre',
    category_name: p.category_name || 'Sin categoría',
    quantity: Number(p.quantity || 0),
    revenue: Number(p.revenue || 0),
  }))

  // Mapeo de rentabilidad
  const marginKPIs: MarginKPIs = {
    total_revenue: Number(marginsData?.kpis?.total_revenue || 0),
    margin_bruto: Number(marginsData?.kpis?.margin_bruto || 0),
    margin_pct: Number(marginsData?.kpis?.margin_pct || 0),
    total_productos: Number(marginsData?.kpis?.total_productos || 0),
  }

  const categories: CategorySummary[] = (marginsData?.resumen_ejecutivo?.categorias || []).map((c: any) => ({
    categoria: c.categoria || 'Otra',
    revenue: Number(c.revenue || 0),
    margin_pct: Number(c.margin_pct || 0),
    importan: Number(c.importan || 0),
    drenan: Number(c.drenan || 0),
    count: Number(c.count || 0),
  }))

  const importan: ProductMargin[] = (marginsData?.importan || []).map((p: any) => ({
    product_name: p.product_name || 'Sin nombre',
    macro_category: p.macro_category || 'Otra',
    revenue: Number(p.revenue || 0),
    cost_total: Number(p.cost_total || 0),
    margin_bruto: Number(p.margin_bruto || 0),
    margin_pct: Number(p.margin_pct || 0),
    quantity_sold: Number(p.quantity_sold || 0),
  }))

  const drenan: ProductMargin[] = (marginsData?.drenan || []).map((p: any) => ({
    product_name: p.product_name || 'Sin nombre',
    macro_category: p.macro_category || 'Otra',
    revenue: Number(p.revenue || 0),
    cost_total: Number(p.cost_total || 0),
    margin_bruto: Number(p.margin_bruto || 0),
    margin_pct: Number(p.margin_pct || 0),
    quantity_sold: Number(p.quantity_sold || 0),
    diagnostico: p.diagnostico,
  }))

  const llmAnalysis: LLMAnalysis = {
    analysis: analysis || '',
    source: analysis ? 'llm' : 'rules',
  }

  const daily: DailyData[] = (data?.daily || []).map((d: any) => ({
    date: d.date || '',
    revenue: Number(d.revenue || 0),
  }))

  return {
    kpis,
    zones,
    payments,
    topProducts,
    marginKPIs,
    categories,
    importan,
    drenan,
    llmAnalysis,
    from,
    to,
    daily,
    comparison: data?.comparison || null,
  }
}

export function PDFExportButton({ data, from, to, analysis }: PDFExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch margins data
      const marginsRes = await fetch(`/api/admin/informes-rayo/margins?from=${from}&to=${to}`)
      const marginsData = marginsRes.ok ? await marginsRes.json() : null

      // Mapear datos al formato AllData
      const allData = mapToAllData(data, marginsData, from, to, analysis)

      // Generar PDF con el nuevo sistema vectorial
      const blob = await generatePDF(allData)

      // Descargar
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Informe-Rayo-${from}-${to}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('[PDF] Error:', err)
      setError(err.message || 'Error generando PDF')
    } finally {
      setLoading(false)
    }
  }, [data, from, to, analysis])

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
          bg-[var(--color-ak-borgona)] text-white
          shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Lightning size={16} weight="fill" />
        {loading ? 'Generando PDF...' : 'Descargar PDF'}
      </button>
      {error && <span className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  )
}
