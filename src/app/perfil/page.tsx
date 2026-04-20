'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface Reservation {
  id: string
  date: string
  time_start: string
  time_end: string
  party_size: number
  status: string
  special_requests: string | null
}

export default function PerfilPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const fetchReservations = async () => {
    if (!user) return
    try {
      const res = await fetch('/api/reservations')
      if (res.ok) {
        const data = await res.json()
        setReservations(data.reservations || [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchReservations()
  }, [user])

  const handleCancel = async (id: string) => {
    if (!confirm('¿Seguro que quieres cancelar esta reserva?')) return
    setCancelling(id)
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: id, status: 'cancelled' }),
      })
      if (res.ok) {
        await fetchReservations()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al cancelar')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setCancelling(null)
    }
  }

  if (authLoading) return <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center">Cargando...</div>
  if (!user) { router.push('/auth/login'); return null }

  const statusBadge: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-800',
  }

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada',
  }

  const canCancel = (status: string) => status === 'pending' || status === 'confirmed'

  const isAdmin = user?.app_metadata?.role === 'super_admin' || user?.user_metadata?.role === 'super_admin'

  // Format date nicely
  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return d }
  }

  return (
    <div className="min-h-screen bg-[#F5EDE0] pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Profile header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="font-['Playfair_Display'] text-3xl font-bold text-[#3E2723] mb-2">Mi Perfil</h1>
          <p className="text-[#8D6E63]">{user.email}</p>
          {user.user_metadata?.full_name && (
            <p className="text-[#3E2723] font-medium mt-1">{user.user_metadata.full_name}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            <Link
              href="/reservar"
              className="px-5 py-2 bg-[#6B2737] text-white rounded-full text-sm font-semibold hover:bg-[#8B3747] transition-colors"
            >
              Nueva Reserva
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="px-5 py-2 bg-[#3E2723] text-[#C9A94E] rounded-full text-sm font-semibold hover:bg-[#5D4037] transition-colors"
              >
                Admin Panel
              </Link>
            )}
            <button
              onClick={signOut}
              className="px-5 py-2 border border-[#D7CCC8] rounded-full text-sm font-medium hover:bg-[#EFEBE9] transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Reservations */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-[#3E2723] mb-4">Mis Reservas</h2>
          {loading ? (
            <p className="text-[#8D6E63]">Cargando...</p>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#8D6E63] mb-4">No tienes reservas aún.</p>
              <Link
                href="/reservar"
                className="px-5 py-2 bg-[#6B2737] text-white rounded-full text-sm font-semibold hover:bg-[#8B3747] transition-colors"
              >
                Hacer una Reserva
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map(r => (
                <div key={r.id} className="border border-[#D7CCC8] rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-[#3E2723] capitalize">{formatDate(r.date)}</p>
                      <p className="text-[#8D6E63] text-sm">{r.time_start} - {r.time_end} · {r.party_size} personas</p>
                      {r.special_requests && (
                        <p className="text-[#8D6E63] text-sm mt-1">📝 {r.special_requests}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn('px-3 py-1 rounded-full text-xs font-medium', statusBadge[r.status] || statusBadge.pending)}>
                        {statusLabel[r.status] || r.status}
                      </span>
                      {canCancel(r.status) && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={cancelling === r.id}
                          className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors disabled:opacity-50"
                        >
                          {cancelling === r.id ? 'Cancelando...' : 'Cancelar Reserva'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}