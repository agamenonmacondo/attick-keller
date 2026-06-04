'use client'

import { Lightning } from '@phosphor-icons/react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { InformeRayoPDFDocument } from './InformeRayoPDFDocument'

interface PDFDownloadWrapperProps {
  data: any
  from: string
  to: string
  analysis: string | null
}

// This file imports @react-pdf/renderer LAZILY at runtime
// It should NEVER be imported at the top level — only via dynamic import()
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