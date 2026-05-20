'use client'

import { useState } from 'react'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Flame, ChatCircle, EnvelopeSimple, Warning, ArrowsClockwise, Copy, X } from '@phosphor-icons/react'

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
          <h3 className="text-sm font-semibold text-[#3E2723] uppercase tracking-wider flex items-center gap-2">
            <Flame size={16} weight="duotone" color="#A0522D" />
            Reactivacion
          </h3>
          <span className="text-xs bg-[#D4922A]/15 text-[#D4922A] px-2 py-1 rounded-full font-medium">
            {reachPct}% alcanzable
          </span>
        </div>

        <div className="mb-4">
          <div className="text-3xl font-bold text-[#3E2723] font-['Playfair_Display']">
            {dormantClients.toLocaleString()}
          </div>
          <div className="text-sm text-[#8D6E63] mt-1">
            clientes con 1 sola visita
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#5C7A4D]/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#5C7A4D]">{reachableWhatsApp.toLocaleString()}</div>
            <div className="text-xs text-[#5C7A4D] flex items-center justify-center gap-1">
              <ChatCircle size={12} /> WhatsApp
            </div>
          </div>
          <div className="bg-[#6B2737]/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#6B2737]">{reachableEmail.toLocaleString()}</div>
            <div className="text-xs text-[#6B2737] flex items-center justify-center gap-1">
              <EnvelopeSimple size={12} /> Email
            </div>
          </div>
          <div className="bg-[#3E2723]/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#8D6E63]">{notReachable.toLocaleString()}</div>
            <div className="text-xs text-[#8D6E63]">Sin contacto</div>
          </div>
        </div>

        <div className="bg-[#D4922A]/15 border border-[#D4922A]/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-[#3E2723]">
            <span className="font-semibold">Oportunidad:</span> Una campana de reactivacion por WhatsApp podria recuperar ~{Math.round(reachableWhatsApp * 0.05).toLocaleString()} clientes (5% de conversion estimada).
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-[#5C7A4D] hover:bg-[#4A6340] text-[#F5EDE0] font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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
    <div className="fixed inset-0 bg-[#3E2723]/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#F5EDE0] rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto border border-[#D7CCC8]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#3E2723] font-['Playfair_Display']">Crear Campana</h2>
          <button onClick={onClose} className="text-[#8D6E63] hover:text-[#3E2723]">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">Segmento</label>
            <select value={selectedSegment} onChange={e => setSelectedSegment(e.target.value as any)} className="w-full border border-[#D7CCC8] bg-white rounded-lg px-3 py-2 text-sm text-[#3E2723]">
              <option value="dormant">Dormidos (1 sola visita) — {audience.toLocaleString()}</option>
              <option value="occasional">Ocasionales (2-5 visitas)</option>
              <option value="vip_inactive">VIP inactivos (30+ dias)</option>
              <option value="all">Todos los clientes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">Canal</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedChannel('whatsapp')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${selectedChannel === 'whatsapp' ? 'bg-[#5C7A4D] text-[#F5EDE0]' : 'bg-white text-[#3E2723] border border-[#D7CCC8]'}`}
              >
                <ChatCircle size={14} /> WhatsApp
              </button>
              <button
                onClick={() => setSelectedChannel('email')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${selectedChannel === 'email' ? 'bg-[#6B2737] text-[#F5EDE0]' : 'bg-white text-[#3E2723] border border-[#D7CCC8]'}`}
              >
                <EnvelopeSimple size={14} /> Email
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3E2723] mb-1">
              Mensaje
              <span className="text-xs text-[#8D6E63] ml-1">Variables: {'{name}'}, {'{last_visit}'}, {'{visits}'}</span>
            </label>
            <textarea
              value={message || defaultTemplates[selectedSegment]}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full border border-[#D7CCC8] bg-white rounded-lg px-3 py-2 text-sm text-[#3E2723]"
              placeholder="Escribe tu mensaje..."
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-[#6B2737] hover:bg-[#5A1F2E] text-[#F5EDE0] font-semibold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generando...' : 'Generar mensaje'}
          </button>

          {generatedMessage && (
            <div className="bg-white border border-[#D7CCC8] rounded-lg p-3">
              <p className="text-sm text-[#3E2723] whitespace-pre-wrap">{generatedMessage}</p>
              <button
                onClick={handleCopy}
                className="mt-2 text-sm text-[#5C7A4D] hover:text-[#4A6340] font-medium flex items-center gap-1"
              >
                <Copy size={14} /> {copied ? 'Copiado' : 'Copiar mensaje'}
              </button>
              <p className="text-xs text-[#8D6E63] mt-2">
                v1: Copia y envialo manualmente por WhatsApp Business.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
