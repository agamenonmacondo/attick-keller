'use client'

import { useState, useCallback } from 'react'
import { Lightning } from '@phosphor-icons/react'
import { generatePDFHtmlV6 } from '@/lib/informes-rayo/pdf-generator-v6'
import { renderHtmlToPDF } from '@/lib/informes-rayo/pdf-renderer-v6'
import type { SlideAnalysisV2 } from '@/lib/informes-rayo/analysis-pipeline-v2'

interface PDFExportButtonProps {
  data: any
  from: string
  to: string
  productHourly?: any[]
}

export function PDFExportButton({ data, from, to }: PDFExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch margins data
      const marginsRes = await fetch('/api/admin/informes-rayo/margins?from=' + from + '&to=' + to)
      const marginsData = marginsRes.ok ? await marginsRes.json() : null

      // 2. Call analyze-v2 to get SlideAnalysisV2 JSON
      let analysis: SlideAnalysisV2 | null = null
      try {
        const analyzeRes = await fetch('/api/admin/informes-rayo/analyze-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportData: {
              ...data,
              margins: marginsData,
              period: { from, to, zone: 'all', compareFrom: '', compareTo: '' },
            }
          }),
        })
        if (analyzeRes.ok) {
          const analyzeJson = await analyzeRes.json()
          if (analyzeJson.analysis) {
            analysis = analyzeJson.analysis as SlideAnalysisV2
          }
        }
      } catch (analyzeErr) {
        console.log('[PDFv5] Analyze-v2 failed, continuing without analysis:', analyzeErr)
      }

      // 3. Generate HTML with v6 template (Claude Design + Analysis LLM)
      const html = generatePDFHtmlV6({
        data,
        from,
        to,
        margins: marginsData,
        analysis,
      })

      // 4. Render HTML → PDF via html2canvas + jsPDF
      const blob = await renderHtmlToPDF(html)

      // 5. Download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'Informe-Rayo-' + from + '-' + to + '.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('[PDFv5] Error:', err)
      setError(err.message || 'Error generando PDF')
    } finally {
      setLoading(false)
    }
  }, [data, from, to])

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
