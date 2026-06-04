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
  const [ready, setReady] = useState(false)
  const [PDFComponent, setPDFComponent] = useState<React.ComponentType<any> | null>(null)

  const handlePrepare = async () => {
    try {
      // Dynamically import the entire PDF module at runtime only
      const pdfModule = await import('./PDFDownloadWrapper')
      setPDFComponent(() => pdfModule.PDFDownloadWrapper)
      setReady(true)
    } catch (e) {
      console.error('Failed to load PDF module:', e)
    }
  }

  if (!ready || !PDFComponent) {
    return (
      <button
        onClick={handlePrepare}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
          bg-[var(--color-ak-borgona)] text-white hover:bg-[var(--color-ak-borgona)]/90
          shadow-sm hover:shadow-md"
      >
        <Lightning size={16} weight="fill" />
        Cargar PDF
      </button>
    )
  }

  return (
    <PDFComponent
      data={data}
      from={from}
      to={to}
      analysis={analysis}
    />
  )
}