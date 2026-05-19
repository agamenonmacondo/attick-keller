'use client'

import { useState } from 'react'
import { AnimatedCard } from '../shared/AnimatedCard'

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
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            🔥 Reactivación
          </h3>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
            {reachPct}% alcanzable
          </span>
        </div>

        <div className="mb-4">
          <div className="text-3xl font-bold text-stone-900">
            {dormantClients.toLocaleString()}
          </div>
          <div className="text-sm text-stone-500 mt-1">
            clientes con 1 sola visita
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-700">{reachableWhatsApp.toLocaleString()}</div>
            <div className="text-xs text-green-600">WhatsApp</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-700">{reachableEmail.toLocaleString()}</div>
            <div className="text-xs text-blue-600">Email</div>
          </div>
          <div className="bg-stone-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-stone-500">{notReachable.toLocaleString()}</div>
            <div className="text-xs text-stone-400">Sin contacto</div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Oportunidad:</span> Una campaña de reactivación por WhatsApp podría recuperar ~{Math.round(reachableWhatsApp * 0.05).toLocaleString()} clientes (5% de conversión estimada).
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Crear campaña de reactivación
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
    dormant: 'Hola {name}, hace tiempo no te vemos en Attick & Keller 💚 Tu última visita fue el {last_visit}. Te esperamos de vuelta con un 10% de descuento. Reserva: https://attick-keller.com/reservar',
    occasional: 'Hola {name}, gracias por visitarnos {visits} veces 💚 Cada visita suma. Ven por la {visits_plus_1} y te regalamos un postre. Reserva: https://attick-keller.com/reservar',
    vip_inactive: 'Hola {name}, te extrañamos en Attick & Keller 💚 Como cliente VIP, tu mesa preferida te espera. ¿Te animas a volver esta semana? Reserva: https://attick-keller.com/reservar',
    all: 'Hola {name}, te esperamos en Attick & Keller 💚 Reserva tu mesa: https://attick-keller.com/reservar',
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-900">Crear Campaña</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Segmento</label>
            <select value={selectedSegment} onChange={e => setSelectedSegment(e.target.value as any)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm">
              <option value="dormant">Dormidos (1 sola visita) — {audience.toLocaleString()}</option>
              <option value="occasional">Ocasionales (2-5 visitas)</option>
              <option value="vip_inactive">VIP inactivos (30+ días)</option>
              <option value="all">Todos los clientes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Canal</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedChannel('whatsapp')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${selectedChannel === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-stone-100 text-stone-700'}`}
              >
                💬 WhatsApp
              </button>
              <button
                onClick={() => setSelectedChannel('email')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${selectedChannel === 'email' ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-700'}`}
              >
                📧 Email
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Mensaje
              <span className="text-xs text-stone-400 ml-1">Variables: {'{name}'}, {'{last_visit}'}, {'{visits}'}</span>
            </label>
            <textarea
              value={message || defaultTemplates[selectedSegment]}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Escribe tu mensaje..."
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-borgona-600 hover:bg-borgona-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Generando...' : 'Generar mensaje'}
          </button>

          {generatedMessage && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
              <p className="text-sm text-stone-800 whitespace-pre-wrap">{generatedMessage}</p>
              <button
                onClick={handleCopy}
                className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                {copied ? '✅ Copiado' : '📋 Copiar mensaje'}
              </button>
              <p className="text-xs text-stone-400 mt-2">
                v1: Copia y envíalo manualmente por WhatsApp Business.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}