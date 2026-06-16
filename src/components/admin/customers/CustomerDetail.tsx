'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Phone, EnvelopeSimple, Calendar, CurrencyDollar, Star, Warning, PencilSimple, FloppyDisk, ArrowLeft, Tag } from '@phosphor-icons/react'
import { useCustomerTags } from '@/lib/hooks/useCustomerTags'
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
  const { tags: allTags } = useCustomerTags()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assignedTagIds, setAssignedTagIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    full_name: customer.full_name || '',
    phone: customer.phone || '',
    email: customer.email || '',
  })

  // Load assigned tags
  useEffect(() => {
    fetch(`/api/admin/customers/${customer.id}/tags`)
      .then(r => r.json())
      .then(d => {
        if (d.tags) setAssignedTagIds(new Set(d.tags.map((t: { id: string }) => t.id)))
      })
      .catch(() => {})
  }, [customer.id])

  const assignedTags = useMemo(
    () => allTags.filter(t => assignedTagIds.has(t.id)),
    [allTags, assignedTagIds]
  )

  const unassignedTags = useMemo(
    () => allTags.filter(t => !assignedTagIds.has(t.id)),
    [allTags, assignedTagIds]
  )

  const handleAddTag = useCallback(async (tagId: string) => {
    const res = await fetch(`/api/admin/customers/${customer.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId }),
    })
    if (res.ok) {
      setAssignedTagIds(prev => new Set(prev).add(tagId))
    }
  }, [customer.id])

  const handleRemoveTag = useCallback(async (tagId: string) => {
    const res = await fetch(`/api/admin/customers/${customer.id}/tags?tag_id=${tagId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setAssignedTagIds(prev => {
        const next = new Set(prev)
        next.delete(tagId)
        return next
      })
    }
  }, [customer.id])

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
      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--border-default)]">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-1 focus:border-[var(--color-ak-borgona)] focus:outline-none"
              placeholder="Nombre completo"
            />
          ) : (
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
              {customer.full_name || 'Cliente'}
            </h2>
          )}
          <div className="flex items-center gap-2 mt-1">
            {stats && <TierBadge tier={stats.loyalty_tier} />}
            {stats?.is_recurring && (
              <span className="text-[10px] text-[var(--color-ak-oliva)] font-medium">Recurrente</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50 active:scale-[0.97] transition-all duration-200"
              aria-label="Editar cliente"
            >
              <PencilSimple size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50 active:scale-[0.97] transition-all duration-200"
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
                <label className="mb-1 block text-xs text-[var(--text-secondary)]">Telefono</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--text-secondary)]">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 active:scale-[0.97] disabled:opacity-50 transition-all duration-200"
                >
                  <FloppyDisk size={16} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] active:scale-[0.97] transition-all duration-200"
                >
                  <ArrowLeft size={16} />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <Phone size={14} className="text-[var(--text-secondary)] shrink-0" />
                    <span className="font-medium">{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <EnvelopeSimple size={14} className="text-[var(--text-secondary)] shrink-0" />
                    <span className="font-medium truncate">{customer.email}</span>
                  </div>
                )}
              </div>
              <ContactActions phone={customer.phone} email={customer.email} name={customer.full_name} />
            </div>
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
                  className="flex items-center justify-between rounded-lg border border-[var(--border-default)] px-3 py-2"
                >
                  <div className="text-sm text-[var(--text-primary)]">
                    {formatDate(String(r.date || ''), 'weekday')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)]">{String(r.party_size || '')}p</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      r.status === 'completed' ? 'bg-[var(--color-ak-oliva)]/10 text-[var(--color-ak-oliva)]' :
                      r.status === 'cancelled' ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]' :
                      r.status === 'no_show' ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]' :
                      'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
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

        {/* Tags Section - NEW */}
        <div>
          <SectionHeading>
            <span className="flex items-center gap-1.5"><Tag size={14} /> Etiquetas</span>
          </SectionHeading>
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {assignedTags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    className="hover:opacity-70"
                  >
                    <X size={10} weight="bold" />
                  </button>
                </span>
              ))}
              {assignedTags.length === 0 && (
                <p className="text-[10px] text-[var(--text-muted)]">Sin etiquetas</p>
              )}
            </div>
            {unassignedTags.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddTag(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              >
                <option value="">+ Agregar etiqueta</option>
                {unassignedTags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

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
                <span key={key} className="rounded-full bg-[var(--bg-input)] px-2.5 py-1 text-xs text-[var(--text-primary)]">
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-[var(--text-secondary)]">
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
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)]/50 p-3">
      <div className={`mb-1 ${variant === 'warning' ? 'text-[#EF5350]' : 'text-[var(--text-secondary)]'}`}>{icon}</div>
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className={`text-sm font-medium ${variant === 'warning' ? 'text-[var(--color-danger)]' : 'text-[var(--text-primary)]'}`}>{value}</p>
    </div>
  )
}