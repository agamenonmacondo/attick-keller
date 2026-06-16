'use client'

import { WhatsappLogo, Envelope } from '@phosphor-icons/react'
import { whatsappLink, emailLink } from '@/lib/utils/whatsapp'

interface ContactActionsProps {
  phone: string
  email: string | null
  name: string | null
}

export function ContactActions({ phone, email, name }: ContactActionsProps) {
  const waLink = whatsappLink(
    phone,
    `Hola ${name || ''}, te escribo de Attick & Keller`,
  )
  const mailLink = email
    ? emailLink(email, `Mensaje de Attick & Keller - ${name || 'Cliente'}`)
    : null

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-success)] px-3.5 py-2 text-sm font-medium text-white hover:bg-[var(--color-success)]/80 active:scale-[0.97] transition-all duration-200"
      >
        <WhatsappLogo size={16} weight="fill" />
        WhatsApp
      </a>
      {mailLink && (
        <a
          href={mailLink}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-ak-borgona)] px-3.5 py-2 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 active:scale-[0.97] transition-all duration-200"
        >
          <Envelope size={16} weight="fill" />
          Email
        </a>
      )}
    </div>
  )
}