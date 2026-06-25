'use client'

import { useState } from 'react'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Flame, ChatCircle, EnvelopeSimple, ArrowsClockwise, Copy, X } from '@phosphor-icons/react'

interface ReactivationCardProps {
  dormantClients: number
  reachableWhatsApp: number
  reachableEmail: number
  notReachable: number
}

export function ReactivationCard({ dormantClients, reachableWhatsApp, reachableEmail, notReachable }: ReactivationCardProps) {
  const [showModal, setShowModal] = useState(false)
  const reachPct = dormantClients > 0 ? Math.round((reachableWhatsApp / dormantClients) * 100) : 0

  return (
    <AnimatedCard delay={0.3}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Flame size={16} weight="duotone" color="var(--color-ak-ladrillo)" />
            Reactivacion
          </h3>
          <span className="text-xs bg-[var(--color-warning)]/15 text-[var(--color-warning)] px-2 py-1 rounded-full font-medium">
            {reachPct}% alcanzable
          </span>
        </div>

        <div className="mb-4">
          <div className="text-3xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-heading)]">
            {dormantClients.toLocaleString()}
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-1">
            clientes con 1 sola visita
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[var(--color-success)]/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[var(--color-success)]">{reachableWhatsApp.toLocaleString()}</div>
            <div className="text-xs text-[var(--color-success)] flex items-center justify-center gap-1">
              <ChatCircle size={12} /> WhatsApp
            </div>
          </div>
          <div className="bg-[var(--color-accent)]/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[var(--color-accent)]">{reachableEmail.toLocaleString()}</div>
            <div className="text-xs text-[var(--color-accent)] flex items-center justify-center gap-1">
              <EnvelopeSimple size={12} /> Email
            </div>
          </div>
          <div className="bg-[var(--color-ak-madera)]/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[var(--text-secondary)]">{notReachable.toLocaleString()}</div>
            <div className="text-xs text-[var(--text-muted)]">Sin contacto</div>
          </div>
        </div>

        <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-semibold">Oportunidad:</span> Una campana de reactivacion por WhatsApp podria recuperar ~{Math.round(reachableWhatsApp * 0.05).toLocaleString()} clientes (5% de conversion estimada).
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-[var(--bg-primary)] font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ArrowsClockwise size={18} weight="bold" />
          Crear campana de reactivacion
        </button>

        {showModal && (
          <CampaignModal
            segment="dormant"
            channel="whatsapp"
            audience={reachableWhatsApp}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </AnimatedCard>
  )
}

function CampaignModal({
  segment,
  channel,
  audience,
  onClose,
}: {
  segment: 'dormant' | 'occasional' | 'vip_inactive' | 'all'
  channel: 'whatsapp' | 'email'
  audience: number
  onClose: () => void
}) {
  const [selectedSegment, setSelectedSegment] = useState(segment)
  const [selectedChannel, setSelectedChannel] = useState(channel)
  const [message, setMessage] = useState('')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const defaultTemplates: Record<string, string> = {
    dormant: 'Hola {name}, hace tiempo no te vemos en Attick & Keller. Tu ultima visita fue el {last_visit}. Te esperamos de vuelta con un 10% de descuento. Reserva: https://attick-keller.com/reservar',
    occasional: 'Hola {name}, gracias por visitarnos {visits} veces. Cada visita suma. Ven por la {visits_plus_1} y te regalamos un postre. Reserva: https://attick-keller.com/reservar',
    vip_inactive: 'Hola {name}, te extranamos en Attick & Keller. Como cliente VIP, tu mesa preferida te espera. Te animas a volver esta semana? Reserva: https://attick-keller.com/reservar',
    all: 'Hola {name}, te esperamos en Attick & Keller. Reserva tu mesa: https://attick-keller.com/reservar',
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ segment: selectedSegment, channel: selectedChannel, template: message || defaultTemplates[selectedSegment] }),
      })
      const data = await res.json()
      setGeneratedMessage(data.message)
    } catch {
      setGeneratedMessage('Error al generar el mensaje')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-[var(--color-ak-madera)]/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--bg-primary)] rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto border border-[var(--border-default)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-[family-name:var(--font-heading)]">Crear Campana</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Segmento</label>
            <select value={selectedSegment} onChange={e => setSelectedSegment(e.target.value as any)} className="w-full border border-[var(--border-default)] bg-[var(--bg-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]">
              <option value="dormant">Dormidos (1 sola visita) — {audience.toLocaleString()}</option>
              <option value="occasional">Ocasionales (2-5 visitas)</option>
              <option value="vip_inactive">VIP inactivos (30+ dias)</option>
              <option value="all">Todos los clientes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Canal</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedChannel('whatsapp')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${selectedChannel === 'whatsapp' ? 'bg-[var(--color-success)] text-[var(--bg-primary)]' : 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-default)]'}`}
              >
                <ChatCircle size={14} /> WhatsApp
              </button>
              <button
                onClick={() => setSelectedChannel('email')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${selectedChannel === 'email' ? 'bg-[var(--color-accent)] text-[var(--bg-primary)]' : 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-default)]'}`}
              >
                <EnvelopeSimple size={14} /> Email
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Mensaje
              <span className="text-xs text-[var(--text-secondary)] ml-1">Variables: {'{name}'}, {'{last_visit}'}, {'{visits}'}</span>
            </label>
            <textarea
              value={message || defaultTemplates[selectedSegment]}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full border border-[var(--border-default)] bg-[var(--bg-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
              placeholder="Escribe tu mensaje..."
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 text-[var(--bg-primary)] font-semibold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generando...' : 'Generar mensaje'}
          </button>

          {generatedMessage && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-3">
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{generatedMessage}</p>
              <button
                onClick={handleCopy}
                className="mt-2 text-sm text-[var(--color-success)] hover:text-[var(--color-success)]/80 font-medium flex items-center gap-1"
              >
                <Copy size={14} /> {copied ? 'Copiado' : 'Copiar mensaje'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
