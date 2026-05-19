'use client'

import { useState } from 'react'
import { AnimatedCard } from '../shared/AnimatedCard'

interface ReactivationCardProps {
  dormantClients: number
  reachableWhatsApp: number
  reachableEmail: number
  notReachable: number
}

const SEGMENT_MESSAGES = {
  dormant: {
    label: 'Dormidos (1 visita)',
    message: '¡Hola {nombre}! 👋 Hace tiempo que no te vemos en Attick & Keller. Tu mesa favorita te espera 🪑 ¿Te animas a volver esta semana? Te tenemos una sorpresa 💚',
  },
  occasional: {
    label: 'Ocasionales (2-5 visitas)',
    message: '¡Hola {nombre}! 🌿 Nos encanta verte en Attick & Keller. Ya es hora de un upgrade — ¿te esperamos esta semana? Tenemos novedades en el menú 🍷',
  },
  vip: {
    label: 'VIPs inactivos',
    message: '¡Hola {nombre}! 👑 Te extrañamos en Attick & Keller. Como uno de nuestros clientes más especiales, queremos invitarte de vuelta con un regalo exclusivo. ¿Cuándo nos visitas? ✨',
  },
}

export function ReactivationCard({ dormantClients, reachableWhatsApp, reachableEmail, notReachable }: ReactivationCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<keyof typeof SEGMENT_MESSAGES>('dormant')
  const reachPct = dormantClients > 0 ? Math.round((reachableWhatsApp / dormantClients) * 100) : 0

  return (
    <AnimatedCard delay={0.3}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#8D6E63] uppercase tracking-wider">
            🔥 Reactivación
          </h3>
          <span className="text-[10px] bg-[#D4922A]/15 text-[#D4922A] px-2 py-1 rounded-full font-semibold">
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
          <div className="bg-[#5C7A4D]/10 rounded-lg p-3 text-center border border-[#5C7A4D]/20">
            <div className="text-lg font-bold text-[#5C7A4D]">{reachableWhatsApp.toLocaleString()}</div>
            <div className="text-[10px] text-[#5C7A4D]/70 font-medium">WhatsApp</div>
          </div>
          <div className="bg-[#6B2737]/10 rounded-lg p-3 text-center border border-[#6B2737]/20">
            <div className="text-lg font-bold text-[#6B2737]">{reachableEmail.toLocaleString()}</div>
            <div className="text-[10px] text-[#6B2737]/70 font-medium">Email</div>
          </div>
          <div className="bg-[#F5EDE0] rounded-lg p-3 text-center border border-[#D7CCC8]">
            <div className="text-lg font-bold text-[#8D6E63]">{notReachable.toLocaleString()}</div>
            <div className="text-[10px] text-[#8D6E63]/70 font-medium">Sin contacto</div>
          </div>
        </div>

        <div className="bg-[#5C7A4D]/10 border border-[#5C7A4D]/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-[#3E2723]">
            <span className="font-semibold text-[#5C7A4D]">{reachableWhatsApp.toLocaleString()} dormidos</span> con WhatsApp alcanzables = oportunidad de <span className="font-bold text-[#5C7A4D]">reactivación inmediata</span>
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-[#6B2737] hover:bg-[#3E2723] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          💬 Crear campaña
        </button>
      </div>

      {/* Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#3E2723]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#F5EDE0] rounded-2xl border border-[#D7CCC8] shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#3E2723]">Campaña de Reactivación</h3>
              <button onClick={() => setShowModal(false)} className="text-[#8D6E63] hover:text-[#3E2723] text-xl font-bold">×</button>
            </div>

            <div className="flex gap-2 mb-4">
              {(Object.keys(SEGMENT_MESSAGES) as Array<keyof typeof SEGMENT_MESSAGES>).map(seg => (
                <button
                  key={seg}
                  onClick={() => setSelectedSegment(seg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedSegment === seg
                      ? 'bg-[#6B2737] text-white'
                      : 'bg-white border border-[#D7CCC8] text-[#3E2723] hover:bg-[#D7CCC8]/50'
                  }`}
                >
                  {SEGMENT_MESSAGES[seg].label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-lg border border-[#D7CCC8] p-4 mb-4">
              <label className="text-[10px] text-[#8D6E63] uppercase tracking-wider font-medium">Mensaje sugerido</label>
              <p className="text-sm text-[#3E2723] mt-2 leading-relaxed">{SEGMENT_MESSAGES[selectedSegment].message}</p>
            </div>

            <div className="bg-[#5C7A4D]/10 border border-[#5C7A4D]/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-[#5C7A4D] font-medium">
                📱 Se abrirá WhatsApp con el mensaje pre-llenado. Envío manual por ahora (v2: API automática).
              </p>
            </div>

            <div className="flex gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(SEGMENT_MESSAGES[selectedSegment].message.replace('{nombre}', ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#5C7A4D] hover:bg-[#5C7A4D]/90 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors text-center"
              >
                📱 Abrir WhatsApp
              </a>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 bg-[#F5EDE0] border border-[#D7CCC8] text-[#3E2723] text-sm font-semibold rounded-lg hover:bg-[#D7CCC8]/50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatedCard>
  )
}