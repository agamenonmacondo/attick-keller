'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { AnimatedCard } from '@/components/admin/shared/AnimatedCard'
import { EmptyState } from '@/components/admin/shared/EmptyState'
import { SectionHeading } from '@/components/admin/shared/SectionHeading'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import {
  ComputerTower,
  CalendarBlank,
  User,
  ArrowRight,
  ArrowLeft,
  House,
  SignOut,
  PencilSimple,
  X,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface Reservation {
  id: string
  date: string
  time_start: string
  time_end: string
  party_size: number
  status: string
  special_requests: string | null
  customers?: { email: string; full_name: string | null } | null
}

const timeSlots = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
]

const SPRING = { stiffness: 100, damping: 20, mass: 1 }

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12, transform: 'translateY(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    transform: 'translateY(0px)',
    transition: { type: 'spring' as const, ...SPRING },
  },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-[#D4922A]/10', text: 'text-[#B0781E]', dot: 'bg-[#D4922A]' },
  confirmed: { label: 'Confirmada', bg: 'bg-[#5C7A4D]/10', text: 'text-[#4A6640]', dot: 'bg-[#5C7A4D]' },
  cancelled: { label: 'Cancelada', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  completed: { label: 'Completada', bg: 'bg-[#8D6E63]/10', text: 'text-[#5D4037]', dot: 'bg-[#8D6E63]' },
}

export default function PerfilPage() {
  const { user, loading: authLoading, roleLoading, isHost, signOut } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ date: '', time_start: '', party_size: 2, special_requests: '' })
  const [saving, setSaving] = useState(false)
  const prefersReduced = usePrefersReducedMotion()

  const fetchReservations = async () => {
    if (!user) return
    try {
      const res = await fetch('/api/reservations')
      if (res.ok) {
        const data = await res.json()
        setReservations(data.reservations || [])
        setIsAdminUser(data.isAdmin === true)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchReservations()
  }, [user])

  const handleCancel = async (id: string) => {
    if (!confirm('Seguro que quieres cancelar esta reserva?')) return
    setCancelling(id)
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: id, status: 'cancelled' }),
      })
      if (res.ok) {
        setReservations(prev => prev.filter(r => r.id !== id))
      } else {
        const data = await res.json()
        alert(data.error || 'Error al cancelar')
      }
    } catch { alert('Error de conexion') }
    finally { setCancelling(null) }
  }

  const startEdit = (r: Reservation) => {
    setEditingId(r.id)
    setEditData({
      date: r.date,
      time_start: r.time_start,
      party_size: r.party_size,
      special_requests: r.special_requests || '',
    })
  }

  const handleSave = async (id: string) => {
    setSaving(true)
    try {
      const [hours, minutes] = editData.time_start.split(':').map(Number)
      const endHours = hours + 2
      const time_end = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: id,
          date: editData.date,
          time_start: editData.time_start,
          time_end,
          party_size: editData.party_size,
          special_requests: editData.special_requests || null,
        }),
      })
      if (res.ok) {
        setEditingId(null)
        await fetchReservations()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al modificar')
      }
    } catch { alert('Error de conexion') }
    finally { setSaving(false) }
  }

  const handleConfirm = async (id: string) => {
    const res = await fetch('/api/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: id, status: 'confirmed' }),
    })
    if (res.ok) fetchReservations()
    else { const d = await res.json(); alert(d.error) }
  }

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#F5EDE0] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8D6E63] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-[#F5EDE0] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8D6E63] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canModify = (status: string) => status === 'pending' || status === 'confirmed'

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    } catch { return d }
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const pageTitle = isAdminUser ? 'Panel de Administracion' : isHost ? 'Portal de Host' : 'Mi Perfil'

  return (
    <div className="min-h-[100dvh] bg-[#F5EDE0]">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-40 bg-[#F5EDE0]/80 backdrop-blur-md border-b border-[#D7CCC8]/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#5D4037] hover:text-[#3E2723] active:scale-[0.97] transition-colors"
            style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
          >
            <House size={18} weight="fill" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
          <span className="font-['Playfair_Display'] text-base font-bold text-[#3E2723]">
            {pageTitle}
          </span>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8D6E63] hover:text-[#3E2723] active:scale-[0.97] transition-colors"
            style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
          >
            <SignOut size={18} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </nav>

      <motion.div
        className="max-w-2xl mx-auto px-4 py-6 pb-16"
        variants={prefersReduced ? undefined : containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile card */}
        <motion.div variants={prefersReduced ? undefined : itemVariants}>
          <AnimatedCard delay={0} hover className="bg-white rounded-2xl border border-[#D7CCC8]/60 p-6 md:p-8 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#3E2723] flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  {(user.user_metadata?.avatar_url || user.user_metadata?.picture) ? (
                    <img
                      src={user.user_metadata.avatar_url || user.user_metadata.picture}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={28} weight="fill" className="text-[#C9A94E]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-[#3E2723] leading-tight">
                    {pageTitle}
                  </h1>
                  <p className="text-[#8D6E63] text-sm mt-0.5 truncate">{user.email}</p>
                  {user.user_metadata?.full_name && (
                    <p className="text-[#3E2723] font-medium text-sm mt-0.5">
                      {user.user_metadata.full_name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              {!isHost && (
                <Link
                  href="/reservar"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6B2737] text-white rounded-xl text-sm font-semibold hover:bg-[#5C2230] active:scale-[0.97] transition-colors"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  <CalendarBlank size={16} weight="bold" />
                  Nueva Reserva
                </Link>
              )}
              {isAdminUser && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3E2723] text-[#F5EDE0] rounded-xl text-sm font-semibold hover:bg-[#2A1A16] active:scale-[0.97] transition-colors"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  <ComputerTower size={16} weight="fill" />
                  Administracion
                </Link>
              )}
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Host portal */}
        {isHost && (
          <motion.div variants={prefersReduced ? undefined : itemVariants} className="mb-6">
            <AnimatedCard delay={0.05} className="relative overflow-hidden rounded-2xl bg-[#3E2723] border border-[#5D4037]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#6B2737]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#5D4037]/60 border border-[#8D6E63]/30 flex items-center justify-center shrink-0">
                    <ComputerTower size={28} weight="fill" className="text-[#C9A94E]" />
                  </div>
                  <div>
                    <h2 className="font-['Playfair_Display'] text-xl md:text-2xl font-bold text-[#F5EDE0]">
                      Portal de Host
                    </h2>
                    <p className="text-sm text-[#D7CCC8]/80 mt-0.5 max-w-[260px]">
                      Gestiona el piso, mesas y reservas del turno en tiempo real.
                    </p>
                  </div>
                </div>
                <Link
                  href="/host"
                  className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[#6B2737] text-white rounded-xl text-sm font-semibold hover:bg-[#7A2D40] active:scale-[0.97] transition-colors shadow-lg shadow-black/20"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  Abrir Portal
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </div>
            </AnimatedCard>
          </motion.div>
        )}

        {/* Reservations */}
        <motion.div variants={prefersReduced ? undefined : itemVariants}>
          <AnimatedCard delay={0.1} hover={false} className="bg-white rounded-2xl border border-[#D7CCC8]/60 p-6 md:p-8">
            <SectionHeading className="mb-4">
              {isAdminUser ? 'Todas las Reservas' : isHost ? 'Tus Reservas Personales' : 'Mis Reservas'}
            </SectionHeading>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-[#F5EDE0] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <EmptyState
                icon={<CalendarBlank size={40} weight="duotone" className="text-[#D7CCC8]" />}
                title="Sin reservas aun"
                description={isHost ? 'Cuando hagas una reserva personal, aparecera aqui.' : 'Haz tu primera reserva y la veras aqui.'}
              />
            ) : (
              <div className="space-y-3">
                {reservations.map(r => {
                  const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
                  const isEditing = editingId === r.id

                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'rounded-xl border transition-colors',
                        isEditing ? 'border-[#6B2737]/30 bg-[#6B2737]/[0.02]' : 'border-[#D7CCC8]/80 bg-white hover:border-[#D7CCC8]'
                      )}
                    >
                      {/* Card header */}
                      <div className="p-4">
                        {isAdminUser && r.customers && (
                          <p className="text-xs text-[#D4922A] font-semibold mb-2">
                            {r.customers.full_name || r.customers.email}
                          </p>
                        )}

                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-[#3E2723] mb-1">Fecha</label>
                                <input
                                  type="date"
                                  value={editData.date}
                                  onChange={e => setEditData({ ...editData, date: e.target.value })}
                                  min={minDate}
                                  className="w-full px-3 py-2 rounded-lg border border-[#D7CCC8] text-sm bg-[#F5EDE0]/50 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6B2737]/20"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[#3E2723] mb-1">Hora</label>
                                <select
                                  value={editData.time_start}
                                  onChange={e => setEditData({ ...editData, time_start: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg border border-[#D7CCC8] text-sm bg-[#F5EDE0]/50 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6B2737]/20"
                                >
                                  {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#3E2723] mb-1">Personas</label>
                              <select
                                value={editData.party_size}
                                onChange={e => setEditData({ ...editData, party_size: Number(e.target.value) })}
                                className="w-full px-3 py-2 rounded-lg border border-[#D7CCC8] text-sm bg-[#F5EDE0]/50 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6B2737]/20"
                              >
                                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#3E2723] mb-1">Peticiones especiales</label>
                              <textarea
                                value={editData.special_requests}
                                onChange={e => setEditData({ ...editData, special_requests: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-[#D7CCC8] text-sm bg-[#F5EDE0]/50 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6B2737]/20"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleSave(r.id)}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6B2737] text-white rounded-lg text-sm font-semibold hover:bg-[#5C2230] disabled:opacity-50 active:scale-[0.97]"
                                style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                              >
                                <CheckCircle size={14} weight="bold" />
                                {saving ? 'Guardando...' : 'Guardar'}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#D7CCC8] rounded-lg text-sm font-medium text-[#3E2723] hover:bg-[#EFEBE9] active:scale-[0.97]"
                                style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                              >
                                <X size={14} weight="bold" />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-['Playfair_Display'] text-lg font-bold text-[#3E2723] capitalize">
                                  {formatDate(r.date)}
                                </p>
                                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', status.bg, status.text)}>
                                  <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                                  {status.label}
                                </span>
                              </div>
                              <p className="text-sm text-[#8D6E63]">
                                {r.time_start} - {r.time_end} · {r.party_size} personas
                              </p>
                              {r.special_requests && (
                                <p className="text-sm text-[#8D6E63] mt-1.5 italic">
                                  &ldquo;{r.special_requests}&rdquo;
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              {canModify(r.status) && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => startEdit(r)}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-[#6B2737] hover:text-[#8B3747] active:scale-[0.97] px-2 py-1 rounded-md hover:bg-[#6B2737]/5"
                                    style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
                                  >
                                    <PencilSimple size={12} />
                                    Modificar
                                  </button>
                                  <button
                                    onClick={() => handleCancel(r.id)}
                                    disabled={cancelling === r.id}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 active:scale-[0.97] px-2 py-1 rounded-md hover:bg-red-50 disabled:opacity-50"
                                    style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
                                  >
                                    <X size={12} />
                                    {cancelling === r.id ? '...' : 'Cancelar'}
                                  </button>
                                </div>
                              )}
                              {isAdminUser && r.status === 'pending' && (
                                <button
                                  onClick={() => handleConfirm(r.id)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[#5C7A4D] hover:text-[#4A6640] active:scale-[0.97] px-2 py-1 rounded-md hover:bg-[#5C7A4D]/10"
                                  style={{ transition: 'transform 160ms ease-out, color 200ms ease-out' }}
                                >
                                  <CheckCircle size={12} />
                                  Confirmar
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </AnimatedCard>
        </motion.div>
      </motion.div>
    </div>
  )
}
