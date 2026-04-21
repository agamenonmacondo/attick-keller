'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, WhatsappLogo, Envelope, PencilSimple, FloppyDisk, ArrowLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatTime } from '@/lib/utils/formatDate'
import { whatsappLink, emailLink } from '@/lib/utils/whatsapp'
import { SERVICE_HOURS } from '@/lib/utils/serviceHours'
import { StatusBadge } from '../shared/StatusBadge'
import { SectionHeading } from '../shared/SectionHeading'

interface Zone {
  id: string
  name: string
}

interface ReservationDetailItem {
  id: string
  date: string
  time_start: string
  time_end: string
  party_size: number
  status: string
  source: string
  special_requests: string | null
  customers: {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
  } | null
  zone_name: string | null
  table_id?: string | null
  [key: string]: unknown
}

interface ReservationDetailProps {
  reservation: ReservationDetailItem | null
  onStatusChange: (id: string, status: string) => void
  onEdit: (id: string, updates: Record<string, unknown>) => void
  onClose: () => void
}

const ACTION_MAP: Record<
  string,
  Array<{ status: string; label: string; variant: 'primary' | 'danger' | 'warning' }>
> = {
  pending: [
    { status: 'confirmed', label: 'Confirmar', variant: 'primary' },
    { status: 'no_show', label: 'No asistio', variant: 'warning' },
    { status: 'cancelled', label: 'Cancelar', variant: 'danger' },
  ],
  pre_paid: [
    { status: 'confirmed', label: 'Confirmar', variant: 'primary' },
    { status: 'no_show', label: 'No asistio', variant: 'warning' },
  ],
  confirmed: [
    { status: 'seated', label: 'Sentar', variant: 'primary' },
    { status: 'no_show', label: 'No asistio', variant: 'warning' },
  ],
  seated: [
    { status: 'completed', label: 'Completar', variant: 'primary' },
  ],
}

