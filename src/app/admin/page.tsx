'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'

const ADMIN_EMAILS = ['agamenonmacondo@gmail.com', 'rayo.abb@gmail.com']

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState<any[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [fetching, setFetching] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user && !ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
      router.push('/perfil')
    }
  }, [user, router])

  useEffect(() => {
    if (!user) return
    setFetching(true)
    fetch(`/api/reservations?date=${date}`)
      .then(r => r.json())
      .then(data => setReservations(data.reservations || []))
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [user, date])

  if (loading) return <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center text-[#8D6E63]">Cargando...</div>
  if (!user) { router.push('/auth/login'); return null }

  const handleStatus = async (id: string, status: string) => {
    setActionLoading(id)
    if (status === 'cancelled') {
      await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: id, status }),
      })
      setReservations(prev => prev.filter(r => r.id !== id))
    } else {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: id, status }),
      })
      if (res.ok) {
        setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      }
    }
    setActionLoading(null)
  }

  return (
    <div className="min-h-screen bg-[#F5EDE0] pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-['Playfair_Display'] text-3xl font-bold text-[#3E2723]">Admin</h1>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#8D6E63]/30 bg-white text-[#3E2723] text-sm"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: reservations.length, color: 'text-[#3E2723]' },
            { label: 'Pendientes', value: reservations.filter((r: any) => r.status === 'pending').length, color: 'text-amber-700' },
            { label: 'Confirmadas', value: reservations.filter((r: any) => r.status === 'confirmed').length, color: 'text-[#5C7A4D]' },
            { label: 'Personas', value: reservations.reduce((s: number, r: any) => s + r.party_size, 0), color: 'text-[#D4922A]' },
          ].map(s => (
            <div key={s.label} className="bg-white/70 rounded-xl p-4 text-center">
              <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[#8D6E63]">{s.label}</p>
            </div>
          ))}
        </div>

        {fetching ? (
          <p className="text-center text-[#8D6E63]">Cargando reservas...</p>
        ) : reservations.length === 0 ? (
          <p className="text-center text-[#8D6E63] py-8">No hay reservas para esta fecha</p>
        ) : (
          <div className="space-y-3">
            {reservations.map((r: any) => (
              <div key={r.id} className="bg-white/70 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      r.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      r.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {r.status === 'pending' ? 'Pendiente' : r.status === 'confirmed' ? 'Confirmada' : r.status === 'completed' ? 'Completada' : r.status}
                    </span>
                  </div>
                  <p className="font-medium text-[#3E2723]">
                    {r.customers?.full_name || r.customers?.email || 'Sin nombre'}
                  </p>
                  <p className="text-sm text-[#8D6E63]">
                    {r.time_start} - {r.time_end} · {r.party_size} personas
                  </p>
                  {r.special_requests && (
                    <p className="text-xs text-[#8D6E63] mt-1">{r.special_requests}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {r.status === 'pending' && (
                    <button onClick={() => handleStatus(r.id, 'confirmed')} disabled={actionLoading === r.id}
                      className="text-xs px-3 py-1.5 bg-[#5C7A4D] text-white rounded-full hover:bg-[#4d6a3e] disabled:opacity-50">
                      Confirmar
                    </button>
                  )}
                  {r.status === 'confirmed' && (
                    <button onClick={() => handleStatus(r.id, 'completed')} disabled={actionLoading === r.id}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50">
                      Completar
                    </button>
                  )}
                  {(r.status === 'pending' || r.status === 'confirmed') && (
                    <button onClick={() => handleStatus(r.id, 'cancelled')} disabled={actionLoading === r.id}
                      className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50">
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/" className="text-sm text-[#8D6E63] hover:text-[#6B2737]">← Volver al inicio</a>
        </div>
      </div>
    </div>
  )
}