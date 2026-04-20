'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Spinner, Plus, MagnifyingGlass } from '@phosphor-icons/react'
import { formatDate, formatTime } from '@/lib/utils/formatDate'
import { SERVICE_HOURS } from '@/lib/utils/serviceHours'

interface Zone {
  id: string
  name: string
}

interface CustomerOption {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
}

interface ReservationFormProps {
  selectedDate: string
  onClose: () => void
  onCreated: () => void
}

export function ReservationForm({ selectedDate, onClose, onCreated }: ReservationFormProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Customer selection
  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([])
  const [searching, setSearching] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  // Reservation fields
  const [date, setDate] = useState(selectedDate)
  const [timeStart, setTimeStart] = useState('19:00')
  const [timeEnd, setTimeEnd] = useState('21:00')
  const [partySize, setPartySize] = useState(2)
  const [zoneId, setZoneId] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [source, setSource] = useState('phone')

  useEffect(() => {
    fetch('/api/admin/zones')
      .then(r => r.json())
      .then(d => setZones(d.zones || []))
      .catch(() => {})
  }, [])

  const searchCustomers = useCallback(async () => {
    if (!customerSearch.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(customerSearch.trim())}`)
      if (res.ok) {
        const d = await res.json()
        setCustomerResults(d.customers || [])
      }
    } catch {
      setCustomerResults([])
    } finally {
      setSearching(false)
    }
  }, [customerSearch])

  const createCustomer = useCallback(async () => {
    if (!newPhone.trim()) {
      setError('El telefono es requerido')
      return null
    }
    setCreatingCustomer(true)
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: newName, phone: newPhone.trim(), email: newEmail }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || 'Error creando cliente')
        return null
      }
      return d.customer as CustomerOption
    } catch {
      setError('Error de conexion')
      return null
    } finally {
      setCreatingCustomer(false)
    }
  }, [newName, newPhone, newEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    let finalCustomerId = customerId
    if (!finalCustomerId && showNewCustomer) {
      const newCustomer = await createCustomer()
      if (!newCustomer) return
      finalCustomerId = newCustomer.id
    }

    if (!finalCustomerId) {
      setError('Selecciona o crea un cliente')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time_start: timeStart,
          time_end: timeEnd,
          party_size: partySize,
          customer_id: finalCustomerId,
          zone_id: zoneId || undefined,
          special_requests: specialRequests || undefined,
          source,
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || 'Error creando reserva')
        return
      }
      onCreated()
      onClose()
    } catch {
      setError('Error de conexion')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCustomer = customerId
    ? customerResults.find(c => c.id === customerId)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#F5EDE0] border border-[#D7CCC8] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D7CCC8] px-5 py-4">
          <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#3E2723]">Nueva Reserva</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D6E63] hover:bg-[#D7CCC8]/50 active:scale-[0.97]"
            style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Customer selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#3E2723]">Cliente</label>

            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg border border-[#6B2737]/30 bg-[#6B2737]/5 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-[#3E2723]">{selectedCustomer.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-[#8D6E63]">{selectedCustomer.phone || selectedCustomer.email}</p>
                </div>
                <button type="button" onClick={() => { setCustomerId('') }} className="text-xs text-[#6B2737] hover:underline">Cambiar</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63]" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchCustomers()}
                      placeholder="Buscar por nombre o telefono..."
                      className="w-full rounded-lg border border-[#D7CCC8] bg-white py-2 pl-9 pr-3 text-sm text-[#3E2723] placeholder:text-[#BCAAA4] focus:border-[#6B2737] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={searchCustomers}
                    disabled={searching}
                    className="rounded-lg bg-[#6B2737] px-4 py-2 text-sm font-medium text-white hover:bg-[#6B2737]/90 disabled:opacity-50"
                  >
                    {searching ? <Spinner size={16} className="animate-spin" /> : 'Buscar'}
                  </button>
                </div>

                {customerResults.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-[#D7CCC8] bg-white">
                    {customerResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCustomerId(c.id); setCustomerResults([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#EFEBE9] border-b border-[#D7CCC8]/50 last:border-0"
                      >
                        <span className="font-medium text-[#3E2723]">{c.full_name || 'Sin nombre'}</span>
                        <span className="ml-2 text-xs text-[#8D6E63]">{c.phone || c.email}</span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowNewCustomer(!showNewCustomer)}
                  className="mt-2 flex items-center gap-1 text-xs text-[#6B2737] hover:underline"
                >
                  <Plus size={14} />
                  Crear nuevo cliente
                </button>

                {showNewCustomer && (
                  <div className="mt-2 space-y-2 rounded-lg border border-[#D7CCC8] bg-white p-3">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nombre completo"
                      className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Telefono *"
                      className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                    />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Email (opcional)"
                      className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#3E2723]">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#3E2723]">Desde</label>
              <select
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
              >
                {SERVICE_HOURS.map(h => (
                  <option key={h} value={h}>{formatTime(h)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#3E2723]">Hasta</label>
              <select
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
              >
                {SERVICE_HOURS.map(h => (
                  <option key={h} value={h}>{formatTime(h)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Party size & Zone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#3E2723]">Invitados</label>
              <input
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#3E2723]">Zona</label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
              >
                <option value="">Sin preferencia</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#3E2723]">Origen</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
            >
              <option value="phone">Telefono</option>
              <option value="web">Web</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="presencial">Presencial</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>

          {/* Special requests */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#3E2723]">Peticiones especiales</label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
              placeholder="Cumpleanos, alergias, etc."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-[#6B2737] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6B2737]/90 active:scale-[0.97] disabled:opacity-50"
              style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
            >
              {submitting ? 'Creando...' : 'Crear Reserva'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#D7CCC8] px-4 py-2.5 text-sm font-medium text-[#3E2723] hover:bg-[#EFEBE9] active:scale-[0.97]"
              style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}