'use client'

import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User, Calendar, Clock, MapPin, SignOut, ArrowRight } from '@phosphor-icons/react'

interface Reservation {
  id: string
  date: string
  time_start: string
  party_size: number
  status: string
  special_requests: string | null
  table_zones?: { name: string }[] | null
}

export default function ProfileClient() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    fetchReservations()
  }, [user])

  const ensureCustomer = async (): Promise<string | null> => {
    if (!user) return null
    
    // Try to find existing customer
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    
    if (existing) return existing.id
    
    // Customer will be created by API on first reservation
    return null
  }

  const fetchReservations = async () => {
    if (!user) return
    setLoadingReservations(true)
    
    const customerId = await ensureCustomer()
    if (!customerId) {
      setLoadingReservations(false)
      return
    }

    const { data } = await supabase
      .from('reservations')
      .select('id, date, time_start, party_size, status, special_requests, table_zones(name)')
      .eq('customer_id', customerId)
      .order('date', { ascending: false })

    setReservations(data || [])
    setLoadingReservations(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F5EDE0]">
        <div className="animate-pulse text-[#3E2723]/50 font-['DM_Sans']">Cargando...</div>
      </div>
    )
  }

  if (!user) return null

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]
  const avatar = user.user_metadata?.avatar_url
  const email = user.email
  const phone = user.user_metadata?.phone || user.phone || ''

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    confirmed: 'bg-[#5C7A4D]/10 text-[#5C7A4D] border-[#5C7A4D]/20',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    completed: 'bg-[#3E2723]/10 text-[#3E2723] border-[#3E2723]/20',
    no_show: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada',
    no_show: 'No asistió',
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5EDE0]">
      <div className="max-w-2xl mx-auto px-4 py-8 pt-24">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border-2 border-[#3E2723]/10 p-6 mb-6">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img src={avatar} alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-[#C9A94E]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#6B2737] flex items-center justify-center">
                <User size={28} className="text-white" weight="fill" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#3E2723]">{name}</h1>
              {email && <p className="text-sm text-[#3E2723]/60 font-['DM_Sans']">{email}</p>}
              {phone && <p className="text-sm text-[#3E2723]/60 font-['DM_Sans']">{phone}</p>}
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => router.push('/reservar')}
              className="flex-1 bg-[#6B2737] text-white font-['DM_Sans'] font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#6B2737]/90 transition-colors"
            >
              <Calendar size={18} />
              Nueva Reserva
            </button>
            <button
              onClick={handleSignOut}
              className="bg-[#3E2723]/5 text-[#3E2723]/60 font-['DM_Sans'] py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#3E2723]/10 transition-colors"
            >
              <SignOut size={18} />
            </button>
          </div>
        </div>

        {/* Reservations */}
        <div className="mb-6">
          <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#3E2723] mb-4">Mis Reservas</h2>
          
          {loadingReservations ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl h-24 border-2 border-[#3E2723]/5" />
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-[#3E2723]/10 p-8 text-center">
              <Calendar size={40} className="mx-auto text-[#3E2723]/20 mb-3" />
              <p className="font-['DM_Sans'] text-[#3E2723]/60">No tienes reservas aún</p>
              <button
                onClick={() => router.push('/reservar')}
                className="mt-4 text-[#6B2737] font-['DM_Sans'] font-semibold flex items-center gap-1 mx-auto hover:underline"
              >
                Reservar mesa <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map(res => (
                <div key={res.id} className="bg-white rounded-xl border-2 border-[#3E2723]/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[#D4922A]" />
                      <span className="font-['DM_Sans'] font-semibold text-[#3E2723]">
                        {new Date(res.date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                    <span className={`text-xs font-['DM_Sans'] font-semibold px-2 py-1 rounded-full border ${statusColors[res.status] || statusColors.pending}`}>
                      {statusLabels[res.status] || res.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[#3E2723]/60 font-['DM_Sans']">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {res.time_start?.slice(0, 5)}
                    </span>
                    <span>{res.party_size} personas</span>
                    {res.table_zones?.[0]?.name && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {res.table_zones[0].name}
                      </span>
                    )}
                  </div>
                  {res.special_requests && (
                    <p className="text-xs text-[#3E2723]/40 mt-2 font-['DM_Sans'] italic">
                      {res.special_requests}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}