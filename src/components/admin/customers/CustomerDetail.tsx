'use client'

import { motion } from 'framer-motion'
import { X, Phone, EnvelopeSimple, Calendar, CurrencyDollar, Star, Warning } from '@phosphor-icons/react'
import { whatsappLink, emailLink } from '@/lib/utils/whatsapp'
import { formatCOP } from '@/lib/utils/formatCOP'
import { formatDate } from '@/lib/utils/formatDate'
import { TierBadge } from '../shared/TierBadge'
import { SectionHeading } from '../shared/SectionHeading'
import { ContactActions } from './ContactActions'
import { VisitHistory } from './VisitHistory'
import { CustomerNotes } from './CustomerNotes'

interface CustomerDetailProps {
  data: {
    customer: {
      id: string
      phone: string
      email: string | null
      full_name: string | null
      preferences: Record<string, unknown> | null
      notes: string | null
      created_at: string
    }
    stats: {
      total_visits: number
      total_spent: number
      last_visit_date: string | null
      no_show_count: number
      is_recurring: boolean
      loyalty_tier: string
    } | null
    visits: Array<Record<string, unknown>>
    reservations: Array<Record<string, unknown>>
  }
  onClose: () => void
}

export function CustomerDetail({ data, onClose }: CustomerDetailProps) {
  const { customer, stats, visits, reservations } = data

  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateX(30px)' }}
      animate={{ opacity: 1, transform: 'translateX(0)' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-xl border border-[#D7CCC8] bg-white"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-[#D7CCC8]">
        <div>
          <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#3E2723]">
            {customer.full_name || 'Cliente'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            {stats && <TierBadge tier={stats.loyalty_tier} />}
            {stats?.is_recurring && (
              <span className="text-[10px] text-[#5C7A4D] font-medium">Recurrente</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D6E63] hover:bg-[#D7CCC8]/50 active:scale-[0.97]"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
          aria-label="Cerrar detalle"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-5 px-5 py-5">
        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Calendar size={16} />} label="Visitas" value={String(stats.total_visits)} />
            <StatCard icon={<CurrencyDollar size={16} />} label="Total gastado" value={formatCOP(stats.total_spent)} />
            <StatCard icon={<Star size={16} />} label="Ultima visita" value={stats.last_visit_date ? formatDate(stats.last_visit_date, 'short') : '\u2014'} />
            <StatCard
              icon={<Warning size={16} />}
              label="No-shows"
              value={String(stats.no_show_count)}
              variant={stats.no_show_count > 0 ? 'warning' : 'default'}
            />
          </div>
        )}

        {/* Contact */}
        <div>
          <SectionHeading>Contacto</SectionHeading>
          <ContactActions phone={customer.phone} email={customer.email} name={customer.full_name} />
        </div>

        {/* Recent reservations */}
        {reservations && reservations.length > 0 && (
          <div>
            <SectionHeading>Reservas recientes</SectionHeading>
            <div className="space-y-2 mt-2">
              {reservations.slice(0, 5).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-[#D7CCC8] px-3 py-2"
                >
                  <div className="text-sm text-[#3E2723]">
                    {formatDate(String(r.date || ''), 'weekday')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8D6E63]">{String(r.party_size || '')}p</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      r.status === 'completed' ? 'bg-[#5C7A4D]/10 text-[#5C7A4D]' :
                      r.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                      r.status === 'no_show' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {String(r.status || '')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visit history */}
        {visits && visits.length > 0 && (
          <div>
            <SectionHeading>Historial de visitas</SectionHeading>
            <VisitHistory visits={visits} />
          </div>
        )}

        {/* Customer notes */}
        <div>
          <SectionHeading>Notas</SectionHeading>
          <CustomerNotes customerId={customer.id} initialNotes={customer.notes} />
        </div>

        {/* Preferences */}
        {customer.preferences && Object.keys(customer.preferences).length > 0 && (
          <div>
            <SectionHeading>Preferencias</SectionHeading>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(customer.preferences).map(([key, value]) => (
                <span key={key} className="rounded-full bg-[#EFEBE9] px-2.5 py-1 text-xs text-[#3E2723]">
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-[#8D6E63]">
          Cliente desde {formatDate(customer.created_at, 'short')}
        </p>
      </div>
    </motion.div>
  )
}

function StatCard({
  icon,
  label,
  value,
  variant = 'default',
}: {
  icon: React.ReactNode
  label: string
  value: string
  variant?: 'default' | 'warning'
}) {
  return (
    <div className="rounded-lg border border-[#D7CCC8] bg-[#EFEBE9]/50 p-3">
      <div className={`mb-1 ${variant === 'warning' ? 'text-red-500' : 'text-[#8D6E63]'}`}>{icon}</div>
      <p className="text-xs text-[#8D6E63]">{label}</p>
      <p className={`text-sm font-medium ${variant === 'warning' ? 'text-red-600' : 'text-[#3E2723]'}`}>{value}</p>
    </div>
  )
}