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
      // Fetch margins data in parallel with imports
      const marginsRes = await fetch(`/api/admin/informes-rayo/margins?from=${from}&to=${to}`)
      const marginsData = marginsRes.ok ? await marginsRes.json() : null

      const [html2canvasModule, jsPDFModule, pdfGenModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
        import('@/lib/informes-rayo/pdf-generator'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jsPDFModule
      const { generatePDFHtml } = pdfGenModule

      const html = generatePDFHtml({
        data: data as any,
        from,
        to,
        analysis,
        productHourly,
        margins: marginsData,
      })

      // Render HTML in hidden container — 9:16 aspect ratio (450×800px base)
      container = document.createElement('div')
      container.id = '__pdf_temp__'
      container.style.cssText =
        'position:fixed;left:0;top:0;width:450px;z-index:99999;visibility:visible;background:#000;'
      container.innerHTML = html
      document.body.appendChild(container)

      // Wait for fonts to load
      await new Promise(r => setTimeout(r, 2500))
      try { await document.fonts.ready } catch (_) {}

      // Capture each .slide
      const slides = container.querySelectorAll('.slide')
      if (slides.length === 0) throw new Error('No se encontraron slides en la plantilla')

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < slides.length; i++) {
        const slideEl = slides[i] as HTMLElement
        const canvas = await html2canvas(slideEl, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#0D0D0D',
          logging: false,
        })
        if (i > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, ph, undefined, 'FAST')
      }

      pdf.save(`Informe-Rayo-${from}-${to}.pdf`)
    } catch (err: any) {
      console.error('[PDF] Error:', err)
      setError(err.message || 'Error generando PDF')
    } finally {
      if (container && container.parentNode) container.parentNode.removeChild(container)
      setLoading(false)
    }
  }, [data, from, to, analysis, productHourly])

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
