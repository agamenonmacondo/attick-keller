'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Spinner, Plus, MagnifyingGlass, User } from '@phosphor-icons/react'
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
  const [phoneMatch, setPhoneMatch] = useState<CustomerOption | null>(null)
  const [phoneMatchMessage, setPhoneMatchMessage] = useState('')
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Auto-search by phone with debounce — may find multiple customers sharing same number
  const searchByPhone = useCallback(async (phone: string) => {
    if (phone.trim().length < 7) {
      setPhoneMatch(null)
      setPhoneMatchMessage('')
      return
    }
    try {
      const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(phone.trim())}&limit=10`)
      if (res.ok) {
        const d = await res.json()
        const customers: CustomerOption[] = d.customers || []
        // Filter to exact phone matches (last 10 digits)
        const phoneDigits = phone.replace(/\D/g, '')
        const exactMatches = customers.filter(c =>
          c.phone?.replace(/\D/g, '').slice(-10) === phoneDigits.slice(-10)
        )

        if (exactMatches.length === 1) {
          // Single match — auto-select
          const match = exactMatches[0]
          setPhoneMatch(match)
          setPhoneMatchMessage(`Cliente encontrado: ${match.full_name || 'Sin nombre'}`)
          setCustomerId(match.id)
          setNewName(match.full_name || '')
          setNewEmail(match.email || '')
          setShowNewCustomer(true)
        } else if (exactMatches.length > 1) {
          // Multiple people share this phone — show all options
          setPhoneMatch(null)
          setPhoneMatchMessage(`${exactMatches.length} clientes comparten este telefono`)
          setCustomerResults(exactMatches)
          // Pre-fill with empty name so user can choose or create new
          setNewName('')
          setNewEmail('')
          setShowNewCustomer(true)
        } else if (customers.length > 0) {
          // Partial matches (different number)
          setPhoneMatch(null)
          setPhoneMatchMessage('')
          setCustomerResults(customers)
        } else {
          // New phone — will create new customer
          setPhoneMatch(null)
          setPhoneMatchMessage('Telefono nuevo — se creara un nuevo cliente')
          setNewName('')
          setNewEmail('')
          setShowNewCustomer(true)
        }
      }
    } catch {
      // silently ignore
    }
  }, [])

  const handlePhoneChange = useCallback((value: string) => {
    setNewPhone(value)
    setPhoneMatch(null)
    setPhoneMatchMessage('')
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current)
    phoneDebounceRef.current = setTimeout(() => {
      searchByPhone(value)
    }, 600)
  }, [searchByPhone])

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current)
    }
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
    ? customerResults.find(c => c.id === customerId) ?? phoneMatch
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[var(--text-primary)]">Nueva Reserva</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50 active:scale-[0.97]"
            style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-lg bg-[var(--color-danger)]/10 border border-red-200 px-3 py-2 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {/* Customer selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Cliente</label>

            {selectedCustomer && !showNewCustomer ? (
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-ak-borgona)]/30 bg-[var(--color-ak-borgona)]/5 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{selectedCustomer.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{selectedCustomer.phone || selectedCustomer.email}</p>
                </div>
                <button type="button" onClick={() => { setCustomerId(''); setPhoneMatch(null); }} className="text-xs text-[var(--color-ak-borgona)] hover:underline">Cambiar</button>
              </div>
            ) : (
              <>
                {/* Search existing customer */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchCustomers()}
                      placeholder="Buscar por nombre o telefono..."
                      className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={searchCustomers}
                    disabled={searching}
                    className="rounded-lg bg-[var(--color-ak-borgona)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 disabled:opacity-50"
                  >
                    {searching ? <Spinner size={16} className="animate-spin" /> : 'Buscar'}
                  </button>
                </div>

                {customerResults.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]">
                    {customerResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCustomerId(c.id); setCustomerResults([]); setShowNewCustomer(false); setPhoneMatch(null); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-input)] border-b border-[var(--border-default)]/50 last:border-0"
                      >
                        <span className="font-medium text-[var(--text-primary)]">{c.full_name || 'Sin nombre'}</span>
                        <span className="ml-2 text-xs text-[var(--text-secondary)]">{c.phone || c.email}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* New customer form */}
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(!showNewCustomer)}
                  className="mt-2 flex items-center gap-1 text-xs text-[var(--color-ak-borgona)] hover:underline"
                >
                  <Plus size={14} />
                  Crear nuevo cliente
                </button>

                {showNewCustomer && (
                  <div className="mt-2 space-y-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                    {/* Phone with auto-detect */}
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="text-xs font-medium text-[var(--text-secondary)]">Telefono *</label>
                        {phoneMatchMessage && (
                          <span className={`text-xs ${phoneMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-secondary)]'}`}>
                            — {phoneMatchMessage}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          placeholder="Escribe el telefono..."
                          className={`w-full rounded-lg border bg-[var(--bg-input)] px-3 py-2 pr-9 text-sm text-[var(--text-primary)] focus:outline-none ${
                            phoneMatch
                              ? 'border-emerald-500 focus:border-emerald-500'
                              : 'border-[var(--border-default)] focus:border-[var(--color-ak-borgona)]'
                          }`}
                        />
                        {phoneMatch && (
                          <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" weight="bold" />
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={phoneMatch ? (phoneMatch.full_name || 'Sin nombre') : 'Nombre completo'}
                      className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                    />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={phoneMatch ? (phoneMatch.email || 'Sin email') : 'Email (opcional)'}
                      className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                    />

                    {/* Phone match feedback */}
                    {phoneMatch && (
                      <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                        <User size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" weight="bold" />
                        <div className="text-xs">
                          <p className="font-medium text-emerald-700 dark:text-emerald-300">
                            Cliente existente: {phoneMatch.full_name || 'Sin nombre'}
                          </p>
                          <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Se usara este cliente. Si modificas nombre o email, se actualizaran.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerId(phoneMatch.id)
                              setShowNewCustomer(false)
                              setPhoneMatch(null)
                              setPhoneMatchMessage('')
                            }}
                            className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                          >
                            Seleccionar este cliente directamente
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Multiple customers share this phone — show picker */}
                    {customerResults.length > 1 && !phoneMatch && (
                      <div className="mt-1">
                        <p className="text-xs font-medium text-[var(--color-ak-borgona)] mb-1">
                          Varias personas comparten este telefono. Selecciona o crea uno nuevo:
                        </p>
                        <div className="max-h-28 overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]">
                          {customerResults.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCustomerId(c.id)
                                setCustomerResults([])
                                setShowNewCustomer(false)
                                setPhoneMatchMessage('')
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-input)] border-b border-[var(--border-default)]/50 last:border-0"
                            >
                              <span className="font-medium text-[var(--text-primary)]">{c.full_name || 'Sin nombre'}</span>
                              {c.email && <span className="ml-2 text-xs text-[var(--text-secondary)]">{c.email}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New phone — info message */}
                    {phoneMatchMessage && !phoneMatch && customerResults.length <= 1 && (
                      <p className="text-xs text-[var(--text-secondary)]">{phoneMatchMessage}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Desde</label>
              <select
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              >
                {SERVICE_HOURS.map(h => (
                  <option key={h} value={h}>{formatTime(h)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Hasta</label>
              <select
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
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
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Invitados</label>
              <input
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Zona</label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
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
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Origen</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
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
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Peticiones especiales</label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              placeholder="Cumpleanos, alergias, etc."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 active:scale-[0.97] disabled:opacity-50"
              style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
            >
              {submitting ? 'Creando...' : 'Crear Reserva'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] active:scale-[0.97]"
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