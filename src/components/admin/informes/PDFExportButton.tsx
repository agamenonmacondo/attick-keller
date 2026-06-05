'use client'

import { useState } from 'react'
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

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      // Lazy-load @react-pdf/renderer to avoid Turbopack issues
      const { pdf } = await import('@react-pdf/renderer')
      const { InformeRayoPDF } = await import('@/components/admin/informes/InformeRayoPDF')

      const blob = await pdf(InformeRayoPDF({ data, from, to, analysis, productHourly })).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Informe-Rayo-${from}-${to}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('[PDF] Error generating PDF:', err)
      setError(err.message || 'Error generando PDF')
    } finally {
      setLoading(false)
    }
  }

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
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  )
}
