'use client'

import { AnimatedCard } from '../shared/AnimatedCard'

interface ContactQualityProps {
  withPhone: number
  withEmail: number
  withBoth: number
  withNeither: number
  total: number
  marketingOptIn: number
}

export function ContactQualityCard({ withPhone, withEmail, withBoth, withNeither, total, marketingOptIn }: ContactQualityProps) {
  const phonePct = total > 0 ? ((withPhone / total) * 100).toFixed(0) : '0'
  const emailPct = total > 0 ? ((withEmail / total) * 100).toFixed(0) : '0'
  const optInPct = total > 0 ? ((marketingOptIn / total) * 100).toFixed(0) : '0'

  return (
    <AnimatedCard delay={0.36} className="bg-white rounded-xl border border-[#D7CCC8] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#3E2723] tracking-wide uppercase">Contactabilidad</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] font-medium">
          {optInPct}% opt-in
        </span>
      </div>

      <div className="space-y-3">
        {/* Phone */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#5D4037]">📱 Celular</span>
            <span className="font-medium text-[#3E2723]">{withPhone.toLocaleString()} ({phonePct}%)</span>
          </div>
          <div className="h-3 bg-[#F5EDE0] rounded-full overflow-hidden">
            <div className="h-full bg-[#5C7A4D] rounded-full transition-all duration-700" style={{ width: `${phonePct}%` }} />
          </div>
        </div>

        {/* Email */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#5D4037]">✉️ Email</span>
            <span className="font-medium text-[#3E2723]">{withEmail.toLocaleString()} ({emailPct}%)</span>
          </div>
          <div className="h-3 bg-[#F5EDE0] rounded-full overflow-hidden">
            <div className="h-full bg-[#D4922A] rounded-full transition-all duration-700" style={{ width: `${emailPct}%` }} />
          </div>
        </div>

        {/* Both */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#5D4037]">📱✉️ Ambos</span>
            <span className="font-medium text-[#3E2723]">{withBoth.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-[#F5EDE0] rounded-full overflow-hidden">
            <div className="h-full bg-[#6B2737] rounded-full transition-all duration-700" style={{ width: `${total > 0 ? ((withBoth / total) * 100) : 0}%` }} />
          </div>
        </div>

        {/* No contact */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#5D4037]">❌ Sin contacto</span>
            <span className="font-medium text-[#C62828]">{withNeither.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-[#F5EDE0] rounded-full overflow-hidden">
            <div className="h-full bg-[#C62828] rounded-full transition-all duration-700 opacity-50" style={{ width: `${total > 0 ? Math.max(((withNeither / total) * 100), 1) : 0}%` }} />
          </div>
        </div>

        {/* Marketing opt-in */}
        <div className="mt-2 pt-2 border-t border-[#D7CCC8]">
          <div className="flex justify-between text-xs">
            <span className="text-[#5D4037]">🎯 Opt-in Marketing</span>
            <span className="font-semibold text-[#2E7D32]">{marketingOptIn.toLocaleString()} ({optInPct}%)</span>
          </div>
        </div>
      </div>
    </AnimatedCard>
  )
}