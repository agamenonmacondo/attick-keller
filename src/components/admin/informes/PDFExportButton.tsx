'use client'

import { useState } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { InformesRayoPDF } from './InformeRayoPDFDocument'
import { Lightning } from '@phosphor-icons/react'

interface PDFExportButtonProps {
  data: any
  from: string
  to: string
  analysis: string | null
}

export function PDFExportButton({ data, from, to, analysis }: PDFExportButtonProps) {
  const [ready, setReady] = useState(false)

  if (!data?.kpis) return null

  const kpi = Array.isArray(data.kpis) ? data.kpis[0] : data.kpis
  const dateLabel = `${from}_al_${to}`

  return (
    <div className="flex items-center gap-3">
      <PDFDownloadLink
        document={<InformesRayoPDF data={data} from={from} to={to} analysis={analysis} />}
        fileName={`Informe_Rayo_${dateLabel}.pdf`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-ak-borgona)] text-white text-sm font-medium hover:bg-[var(--color-ak-borgona)]/90 transition-colors"
      >
        {({ loading }) => (
          <>
            <Lightning size={16} weight="fill" />
            {loading ? 'Generando PDF...' : 'Descargar PDF'}
          </>
        )}
      </PDFDownloadLink>
    </div>
  )
}