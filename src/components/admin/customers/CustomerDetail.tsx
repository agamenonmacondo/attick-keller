'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Phone, EnvelopeSimple, Calendar, CurrencyDollar, Star, Warning, PencilSimple, FloppyDisk, ArrowLeft } from '@phosphor-icons/react'
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
  onRefresh?: () => void
}

export function CustomerDetail({ data, onClose, onRefresh }: CustomerDetailProps) {
  const { customer, stats, visits, reservations } = data
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: customer.full_name || '',
    phone: customer.phone || '',
    email: customer.email || '',
  })

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setEditing(false)
        onRefresh?.()
      } else {
        const d = await res.json()
        alert(d.error || 'Error al guardar')
      }
    } catch {
      alert('Error de conexion')
    } finally {
      setSaving(false)
    }
  }, [customer.id, form, onRefresh])

  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateX(30px)' }}
      animate={{ opacity: 1, transform: 'translateX(0)' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-xl border border-[#D7CCC8] bg-white"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-[#D7CCC8]">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full font-['Playfair_Display'] text-lg font-semibold text-[#3E2723] bg-[#EFEBE9] border border-[#D7CCC8] rounded-lg px-3 py-1 focus:border-[#6B2737] focus:outline-none"
              placeholder="Nombre completo"
            />
          ) : (
            <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#3E2723]">
              {customer.full_name || 'Cliente'}
            </h2>
          )}
          <div className="flex items-center gap-2 mt-1">
            {stats && <TierBadge tier={stats.loyalty_tier} />}
            {stats?.is_recurring && (
              <span className="text-[10px] text-[#5C7A4D] font-medium">Recurrente</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D6E63] hover:bg-[#D7CCC8]/50 active:scale-[0.97]"
              style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
              aria-label="Editar cliente"
            >
              <PencilSimple size={18} />
            </button>
          )}
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

        {/* Contact — editable in edit mode */}
        <div>
          <SectionHeading>Contacto</SectionHeading>
          {editing ? (
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs text-[#8D6E63]">Telefono</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8D6E63]">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#6B2737] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6B2737]/90 active:scale-[0.97] disabled:opacity-50"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  <FloppyDisk size={16} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-[#D7CCC8] px-4 py-2.5 text-sm font-medium text-[#3E2723] hover:bg-[#EFEBE9] active:scale-[0.97]"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  <ArrowLeft size={16} />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <ContactActions phone={customer.phone} email={customer.email} name={customer.full_name} />
          )}
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