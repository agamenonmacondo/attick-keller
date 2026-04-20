'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface CustomerInfo {
  email: string
  full_name: string | null
}

interface Reservation {
  id: string
  date: string
  time_start: string
  time_end: string
  party_size: number
  status: string
  special_requests: string | null
  customer_id: string
  customers: CustomerInfo | null
}

const HOURS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
]

const ADMIN_EMAILS = ['agamenonmacondo@gmail.com', 'rayo.abb@gmail.com']

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO').format(n)
}

export default function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  const [filter, setFilter] = useState<string>('all')
  const [detailId, setDetailId] = useState<string | null>(null)

  const fetchReservations = useCallback(async () => {
    try {
      const res = await fetch('/api/reservations')
      if (res.ok) {
        const data = await res.json()
        setReservations(data.reservations || [])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchReservations() }, [fetchReservations])

  if (authLoading) return <LoadingSkeleton />
  if (!user) { router.push('/auth/login'); return null }
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
    return (
      <div className="min-h-[100dvh] bg-[#F5EDE0] flex items-center justify-center">
        <p className="text-[#8D6E63] text-lg">Acceso no autorizado</p>
      </div>
    )
  }

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch('/api/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: id, status }),
    })
    if (res.ok) fetchReservations()
    else { const d = await res.json(); alert(d.error) }
  }

  // Date navigation
  const dateObj = new Date(selectedDate + 'T12:00:00')
  const prevDay = () => { const d = new Date(dateObj); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]) }
  const nextDay = () => { const d = new Date(dateObj); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]) }
  const today = () => setSelectedDate(new Date().toISOString().split('T')[0])

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) }
    catch { return d }
  }

  // Filtered reservations for selected date
  const dayReservations = useMemo(() => {
    let filtered = reservations.filter(r => r.date === selectedDate)
    if (filter !== 'all') filtered = filtered.filter(r => r.status === filter)
    return filtered.sort((a, b) => a.time_start.localeCompare(b.time_start))
  }, [reservations, selectedDate, filter])

  // All dates that have reservations
  const datesWithReservations = useMemo(() => {
    const dates = new Set(reservations.map(r => r.date))
    return Array.from(dates).sort()
  }, [reservations])

  // Stats for selected date
  const dayStats = useMemo(() => {
    const all = reservations.filter(r => r.date === selectedDate)
    return {
      total: all.length,
      pending: all.filter(r => r.status === 'pending').length,
      confirmed: all.filter(r => r.status === 'confirmed').length,
      cancelled: all.filter(r => r.status === 'cancelled').length,
      guests: all.filter(r => r.status !== 'cancelled').reduce((sum, r) => sum + r.party_size, 0),
    }
  }, [reservations, selectedDate])

  // Global stats
  const globalStats = useMemo(() => ({
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    todayGuests: reservations.filter(r => r.date === new Date().toISOString().split('T')[0] && r.status !== 'cancelled').reduce((s, r) => s + r.party_size, 0),
  }), [reservations])

  // Reservations by hour for timeline
  const timelineSlots = useMemo(() => {
    const slots: Record<string, Reservation[]> = {}
    HOURS.forEach(h => { slots[h] = [] })
    dayReservations.forEach(r => {
      const hour = r.time_start
      if (slots[hour]) slots[hour].push(r)
      else slots[hour] = [r]
    })
    return slots
  }, [dayReservations])

  const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
    pending: { label: 'Pendiente', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    confirmed: { label: 'Confirmada', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    cancelled: { label: 'Cancelada', dot: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    completed: { label: 'Completada', dot: 'bg-zinc-400', bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200' },
  }

  const detailReservation = detailId ? dayReservations.find(r => r.id === detailId) : null

  return (
    <div className="min-h-[100dvh] bg-[#F5EDE0]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-[#3E2723]/95 backdrop-blur-sm border-b border-[#5D4037]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-['Playfair_Display'] text-xl font-bold text-[#C9A94E]">Attick & Keller</h1>
            <span className="text-xs text-[#8D6E63] bg-[#5D4037] px-2 py-0.5 rounded font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/perfil')} className="text-sm text-[#D7CCC8] hover:text-white transition-colors">
              Mi Perfil
            </button>
            <button onClick={signOut} className="text-sm text-[#8D6E63] hover:text-[#D7CCC8] transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        {/* Global metrics row */}
        <div className="grid grid-cols-3 gap-px bg-[#D7CCC8] rounded-lg overflow-hidden mb-6">
          <MetricCard label="Reservas totales" value={globalStats.total} />
          <MetricCard label="Pendientes global" value={globalStats.pending} accent="amber" />
          <MetricCard label="Invitados hoy" value={globalStats.todayGuests} accent="emerald" />
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={prevDay} className="w-8 h-8 flex items-center justify-center rounded-md border border-[#D7CCC8] hover:bg-[#D7CCC8]/50 transition-colors text-[#3E2723]">
              <ChevronLeft />
            </button>
            <button onClick={today} className="px-3 py-1 text-xs font-medium border border-[#D7CCC8] rounded-md hover:bg-[#D7CCC8]/50 transition-colors text-[#3E2723]">
              Hoy
            </button>
            <button onClick={nextDay} className="w-8 h-8 flex items-center justify-center rounded-md border border-[#D7CCC8] hover:bg-[#D7CCC8]/50 transition-colors text-[#3E2723]">
              <ChevronRight />
            </button>
            <h2 className="text-lg font-semibold text-[#3E2723] ml-2 font-['Playfair_Display']">
              {formatDate(selectedDate)}
            </h2>
          </div>

          {/* Date pills for quick navigation */}
          <div className="hidden md:flex items-center gap-1">
            {datesWithReservations.slice(-7).map(d => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  d === selectedDate ? 'bg-[#6B2737] text-white' : 'text-[#8D6E63] hover:bg-[#D7CCC8]/50'
                )}
              >
                {formatDate(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Day stats */}
        <div className="grid grid-cols-5 gap-px bg-[#D7CCC8] rounded-lg overflow-hidden mb-6">
          <DayMetric label="Total" value={dayStats.total} />
          <DayMetric label="Pendientes" value={dayStats.pending} accent="amber" />
          <DayMetric label="Confirmadas" value={dayStats.confirmed} accent="emerald" />
          <DayMetric label="Canceladas" value={dayStats.cancelled} accent="red" />
          <DayMetric label="Invitados" value={dayStats.guests} accent="blue" />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-[#D7CCC8]">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'pending', label: 'Pendientes' },
            { key: 'confirmed', label: 'Confirmadas' },
            { key: 'cancelled', label: 'Canceladas' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                filter === f.key
                  ? 'border-[#6B2737] text-[#3E2723]'
                  : 'border-transparent text-[#8D6E63] hover:text-[#3E2723]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Main content: Timeline + Detail panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[#EFEBE9] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : dayReservations.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#D7CCC8]/50 flex items-center justify-center">
                  <CalendarIcon />
                </div>
                <p className="text-[#8D6E63]">Sin reservas para este dia</p>
                <p className="text-sm text-[#BCAAA4] mt-1">Selecciona otra fecha o espera nuevas reservas</p>
              </div>
            ) : (
              <div className="divide-y divide-[#D7CCC8]/50">
                {/* Hour slots */}
                {HOURS.map(hour => {
                  const slotReservations = timelineSlots[hour] || []
                  return (
                    <div key={hour} className="flex">
                      {/* Hour label */}
                      <div className="w-16 py-3 text-right pr-3">
                        <span className="text-xs font-mono text-[#8D6E63]">{hour}</span>
                      </div>
                      {/* Slot content */}
                      <div className="flex-1 py-2 pl-3 border-l border-[#D7CCC8] min-h-[3.5rem]">
                        <AnimatePresence>
                          {slotReservations.map(r => {
                            const cfg = statusConfig[r.status] || statusConfig.pending
                            return (
                              <motion.div
                                key={r.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                                layout
                                onClick={() => setDetailId(detailId === r.id ? null : r.id)}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors mb-1',
                                  'hover:bg-[#EFEBE9]',
                                  detailId === r.id && 'bg-[#EFEBE9] ring-1 ring-[#6B2737]/20',
                                  cfg.bg, cfg.border, 'border'
                                )}
                              >
                                {/* Status dot */}
                                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                                {/* Customer */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#3E2723] truncate">
                                    {r.customers?.full_name || r.customers?.email || 'Cliente'}
                                  </p>
                                  <p className="text-xs text-[#8D6E63]">
                                    {r.time_start} - {r.time_end}
                                  </p>
                                </div>
                                {/* Party size */}
                                <span className="text-xs font-mono font-medium text-[#3E2723] bg-white px-1.5 py-0.5 rounded">
                                  {r.party_size}p
                                </span>
                                {/* Status badge */}
                                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', cfg.bg, cfg.text)}>
                                  {cfg.label}
                                </span>
                                {/* Quick actions */}
                                {r.status === 'pending' && (
                                  <div className="flex gap-1 ml-1">
                                    <button
                                      onClick={e => { e.stopPropagation(); updateStatus(r.id, 'confirmed') }}
                                      className="w-6 h-6 flex items-center justify-center rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors active:scale-95"
                                      title="Confirmar"
                                    >
                                      <CheckIcon />
                                    </button>
                                    <button
                                      onClick={e => { e.stopPropagation(); updateStatus(r.id, 'cancelled') }}
                                      className="w-6 h-6 flex items-center justify-center rounded bg-red-600 text-white hover:bg-red-700 transition-colors active:scale-95"
                                      title="Cancelar"
                                    >
                                      <XIcon />
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {detailReservation ? (
                <motion.div
                  key={detailReservation.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  className="bg-white rounded-xl border border-[#D7CCC8] overflow-hidden sticky top-20"
                >
                  {/* Detail header */}
                  <div className={cn('px-5 py-4', (statusConfig[detailReservation.status] || statusConfig.pending).bg)}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[#3E2723]">Detalle de Reserva</h3>
                      <button onClick={() => setDetailId(null)} className="text-[#8D6E63] hover:text-[#3E2723] transition-colors">
                        <XIcon />
                      </button>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {/* Customer */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#8D6E63] font-medium mb-1">Cliente</p>
                      <p className="text-sm font-medium text-[#3E2723]">
                        {detailReservation.customers?.full_name || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-[#8D6E63]">{detailReservation.customers?.email}</p>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#8D6E63] font-medium mb-1">Fecha</p>
                        <p className="text-sm font-mono font-medium text-[#3E2723]">{detailReservation.date}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#8D6E63] font-medium mb-1">Hora</p>
                        <p className="text-sm font-mono font-medium text-[#3E2723]">{detailReservation.time_start} - {detailReservation.time_end}</p>
                      </div>
                    </div>

                    {/* Party size & Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#8D6E63] font-medium mb-1">Personas</p>
                        <p className="text-sm font-mono font-medium text-[#3E2723]">{detailReservation.party_size}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#8D6E63] font-medium mb-1">Estado</p>
                        <span className={cn(
                          'inline-block text-xs font-medium px-2 py-0.5 rounded',
                          (statusConfig[detailReservation.status] || statusConfig.pending).bg,
                          (statusConfig[detailReservation.status] || statusConfig.pending).text,
                        )}>
                          {(statusConfig[detailReservation.status] || statusConfig.pending).label}
                        </span>
                      </div>
                    </div>

                    {/* Special requests */}
                    {detailReservation.special_requests && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#8D6E63] font-medium mb-1">Peticiones especiales</p>
                        <p className="text-sm text-[#3E2723]">{detailReservation.special_requests}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-3 border-t border-[#D7CCC8] space-y-2">
                      {detailReservation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(detailReservation.id, 'confirmed')}
                            className="w-full py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors active:scale-[0.98]"
                          >
                            Confirmar reserva
                          </button>
                          <button
                            onClick={() => updateStatus(detailReservation.id, 'cancelled')}
                            className="w-full py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors active:scale-[0.98]"
                          >
                            Cancelar reserva
                          </button>
                        </>
                      )}
                      {detailReservation.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(detailReservation.id, 'completed')}
                          className="w-full py-2 bg-[#6B2737] text-white rounded-lg text-sm font-medium hover:bg-[#8B3747] transition-colors active:scale-[0.98]"
                        >
                          Marcar completada
                        </button>
                      )}
                      <button
                        onClick={() => router.push('/perfil')}
                        className="w-full py-2 border border-[#D7CCC8] text-[#3E2723] rounded-lg text-sm font-medium hover:bg-[#EFEBE9] transition-colors"
                      >
                        Modificar reserva
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white rounded-xl border border-[#D7CCC8] p-6 text-center sticky top-20">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#EFEBE9] flex items-center justify-center">
                    <InfoIcon />
                  </div>
                  <p className="text-sm text-[#8D6E63]">Selecciona una reserva para ver detalles</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Sub-components (isolated, no re-renders) ---

function MetricCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const accentMap: Record<string, string> = {
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
  }
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-[#8D6E63] font-medium">{label}</p>
      <p className={cn('text-2xl font-mono font-bold tracking-tight', accent ? accentMap[accent] : 'text-[#3E2723]')}>{value}</p>
    </div>
  )
}

function DayMetric({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const accentMap: Record<string, string> = {
    amber: 'text-amber-700 bg-amber-50',
    emerald: 'text-emerald-700 bg-emerald-50',
    red: 'text-red-700 bg-red-50',
    blue: 'text-blue-700 bg-blue-50',
  }
  return (
    <div className={cn('px-3 py-2', accent ? accentMap[accent] : 'bg-white')}>
      <p className="text-[10px] uppercase tracking-wider text-[#8D6E63] font-medium">{label}</p>
      <p className="text-xl font-mono font-bold">{value}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#F5EDE0] px-4 py-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="h-14 bg-[#EFEBE9] rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-2 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#EFEBE9] rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 bg-[#EFEBE9] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Minimal inline SVG icons (no emoji, no external deps) ---

function ChevronLeft() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8L10 13" /></svg>
}
function ChevronRight() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3L11 8L6 13" /></svg>
}
function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2.5 6L5 8.5L9.5 3.5" /></svg>
}
function XIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3L9 9M9 3L3 9" /></svg>
}
function CalendarIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2v3M13 2v3" /></svg>
}
function InfoIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="7" /><path d="M9 12V9M9 6.5v0" /></svg>
}