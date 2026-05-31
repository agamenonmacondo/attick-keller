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
    <AnimatedCard delay={0.36} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide uppercase">Contactabilidad</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] font-medium">
          {phonePct}% con celular
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-secondary)] flex items-center gap-1"><DeviceMobile size={14} weight="duotone" color="var(--color-success)" /> Celular</span>
            <span className="font-medium text-[var(--text-primary)]">{withPhone.toLocaleString()} ({phonePct}%)</span>
          </div>
          <div className="h-3 bg-[var(--bg-input)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-success)] rounded-full transition-all duration-700" style={{ width: `${phonePct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-secondary)] flex items-center gap-1"><EnvelopeSimple size={14} weight="duotone" color="var(--color-accent)" /> Email</span>
            <span className="font-medium text-[var(--text-primary)]">{withEmail.toLocaleString()} ({emailPct}%)</span>
          </div>
          <div className="h-3 bg-[var(--bg-input)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-700" style={{ width: `${emailPct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-secondary)] flex items-center gap-1"><Devices size={14} weight="duotone" color="var(--color-ak-dorado)" /> Ambos</span>
            <span className="font-medium text-[var(--text-primary)]">{withBoth.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-[var(--bg-input)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-ak-dorado)] rounded-full transition-all duration-700" style={{ width: `${total > 0 ? ((withBoth / total) * 100) : 0}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-secondary)] flex items-center gap-1"><XCircle size={14} weight="duotone" color="var(--color-ak-ladrillo)" /> Sin contacto</span>
            <span className="font-medium text-[var(--color-ak-ladrillo)]">{withNeither.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-[var(--bg-input)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-ak-ladrillo)] rounded-full transition-all duration-700 opacity-70" style={{ width: `${total > 0 ? Math.max(((withNeither / total) * 100), 1) : 0}%` }} />
          </div>
        </div>
      </div>
    </AnimatedCard>
  )
}
