'use client'

import { Lightning } from '@phosphor-icons/react'

interface PDFDownloadWrapperProps {
  data: any
  from: string
  to: string
  analysis: string | null
}

// All @react-pdf/renderer imports are isolated in this file
// This file is ONLY loaded via dynamic import() at runtime
import { PDFDownloadLink } from '@react-pdf/renderer'
import { InformeRayoPDFDocument } from './InformeRayoPDFDocument'

export function PDFDownloadWrapper({ data, from, to, analysis }: PDFDownloadWrapperProps) {
  return (
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
  )
}