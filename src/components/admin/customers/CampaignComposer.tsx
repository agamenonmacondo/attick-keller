'use client'

import { useState, useCallback } from 'react'
import { PaperPlaneTilt, Eye, Tag } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface Tag {
  id: string
  name: string
  color: string
}

interface CampaignComposerProps {
  selectedCount: number
  filterTagIds: string[]
  filterHasEmail: string
  filterMinVisits: number
  filterLastVisitDays: number
  tags: Tag[]
  previewCustomer: { full_name: string | null; loyalty_tier: string } | null
  onSend: (data: {
    name: string
    subject: string
    bodyHtml: string
    filterTagIds: string[]
    filterHasEmail: boolean
    filterMinVisits: number
    filterLastVisitDays: number
  }) => Promise<void>
  onClose: () => void
}

const PLACEHOLDERS = [
  { key: '{{full_name}}', label: 'Nombre del cliente' },
  { key: '{{loyalty_tier}}', label: 'Nivel de fidelidad' },
]

function replacePlaceholders(html: string, customer: { full_name: string | null; loyalty_tier: string }): string {
  return html
    .replace(/\{\{full_name\}\}/g, customer.full_name || 'Cliente')
    .replace(/\{\{loyalty_tier\}\}/g, customer.loyalty_tier === 'none' ? 'cliente' : 'cliente ' + customer.loyalty_tier)
}

export function CampaignComposer({
  selectedCount, filterTagIds, filterHasEmail, filterMinVisits, filterLastVisitDays,
  tags, previewCustomer, onSend, onClose,
}: CampaignComposerProps) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const selectedTags = tags.filter(t => filterTagIds.includes(t.id))

  const segmentDesc = [
    selectedTags.length > 0 ? 'Etiquetas: ' + selectedTags.map(t => t.name).join(', ') : null,
    filterHasEmail === 'true' ? 'Con email' : null,
    filterMinVisits > 0 ? 'Min ' + filterMinVisits + ' visitas' : null,
    filterLastVisitDays > 0 ? 'Ult visita <= ' + filterLastVisitDays + 'd' : null,
  ].filter(Boolean).join(' \u00B7 ') || 'Sin filtros'

  const handleSend = useCallback(async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) return
    setSending(true)
    try {
      await onSend({
        name: name.trim(),
        subject: subject.trim(),
        bodyHtml: body,
        filterTagIds,
        filterHasEmail: filterHasEmail === 'true',
        filterMinVisits,
        filterLastVisitDays,
      })
    } finally {
      setSending(false)
    }
  }, [name, subject, body, filterTagIds, filterHasEmail, filterMinVisits, filterLastVisitDays, onSend])

  return (
    <div className="bg-white rounded-xl border border-[#D7CCC8] overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b border-[#D7CCC8]">
        <h3 className="text-sm font-semibold text-[#3E2723] font-['Playfair_Display']">
          Nueva Campana
        </h3>
        <p className="text-xs text-[#8D6E63] mt-1">
          {selectedCount} destinatario{selectedCount !== 1 ? 's' : ''}
        </p>
        <p className="text-[10px] text-[#BCAAA4] mt-0.5">{segmentDesc}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div>
          <label className="text-[11px] font-medium text-[#8D6E63]">Nombre de campana</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Invitacion evento vinos - Abril"
            className="w-full mt-1 rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] placeholder:text-[#BCAAA4] focus:border-[#6B2737] focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[#8D6E63]">Asunto del email</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Te esperamos en Attick & Keller..."
            className="w-full mt-1 rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] placeholder:text-[#BCAAA4] focus:border-[#6B2737] focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[#8D6E63]">Mensaje</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder={'Hola {{full_name}},\n\nQueremos invitarte a...\n\nTe esperamos!'}
            className="w-full mt-1 rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] placeholder:text-[#BCAAA4] focus:border-[#6B2737] focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[#8D6E63] flex items-center gap-1">
            <Tag size={12} /> Variables disponibles
          </label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PLACEHOLDERS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setBody(prev => prev + ' ' + p.key)}
                className="rounded-full bg-[#EFEBE9] px-2.5 py-1 text-[10px] text-[#6B2737] font-mono hover:bg-[#D7CCC8]/50 transition-colors"
                title={p.label}
              >
                {p.key}
              </button>
            ))}
          </div>
        </div>

        {previewCustomer && (
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-xs text-[#6B2737] font-medium hover:underline"
          >
            <Eye size={14} />
            {showPreview ? 'Ocultar preview' : 'Ver preview'}
          </button>
        )}

        {showPreview && body && previewCustomer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="rounded-lg border border-[#D7CCC8] overflow-hidden"
          >
            <div className="px-3 py-2 bg-[#EFEBE9] border-b border-[#D7CCC8]">
              <span className="text-[10px] font-medium text-[#8D6E63]">
                PREVIEW — {previewCustomer.full_name || 'Cliente'}
              </span>
            </div>
            <div
              className="p-4 text-sm text-[#3E2723] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: replacePlaceholders(body, previewCustomer).replace(/\n/g, '<br/>') }}
            />
          </motion.div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-[#D7CCC8] flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-[#D7CCC8] py-2 text-xs font-medium text-[#8D6E63] hover:bg-[#EFEBE9] active:scale-[0.97] transition-transform"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !name.trim() || !subject.trim() || !body.trim()}
          className="flex-1 rounded-lg bg-[#6B2737] py-2 text-xs font-medium text-white hover:bg-[#6B2737]/90 active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
        >
          {sending ? (
            'Enviando...'
          ) : (
            <><PaperPlaneTilt size={12} /> Enviar campana</>
          )}
        </button>
      </div>
    </div>
  )
}
