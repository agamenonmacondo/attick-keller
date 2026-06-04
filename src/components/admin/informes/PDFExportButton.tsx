'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Lightning } from '@phosphor-icons/react'

interface PDFExportButtonProps {
  data: any
  from: string
  to: string
  analysis: string | null
}

// Lazy load PDF para evitar problemas SSR en Vercel serverless
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink) as any,
  { ssr: false }
) as any

const InformeRayoPDFDocument = dynamic(
  () => import('./InformeRayoPDFDocument').then(mod => mod.InformeRayoPDFDocument) as any,
  { ssr: false }
) as any

export function PDFExportButton({ data, from, to, analysis }: PDFExportButtonProps) {
  const [ready, setReady] = useState(false)

  // Pre-load the PDF modules
  const handlePrepare = async () => {
    setReady(true)
  }

  if (!ready) {
    return (
      <button
        onClick={handlePrepare}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
          bg-[var(--color-ak-borgona)] text-white hover:bg-[var(--color-ak-borgona)]/90
          shadow-sm hover:shadow-md"
      >
        <Lightning size={16} weight="fill" />
        Descargar PDF
      </button>
    )
  }

  return (
    <div className="inline-block">
      <PDFDownloadLink
        document={<InformeRayoPDFDocument data={data} from={from} to={to} analysis={analysis} />}
        fileName={`Informe-Rayo-${from}-${to}.pdf`}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
          bg-[var(--color-ak-borgona)] text-white hover:bg-[var(--color-ak-borgona)]/90
          shadow-sm hover:shadow-md"
      >
        {({ loading }: { loading: boolean }) =>
          loading ? 'Generando PDF...' : (
            <>
              <Lightning size={16} weight="fill" />
              Descargar PDF
            </>
          )
        }
      </PDFDownloadLink>
    </div>
  )
}