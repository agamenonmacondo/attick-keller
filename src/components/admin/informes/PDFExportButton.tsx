'use client'

import { useState } from 'react'
import { Lightning } from '@phosphor-icons/react'

interface PDFExportButtonProps {
  data: any
  from: string
  to: string
  analysis: string | null
}

export function PDFExportButton({ data, from, to, analysis }: PDFExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [PDFDownloadLink, setPDFDownloadLink] = useState<any>(null)

  if (!data?.kpis) return null

  const loadPDF = async () => {
    if (ready && pdfDoc && PDFDownloadLink) return
    setLoading(true)
    try {
      const [rendererModule, docModule] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./InformeRayoPDFDocument')
      ])
      setPDFDownloadLink(() => rendererModule.PDFDownloadLink)
      setPdfDoc(() => docModule.InformesRayoPDF)
      setReady(true)
    } catch (err) {
      console.error('Error loading PDF module:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <button
        onClick={loadPDF}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-ak-borgona)] text-white text-sm font-medium hover:bg-[var(--color-ak-borgona)]/90 transition-colors"
      >
        <Lightning size={16} weight="fill" />
        Cargar PDF
      </button>
    )
  }

  const DocComponent = pdfDoc

  return (
    <div className="flex items-center gap-3">
      <PDFDownloadLink
        document={<DocComponent data={data} from={from} to={to} analysis={analysis} />}
        fileName={`Informe_Rayo_${from}_al_${to}.pdf`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-ak-borgona)] text-white text-sm font-medium hover:bg-[var(--color-ak-borgona)]/90 transition-colors"
      >
        {({ loading }: { loading: boolean }) => (
          <>
            <Lightning size={16} weight="fill" />
            {loading ? 'Generando PDF...' : 'Descargar PDF'}
          </>
        )}
      </PDFDownloadLink>
    </div>
  )
}