'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface Reservation {
  id: string
  date: string
  time_start: string
  time_end: string
  party_size: number
  status: string
  special_requests: string | null
  customer_id: string
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/reservations')
      .then(r => r.json())
      .then(data => {
        setReservations(data.reservations || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (authLoading) return <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center">Cargando...</div>
  if (!user) { router.push('/auth/login'); return null }

  const isAdmin = user?.app_metadata?.role === 'super_admin' || user?.user_metadata?.role === 'super_admin'
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center">
        <p className="text-[#8D6E63]">No tienes permisos de administrador.</p>
      </div>
    )
  }

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch('/api/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: id, status }),
    })
    if (res.ok) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
  }

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter)

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  }

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada',
  }

  const statusBadge: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="min-h-screen bg-[#F5EDE0] pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-['Playfair_Display'] text-4xl font-bold text-[#3E2723] mb-8">
          Panel de Administración
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'bg-[#3E2723] text-white' },
            { label: 'Pendientes', value: stats.pending, color: 'bg-yellow-600 text-white' },
            { label: 'Confirmadas', value: stats.confirmed, color: 'bg-green-700 text-white' },
            { label: 'Canceladas', value: stats.cancelled, color: 'bg-red-700 text-white' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-xl p-4 text-center', s.color)}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm opacity-90">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'pending', 'confirmed', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                filter === f
                  ? 'bg-[#6B2737] text-white'
                  : 'bg-white text-[#3E2723] hover:bg-[#D7CCC8]'
              )}
            >
              {f === 'all' ? 'Todas' : statusLabel[f] || f}
            </button>
          ))}
        </div>

        {/* Reservations list */}
        {loading ? (
          <p className="text-[#8D6E63]">Cargando reservas...</p>
        ) : (
          <div className="space-y-4">
            {filtered.map(r => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-[#3E2723]">{r.date}</p>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusBadge[r.status] || statusBadge.pending)}>
                        {statusLabel[r.status] || r.status}
                      </span>
                    </div>
                    <p className="text-[#8D6E63] text-sm">
                      {r.time_start} - {r.time_end} · {r.party_size} personas
                    </p>
                    {r.special_requests && (
                      <p className="text-[#8D6E63] text-sm mt-1">📝 {r.special_requests}</p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(r.id, 'confirmed')}
                        className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, 'cancelled')}
                        className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-[#8D6E63]">No hay reservas</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}