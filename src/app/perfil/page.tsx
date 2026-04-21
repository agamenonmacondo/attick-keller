'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { ComputerTower, CalendarBlank, User, ArrowRight } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'

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
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8, transform: 'translateY(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    transform: 'translateY(0px)',
    transition: { type: 'spring' as const, ...SPRING },
  },
}

export default function PerfilPage() {
  const { user, loading: authLoading, roleLoading, isHost, signOut } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ date: string; time_start: string; party_size: number; special_requests: string }>({ date: '', time_start: '', party_size: 2, special_requests: '' })
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
    if (!confirm('Seguro que quieres cancelar esta reserva? Se eliminara del sistema.')) return
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

  if (authLoading || roleLoading) return <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center">Cargando...</div>
  if (!user) return <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center">Cargando...</div>

  const statusBadge: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-800',
  }
  const statusLabel: Record<string, string> = {
    pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada',
  }
  const canModify = (status: string) => status === 'pending' || status === 'confirmed'

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
    catch { return d }
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-[#F5EDE0] pt-24 pb-12 px-4"
    >
      <motion.div
        className="max-w-2xl mx-auto"
        variants={prefersReduced ? undefined : containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile header */}
        <motion.div
          variants={prefersReduced ? undefined : itemVariants}
          className="bg-white rounded-2xl shadow-xl p-8 mb-6"
        >
          <div className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-[#EFEBE9] flex items-center justify-center shrink-0"
            >
              <User size={24} className="text-[#5D4037]" />
            </div>
            <div>
              <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-[#3E2723]"
              >
                {isAdminUser ? 'Panel de Administracion' : isHost ? 'Portal de Host' : 'Mi Perfil'}
              </h1>
              <p className="text-[#8D6E63] text-sm">{user.email}</p>
            </div>
          </div>
          {user.user_metadata?.full_name && (
            <p className="text-[#3E2723] font-medium mb-4"
            >{user.user_metadata.full_name}</p>
          )}
          <div className="flex flex-wrap gap-3"
          >
            {!isHost && (
              <Link href="/reservar" className="px-5 py-2 bg-[#6B2737] text-white rounded-full text-sm font-semibold hover:bg-[#8B3747] active:scale-[0.97] transition-colors"
              >
                Nueva Reserva
              </Link>
            )}
            <button
              onClick={signOut}
              className="px-5 py-2 border border-[#D7CCC8] rounded-full text-sm font-medium hover:bg-[#EFEBE9] active:scale-[0.97] transition-colors"
            >
              Cerrar Sesion
            </button>
          </div>
        </motion.div>

        {/* Host portal — prominent when isHost */}
        {isHost && (
          <motion.div
            variants={prefersReduced ? undefined : itemVariants}
            className="bg-[#3E2723] rounded-2xl p-6 md:p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-[#5D4037] flex items-center justify-center shrink-0"
              >
                <ComputerTower size={24} weight="fill" className="text-[#C9A94E]" />
              </div>
              <div>
                <h2 className="font-['Playfair_Display'] text-xl md:text-2xl font-bold text-[#F5EDE0]"
                >
                  Portal de Host
                </h2>
                <p className="text-sm text-[#D7CCC8] mt-0.5"
                >
                  Gestiona el piso, mesas y reservas del turno.
                </p>
              </div>
            </div>
            <Link
              href="/host"
              className="shrink-0 px-5 py-2.5 bg-[#6B2737] text-white rounded-full text-sm font-semibold hover:bg-[#8B3747] active:scale-[0.97] transition-colors inline-flex items-center gap-2"
              style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
            >
              Abrir Portal
              <ArrowRight size={16} weight="bold" />
            </Link>
          </motion.div>
        )}

        {/* Reservations — secondary for hosts */}
        <motion.div
          variants={prefersReduced ? undefined : itemVariants}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="flex items-center gap-3 mb-4"
          >
            <CalendarBlank size={20} className="text-[#8D6E63]" />
            <h2 className="text-xl font-semibold text-[#3E2723]"
            >
              {isAdminUser ? 'Todas las Reservas' : isHost ? 'Tus Reservas Personales' : 'Mis Reservas'}
            </h2>
          </div>
          {loading ? (
            <div className="space-y-4"
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-[#F5EDE0] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8"
            >
              <p className="text-[#8D6E63] mb-4"
            >No tienes reservas aun.</p>
              {!isHost && (
                <Link href="/reservar" className="px-5 py-2 bg-[#6B2737] text-white rounded-full text-sm font-semibold hover:bg-[#8B3747] active:scale-[0.97] transition-colors"
                >
                  Hacer una Reserva
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4"
            >
              {reservations.map(r => (
                <div key={r.id} className="border border-[#D7CCC8] rounded-lg p-4"
                >
                  {/* Admin: show customer name */}
                  {isAdminUser && r.customers && (
                    <p className="text-xs text-[#D4922A] font-semibold mb-1"
                    >
                      {r.customers.full_name || r.customers.email}
                    </p>
                  )}

                  {editingId === r.id ? (
                    /* EDIT MODE */
                    <div className="space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3"
                      >
                        <div>
                          <label className="text-xs text-[#8D6E63] font-medium">Fecha</label>
                          <input type="date" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })} min={minDate}
                            className="w-full px-3 py-2 rounded-lg border border-[#D7CCC8] text-sm focus:border-[#6B2737] outline-none" />
                        </div>
                        <div>
                          <label className="text-xs text-[#8D6E63] font-medium">Hora</label>
                          <select value={editData.time_start} onChange={e => setEditData({ ...editData, time_start: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[#D7CCC8] text-sm focus:border-[#6B2737] outline-none"
                          >
                            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-[#8D6E63] font-medium">Personas</label>
                        <select value={editData.party_size} onChange={e => setEditData({ ...editData, party_size: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg border border-[#D7CCC8] text-sm focus:border-[#6B2737] outline-none"
                        >
                          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-[#8D6E63] font-medium">Peticiones especiales</label>
                        <textarea value={editData.special_requests} onChange={e => setEditData({ ...editData, special_requests: e.target.value })} rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-[#D7CCC8] text-sm focus:border-[#6B2737] outline-none" />
                      </div>
                      <div className="flex gap-2"
                      >
                        <button onClick={() => handleSave(r.id)} disabled={saving}
                          className="px-4 py-2 bg-[#6B2737] text-white rounded-lg text-sm font-semibold hover:bg-[#8B3747] disabled:opacity-50 active:scale-[0.97]"
                          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                        >
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="px-4 py-2 border border-[#D7CCC8] rounded-lg text-sm font-medium hover:bg-[#EFEBE9] active:scale-[0.97]"
                          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* VIEW MODE */
                    <div className="flex justify-between items-start"
                    >
                      <div className="flex-1"
                      >
                        <p className="font-medium text-[#3E2723] capitalize"
                        >{formatDate(r.date)}</p>
                        <p className="text-[#8D6E63] text-sm"
                        >{r.time_start} - {r.time_end} · {r.party_size} personas</p>
                        {r.special_requests && <p className="text-[#8D6E63] text-sm mt-1"
                        >{r.special_requests}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2"
                      >
                        <span className={cn('px-3 py-1 rounded-full text-xs font-medium', statusBadge[r.status] || statusBadge.pending)}
                        >
                          {statusLabel[r.status] || r.status}
                        </span>
                        <div className="flex gap-2"
                        >
                          {canModify(r.status) && (
                            <>
                              <button onClick={() => startEdit(r)} className="text-xs text-[#6B2737] hover:text-[#8B3747] font-medium active:scale-[0.97]"
                                style={{ transition: 'transform 160ms ease-out' }}
                              >
                                Modificar
                              </button>
                              <button onClick={() => handleCancel(r.id)} disabled={cancelling === r.id}
                                className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50 active:scale-[0.97]"
                                style={{ transition: 'transform 160ms ease-out' }}
                              >
                                {cancelling === r.id ? 'Eliminando...' : 'Cancelar'}
                              </button>
                            </>
                          )}
                          {isAdminUser && r.status === 'pending' && (
                            <button onClick={() => handleConfirm(r.id)}
                              className="text-xs text-green-700 hover:text-green-900 font-medium active:scale-[0.97]"
                              style={{ transition: 'transform 160ms ease-out' }}
                            >
                              Confirmar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
