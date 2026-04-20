'use client'

import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Calendar, Users, Clock, SignOut, CheckCircle, XCircle, Warning, MapPin } from '@phosphor-icons/react'

interface Reservation {
  id: string
  date: string
  time_start: string
  time_end: string
  party_size: number
  status: string
  special_requests: string | null
  notes: string | null
  table_id: string | null
  tables?: { name: string }[] | null
  customers?: { full_name: string; phone: string; email: string }[] | null
}

export default function AdminClient() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const checkAdmin = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    if (error) {
      setIsAdmin(false)
      setCheckingRole(false)
      return
    }

    if (data && (data.role === 'super_admin' || data.role === 'store_admin')) {
      setIsAdmin(true)
      fetchReservations()
    } else {
      setIsAdmin(false)
    }
    setCheckingRole(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    checkAdmin()
  }, [user, checkAdmin])

  const fetchReservations = async () => {
    setLoadingData(true)
    const { data, error } = await supabase
      .from('reservations')
      .select('id, date, time_start, time_end, party_size, status, special_requests, notes, table_id, tables(name), customers(full_name, phone, email)')
      .order('date', { ascending: false })

    if (error) {
      console.error('Failed to fetch reservations:', error.message)
    }
    setReservations(data || [])
    setLoadingData(false)
  }

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    const r = await fetch('/api/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })

    if (r.ok) {
      setReservations(prev => prev.map(res => res.id === id ? { ...res, status: newStatus } : res))
    } else {
      const err = await r.json().catch(() => ({ error: 'Update failed' }))
      alert(err.error || 'Error al actualizar el estado')
    }
    setUpdatingId(null)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading || checkingRole) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F5EDE0]">
        <div className="animate-pulse text-[#3E2723]/50">Cargando...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F5EDE0]">
        <div className="text-center">
          <p className="font-['Playfair_Display'] text-2xl text-[#3E2723]">Acceso restringido</p>
          <p className="text-[#3E2723]/60 mt-2">Solo administradores pueden ver esta página</p>
          <button onClick={() => router.push('/')} className="mt-4 text-[#6B2737] font-semibold hover:underline">Volver al inicio</button>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-[#5C7A4D]/10 text-[#5C7A4D]',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-[#3E2723]/10 text-[#3E2723]',
    no_show: 'bg-gray-200 text-gray-600',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada',
    no_show: 'No asistió',
  }

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter)

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    today: reservations.filter(r => r.date === new Date().toISOString().split('T')[0]).length,
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5EDE0]">
      <div className="max-w-5xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Playfair_Display'] text-3xl font-bold text-[#3E2723]">Admin Panel</h1>
            <p className="text-[#3E2723]/60 font-['DM_Sans']">Attick & Keller</p>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-[#3E2723]/60 hover:text-[#3E2723]">
            <SignOut size={18} /> Salir
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: Calendar, color: 'text-[#6B2737]' },
            { label: 'Pendientes', value: stats.pending, icon: Warning, color: 'text-[#D4922A]' },
            { label: 'Confirmadas', value: stats.confirmed, icon: CheckCircle, color: 'text-[#5C7A4D]' },
            { label: 'Hoy', value: stats.today, icon: Clock, color: 'text-[#A0522D]' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border-2 border-[#3E2723]/10 p-4">
              <stat.icon size={20} className={stat.color} weight="fill" />
              <p className="mt-2 font-['DM_Sans'] text-2xl font-bold text-[#3E2723]">{stat.value}</p>
              <p className="text-sm text-[#3E2723]/50 font-['DM_Sans']">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-['DM_Sans'] font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-[#6B2737] text-[#F5EDE0]' : 'bg-white text-[#3E2723]/60 border border-[#3E2723]/10'
              }`}
            >
              {f === 'all' ? 'Todas' : statusLabels[f] || f}
            </button>
          ))}
        </div>

        {/* Reservations list */}
        {loadingData ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl h-28 border-2 border-[#3E2723]/5" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-[#3E2723]/10 p-8 text-center">
            <Calendar size={40} className="mx-auto text-[#3E2723]/20 mb-3" />
            <p className="font-['DM_Sans'] text-[#3E2723]/60">No hay reservas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(res => (
              <div key={res.id} className="bg-white rounded-xl border-2 border-[#3E2723]/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-[#D4922A]" />
                    <span className="font-['DM_Sans'] font-semibold text-[#3E2723]">
                      {new Date(res.date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' })}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-['DM_Sans'] font-semibold ${statusColors[res.status] || ''}`}>
                      {statusLabels[res.status] || res.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-[#3E2723]/60 font-['DM_Sans'] mb-3">
                  <span className="flex items-center gap-1"><Clock size={14} /> {res.time_start?.slice(0,5)} - {res.time_end?.slice(0,5)}</span>
                  <span className="flex items-center gap-1"><Users size={14} /> {res.party_size} personas</span>
                  {res.tables?.[0]?.name ? (
                    <span className="flex items-center gap-1"><MapPin size={14} /> {res.tables[0].name}</span>
                  ) : null}
                </div>

                {res.customers && res.customers[0] && (
                  <div className="text-sm font-['DM_Sans'] text-[#3E2723]/80 mb-3">
                    <span className="font-semibold">{res.customers[0].full_name}</span>
                    {' · '}
                    <span>{res.customers[0].phone}</span>
                    {res.customers[0].email && (
                      <>
                        {' · '}
                        <span>{res.customers[0].email}</span>
                      </>
                    )}
                  </div>
                )}

                {res.special_requests && (
                  <p className="text-xs text-[#3E2723]/40 font-['DM_Sans'] italic mb-3">"{res.special_requests}"</p>
                )}

                {/* Actions */}
                {res.status === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateStatus(res.id, 'confirmed')}
                      disabled={updatingId === res.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#5C7A4D]/10 text-[#5C7A4D] text-sm font-semibold font-['DM_Sans'] hover:bg-[#5C7A4D]/20 transition-colors disabled:opacity-50"
                    >
                      {updatingId === res.id ? <div className="h-3 w-3 animate-spin rounded-full border border-[#5C7A4D] border-t-transparent" /> : <CheckCircle size={14} />}
                      Confirmar
                    </button>
                    <button
                      onClick={() => updateStatus(res.id, 'cancelled')}
                      disabled={updatingId === res.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-semibold font-['DM_Sans'] hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} /> Cancelar
                    </button>
                  </div>
                )}

                {res.status === 'confirmed' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateStatus(res.id, 'completed')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#3E2723]/10 text-[#3E2723] text-sm font-semibold font-['DM_Sans'] hover:bg-[#3E2723]/20 transition-colors"
                    >
                      <CheckCircle size={14} /> Marcar completada
                    </button>
                    <button
                      onClick={() => updateStatus(res.id, 'no_show')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold font-['DM_Sans'] hover:bg-gray-200 transition-colors"
                    >
                      <XCircle size={14} /> No asistió
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}