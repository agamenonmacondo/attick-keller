'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lightning, Sparkle, TrendUp, TrendDown, Lightbulb, ClipboardText, Spinner, Warning, Package } from '@phosphor-icons/react'

interface AnalisisIAProps {
  data: any
  from: string
  to: string
  onAnalysis?: (text: string | null) => void
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  '⚡': <Lightning size={16} weight="fill" className="text-[var(--color-ak-dorado)]" />,
  '📈': <TrendUp size={16} className="text-[var(--color-success)]" />,
  '📉': <TrendDown size={16} className="text-[var(--color-danger)]" />,
  '💡': <Lightbulb size={16} className="text-[var(--color-ak-ambar)]" />,
  '📋': <ClipboardText size={16} className="text-[var(--color-ak-dorado)]" />,
  '⚠️': <Warning size={16} className="text-[var(--color-warning)]" />,
  '🏆': <Package size={16} className="text-[var(--color-ak-dorado)]" />,
  '📊': <TrendUp size={16} weight="fill" className="text-[var(--color-accent)]" />,
}

const SECTION_COLORS: Record<string, string> = {
  '⚡': 'border-[var(--color-ak-dorado)]/30 bg-[var(--color-ak-dorado)]/5',
  '📈': 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5',
  '📉': 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5',
  '💡': 'border-[var(--color-ak-ambar)]/30 bg-[var(--color-ak-ambar)]/5',
  '📋': 'border-[var(--color-ak-dorado)]/30 bg-[var(--color-ak-dorado)]/5',
  '⚠️': 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5',
  '🏆': 'border-[var(--color-ak-dorado)]/30 bg-[var(--color-ak-dorado)]/5',
  '📊': 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5',
}

function parseAnalysisSections(text: string): { icon: string; title: string; items: string[] }[] {
  const sections: { icon: string; title: string; items: string[] }[] = []
  const lines = text.split('\n')
  let currentSection: { icon: string; title: string; items: string[] } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match section headers like "⚡ **Tendencia General**" or "📈 **Aciertos**"
    const headerMatch = trimmed.match(/^([⚡📈📉💡📋])\s*\*\*(.+?)\*\*/)
    if (headerMatch) {
      if (currentSection) sections.push(currentSection)
      currentSection = { icon: headerMatch[1], title: headerMatch[2], items: [] }
      continue
    }

    // Match bullet items
    const bulletMatch = trimmed.match(/^[-•]\s+(.+)/)
    if (bulletMatch && currentSection) {
      currentSection.items.push(bulletMatch[1])
      continue
    }

    // Non-bullet text goes to current section as a single item (for tendencia general)
    if (currentSection && !bulletMatch) {
      // Clean markdown bold
      const cleaned = trimmed.replace(/\*\*/g, '')
      if (cleaned) currentSection.items.push(cleaned)
    }
  }

  if (currentSection) sections.push(currentSection)
  return sections
}

export function AnalisisIA({ data, from, to, onAnalysis }: AnalisisIAProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [source, setSource] = useState<'ai' | 'rules' | 'error' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = useCallback(async () => {
    if (!data || !data.kpis) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/informes-rayo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData: { ...data, period: { from, to, zone: 'all', compareFrom: data.comparison?.kpis ? from : '', compareTo: data.comparison?.kpis ? to : '' } } }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(err.error || `Error ${res.status}`)
      }

      const result = await res.json()
      setAnalysis(result.analysis)
      setSource(result.source)
      onAnalysis?.(result.analysis)
    } catch (err: any) {
      setError(err.message || 'Error al obtener análisis')
    } finally {
      setLoading(false)
    }
  }, [data, from, to])

  // Auto-fetch when data changes
  useEffect(() => {
    if (data?.kpis) fetchAnalysis()
  }, [data?.kpis, from, to])

  const sections = analysis ? parseAnalysisSections(analysis) : []

  return (
    <div className="space-y-3">
      {/* ── Analysis Card ── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkle size={18} weight="fill" className="text-[var(--color-ak-dorado)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Análisis IA
            </h3>
            {source && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                source === 'ai' ? 'bg-[var(--color-ak-dorado)]/10 text-[var(--color-ak-dorado)]' :
                source === 'rules' ? 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]' :
                'bg-red-500/10 text-red-400'
              }`}>
                {source === 'ai' ? 'Rayo IA' : source === 'rules' ? 'Reglas' : 'Error'}
              </span>
            )}
          </div>
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            {loading ? 'Analizando...' : 'Reintentar'}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Spinner size={24} className="animate-spin text-[var(--color-ak-borgona)]" />
              <span className="text-sm text-[var(--text-secondary)]">Rayo está analizando...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
              <Warning size={16} className="text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          {sections.map((section, i) => (
            <div key={i} className={`rounded-lg border p-3 ${SECTION_COLORS[section.icon] || 'border-[var(--border-default)] bg-[var(--bg-input)]'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                {SECTION_ICONS[section.icon] || <Sparkle size={14} className="text-[var(--color-ak-dorado)]" />}
                <span className="text-xs font-semibold text-[var(--text-primary)]">{section.title}</span>
              </div>
              <ul className="space-y-1">
                {section.items.map((item, j) => (
                  <li key={j} className="text-xs text-[var(--text-secondary)] leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-[var(--text-secondary)]/50">
                    {item.replace(/\*\*/g, '')}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {!loading && !error && !analysis && (
            <div className="text-center py-6">
              <Lightning size={32} className="mx-auto text-[var(--text-secondary)] opacity-30" />
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                Haz clic en &quot;Reintentar&quot; para generar el análisis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}