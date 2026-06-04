'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Lightning } from '@phosphor-icons/react'

// Lazy load PDF para evitar problemas SSR en Vercel serverless
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <span>Cargando...</span> }
)

const InformesRayoPDF = dynamic(
  () => import('./InformeRayoPDFDocument').then(mod => mod.InformesRayoPDF),
  { ssr: false }
)

interface PDFExportButtonProps {
  data: any
  from: string
  to: string
  analysis: string | null
}

export function PDFExportButton({ data, from, to, analysis }: PDFExportButtonProps) {
  if (!data?.kpis) return null

  return (
    <div className="flex items-center gap-3">
      <PDFDownloadLink
        document={<InformesRayoPDF data={data} from={from} to={to} analysis={analysis} />}
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