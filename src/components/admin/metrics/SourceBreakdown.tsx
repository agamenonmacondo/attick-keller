'use client'

import { SectionHeading } from '../shared/SectionHeading'

const SOURCE_COLORS: Record<string, string> = { web: 'var(--color-ak-borgona)', whatsapp: 'var(--color-ak-oliva)', phone: 'var(--color-ak-ambar)', presencial: 'var(--color-ak-ambar)', instagram: 'var(--color-ak-dorado)' }
const SOURCE_LABELS: Record<string, string> = { web: 'Web', whatsapp: 'WhatsApp', phone: 'Telefono', presencial: 'Presencial', instagram: 'Instagram' }

interface SourceBreakdownProps {
  sources: Array<{ source: string; count: number }>
}

export function SourceBreakdown({ sources }: SourceBreakdownProps) {
  const total = sources.reduce((s, x) => s + x.count, 0)

  return (
    <div>
      <SectionHeading>Fuentes de reserva (ultimos 30 dias)</SectionHeading>
      {total === 0 ? (
        <p className="text-xs text-[var(--text-secondary)] text-center py-4">Sin datos suficientes</p>
      ) : (
        <>
          <div className="flex h-6 rounded-full overflow-hidden mt-3">
            {sources.map(({ source, count }) => (
              <div key={source} className="h-full" style={{
                width: `${(count / total) * 100}%`,
                backgroundColor: SOURCE_COLORS[source] || 'var(--text-secondary)',
                transition: 'width 500ms cubic-bezier(0.23, 1, 0.32, 1)',
              }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {sources.map(({ source, count }) => (
              <div key={source} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SOURCE_COLORS[source] || 'var(--text-secondary)' }} />
                <span className="text-[11px] text-[var(--text-primary)]">{SOURCE_LABELS[source] || source}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">{count} ({Math.round((count / total) * 100)}%)</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}