export function ReservationDetail({
  reservation,
  onStatusChange,
  onEdit,
  onClose,
}: ReservationDetailProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [zones, setZones] = useState<Zone[]>([])
  const [form, setForm] = useState({
    date: '',
    time_start: '',
    time_end: '',
    party_size: 1,
    zone_id: '',
    special_requests: '',
  })

  // Load zones on mount
  useEffect(() => {
    fetch('/api/admin/zones')
      .then(r => r.json())
      .then(d => setZones(d.zones || []))
      .catch(() => {})
  }, [])

  // Sync form when reservation changes
  useEffect(() => {
    if (reservation) {
      setForm({
        date: reservation.date,
        time_start: reservation.time_start,
        time_end: reservation.time_end,
        party_size: reservation.party_size,
        zone_id: '',
        special_requests: reservation.special_requests || '',
      })
      setEditing(false)
    }
  }, [reservation])

  const handleSave = useCallback(async () => {
    if (!reservation) return
    setSaving(true)
    try {
      const updates: Record<string, unknown> = {}
      if (form.date !== reservation.date) updates.date = form.date
      if (form.time_start !== reservation.time_start) updates.time_start = form.time_start
      if (form.time_end !== reservation.time_end) updates.time_end = form.time_end
      if (form.party_size !== reservation.party_size) updates.party_size = form.party_size
      if (form.special_requests !== (reservation.special_requests || '')) updates.special_requests = form.special_requests || null
      if (form.zone_id) updates.zone_id = form.zone_id

      if (Object.keys(updates).length === 0) {
        setEditing(false)
        setSaving(false)
        return
      }

      onEdit(reservation.id, updates)
      setEditing(false)
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false)
    }
  }, [reservation, form, onEdit])

  if (!reservation) {
    return (
      <motion.div
        key="empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="sticky top-20 flex flex-col items-center justify-center rounded-xl border border-[#D7CCC8] bg-white/30 py-16 text-center"
      >
        <div className="mb-3 text-[#BCAAA4]">
          <Envelope size={32} />
        </div>
        <p className="text-sm font-medium text-[#3E2723]">Selecciona una reserva</p>
        <p className="mt-1 text-xs text-[#8D6E63]">
          Haz clic en una reserva para ver los detalles
        </p>
      </motion.div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={reservation.id}
        initial={{ opacity: 0, transform: 'translateX(30px)' }}
        animate={{ opacity: 1, transform: 'translateX(0)' }}
        exit={{ opacity: 0, transform: 'translateX(30px)' }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="sticky top-20 overflow-hidden rounded-xl border border-[#D7CCC8] bg-white"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4">
          <div>
            <h2 className="font-['Playfair_Display'] text-base font-semibold text-[#3E2723]">
              {reservation.customers?.full_name || 'Cliente'}
            </h2>
            <StatusBadge status={reservation.status} size="md" className="mt-1" />
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D6E63] hover:bg-[#D7CCC8]/50 active:scale-[0.97]"
                style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                aria-label="Editar reserva"
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

        <div className="space-y-5 px-5 pb-5">
          {/* Customer contact */}
          <div>
            <SectionHeading>Contacto</SectionHeading>
            <div className="space-y-2">
              {reservation.customers?.phone && (
                <a
                  href={whatsappLink(
                    reservation.customers.phone,
                    `Hola ${reservation.customers?.full_name || ''}, te escribo de Attick & Keller`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#3E2723] hover:bg-[#D7CCC8]/30 active:scale-[0.97]"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  <WhatsappLogo size={16} className="text-emerald-600" weight="fill" />
                  {reservation.customers.phone}
                </a>
              )}
              {reservation.customers?.email && (
                <a
                  href={emailLink(
                    reservation.customers.email,
                    `Reserva Attick & Keller - ${formatDate(reservation.date, 'short')}`,
                  )}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#3E2723] hover:bg-[#D7CCC8]/30 active:scale-[0.97]"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  <Envelope size={16} className="text-[#6B2737]" weight="fill" />
                  {reservation.customers.email}
                </a>
              )}
              {!reservation.customers?.phone && !reservation.customers?.email && (
                <p className="text-xs text-[#8D6E63]">Sin datos de contacto</p>
              )}
            </div>
          </div>

          {/* Reservation info — view or edit mode */}
          <div>
            <SectionHeading>Reserva</SectionHeading>
            {editing ? (
              <div className="space-y-3 text-sm">
                <div>
                  <label className="mb-1 block text-xs text-[#8D6E63]">Fecha</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-[#8D6E63]">Hora inicio</label>
                    <select
                      value={form.time_start}
                      onChange={(e) => setForm(f => ({ ...f, time_start: e.target.value }))}
                      className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                    >
                      {SERVICE_HOURS.map(h => (
                        <option key={h} value={h}>{formatTime(h)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8D6E63]">Hora fin</label>
                    <select
                      value={form.time_end}
                      onChange={(e) => setForm(f => ({ ...f, time_end: e.target.value }))}
                      className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                    >
                      {SERVICE_HOURS.map(h => (
                        <option key={h} value={h}>{formatTime(h)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8D6E63]">Invitados</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.party_size}
                    onChange={(e) => setForm(f => ({ ...f, party_size: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8D6E63]">Zona</label>
                  <select
                    value={form.zone_id}
                    onChange={(e) => setForm(f => ({ ...f, zone_id: e.target.value }))}
                    className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                  >
                    <option value="">Sin cambio de zona</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8D6E63]">Peticiones especiales</label>
                  <textarea
                    value={form.special_requests}
                    onChange={(e) => setForm(f => ({ ...f, special_requests: e.target.value }))}
                    rows={2}
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
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#8D6E63]">Fecha</dt>
                  <dd className="font-medium text-[#3E2723]">
                    {formatDate(reservation.date, 'weekday')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#8D6E63]">Hora</dt>
                  <dd className="font-medium text-[#3E2723]">
                    {formatTime(reservation.time_start)} - {formatTime(reservation.time_end)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#8D6E63]">Zona</dt>
                  <dd className="font-medium text-[#3E2723]">
                    {reservation.zone_name || '\u2014'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#8D6E63]">Invitados</dt>
                  <dd className="font-medium text-[#3E2723]">
                    {reservation.party_size} personas
                  </dd>
                </div>
                {reservation.special_requests && (
                  <div className="pt-1">
                    <dt className="text-[#8D6E63]">Notas</dt>
                    <dd className="mt-0.5 rounded-lg bg-[#EFEBE9] p-2 text-xs text-[#3E2723]">
                      {reservation.special_requests}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Action buttons */}
          {!editing && ACTION_MAP[reservation.status] && (
            <div className="space-y-2 border-t border-[#D7CCC8] pt-4">
              <SectionHeading>Acciones</SectionHeading>
              {ACTION_MAP[reservation.status].map((action) => (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => onStatusChange(reservation.id, action.status)}
                  className={cn(
                    'w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white active:scale-[0.97]',
                    action.variant === 'danger'
                      ? 'bg-red-600 hover:bg-red-700'
                      : action.variant === 'warning'
                      ? 'bg-[#D4922A] hover:bg-[#D4922A]/90'
                      : 'bg-[#6B2737] hover:bg-[#6B2737]/90',
                  )}
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}