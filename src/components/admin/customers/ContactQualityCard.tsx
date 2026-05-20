'use client'

import { AnimatedCard } from '../shared/AnimatedCard'
import { DeviceMobile, EnvelopeSimple, Devices, XCircle } from '@phosphor-icons/react'

interface ContactQualityProps {
  withPhone: number
  withEmail: number
  withBoth: number
  withNeither: number
  total: number
}

export function ContactQualityCard({ withPhone, withEmail, withBoth, withNeither, total }: ContactQualityProps) {
  const phonePct = total > 0 ? ((withPhone / total) * 100).toFixed(0) : '0'
  const emailPct = total > 0 ? ((withEmail / total) * 100).toFixed(0) : '0'

  return (
    <AnimatedCard delay={0.36} className="bg-white rounded-xl border border-[#D7CCC8] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#3E2723] tracking-wide uppercase">Contactabilidad</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#5C7A4D]/15 text-[#5C7A4D] font-medium">
          {phonePct}% con celular
        </span>
      </div>

      <div className="space-y-3">
        {/* Phone */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#5D4037] flex items-center gap-1"><DeviceMobile size={14} weight="duotone" color="#5C7A4D" /> Celular</span>
            <span className="font-medium text-[#3E2723]">{withPhone.toLocaleString()} ({phonePct}%)</span>
          </div>
          <div className="h-3 bg-[#F5EDE0] rounded-full overflow-hidden">
            <div className="h-full bg-[#5C7A4D] rounded-full transition-all duration-700" style={{ width: `${phonePct}%` }} />
          </div>
        </div>

        {/* Email */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#5D4037] flex items-center gap-1"><EnvelopeSimple size={14} weight="duotone" color="#6B2737" /> Email</span>
            <span className="font-medium text-[#3E2723]">{withEmail.toLocaleString()} ({emailPct}%)</span>
          </div>
          <div className="h-3 bg-[#F5EDE0] rounded-full overflow-hidden">
            <div className="h-full bg-[#6B2737] rounded-full transition-all duration-700" style={{ width: `${emailPct}%` }} />
          </div>
        </div>

        {/* Both */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#5D4037] flex items-center gap-1"><Devices size={14} weight="duotone" color="#C9A94E" /> Ambos</span>
            <span className="font-medium text-[#3E2723]">{withBoth.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-[#F5EDE0] rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A94E] rounded-full transition-all duration-700" style={{ width: `${total > 0 ? ((withBoth / total) * 100) : 0}%` }} />
          </div>
        </div>

        {/* No contact */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#5D4037] flex items-center gap-1"><XCircle size={14} weight="duotone" color="#A0522D" /> Sin contacto</span>
            <span className="font-medium text-[#A0522D]">{withNeither.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-[#F5EDE0] rounded-full overflow-hidden">
            <div className="h-full bg-[#A0522D] rounded-full transition-all duration-700 opacity-70" style={{ width: `${total > 0 ? Math.max(((withNeither / total) * 100), 1) : 0}%` }} />
          </div>
        </div>
      </div>
    </AnimatedCard>
  )
}
