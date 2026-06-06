'use client'

import { useState, useCallback } from 'react'
import { Lightning } from '@phosphor-icons/react'

interface PDFExportButtonProps {
  data: any
  from: string
  to: string
  analysis: string | null
  productHourly?: any[]
}

export function PDFExportButton({ data, from, to, analysis, productHourly }: PDFExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = useCallback(async () => {
    setLoading(true)
    setError(null)

    let container: HTMLDivElement | null = null
    try {
      const [html2canvasModule, jsPDFModule, pdfGenModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
        import('@/lib/informes-rayo/pdf-generator'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jsPDFModule
      const { generatePDFHtml } = pdfGenModule

      const html = generatePDFHtml({ data: data as any, from, to, analysis, productHourly })

      // Render HTML in hidden container
      container = document.createElement('div')
      container.id = '__pdf_temp__'
      container.style.cssText =
        'position:fixed;left:0;top:0;width:794px;z-index:99999;visibility:visible;background:#0A0A0A;'
      container.innerHTML = html
      document.body.appendChild(container)

      // Wait for fonts to load
      await new Promise(r => setTimeout(r, 2000))
      try { await document.fonts.ready } catch (_) {}

      // Capture each .page
      const pages = container.querySelectorAll('.page')
      if (pages.length === 0) throw new Error('No se encontraron páginas en la plantilla')

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement
        const canvas = await html2canvas(pageEl, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#0A0A0A',
          logging: false,
        })
        if (i > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, ph)
      }

      pdf.save(`Informe-Rayo-${from}-${to}.pdf`)
    } catch (err: any) {
      console.error('[PDF] Error:', err)
      setError(err.message || 'Error generando PDF')
    } finally {
      if (container) document.body.removeChild(container)
      setLoading(false)
    }
  }, [data, from, to, analysis, productHourly])

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
          bg-[var(--color-ak-borgona)] text-white hover:bg-[var(--color-ak-borgona)]/90
          shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Lightning size={16} weight="fill" />
        {loading ? 'Generando PDF...' : 'Descargar PDF'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
