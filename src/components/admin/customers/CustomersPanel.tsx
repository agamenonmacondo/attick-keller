'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Spinner, MagnifyingGlass, User } from '@phosphor-icons/react'
import { useCustomerDetail } from '@/lib/hooks/useCustomerDetail'
import { AnimatedCard } from '../shared/AnimatedCard'
import { TierBadge } from '../shared/TierBadge'
import { CustomerDetail } from './CustomerDetail'
import { CustomerNotes } from './CustomerNotes'

interface CustomerRow {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  loyalty_tier: string
  total_visits: number
  last_visit_date: string | null
  [key: string]: unknown
}

export function CustomersPanel() {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, loading: detailLoading, fetchCustomer, clear: clearDetail } = useCustomerDetail()

  const doSearch = useCallback(async () => {
    if (!search.trim()) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: search.trim() })
      const res = await fetch(`/api/admin/customers?${params}`)
      if (!res.ok) { setCustomers([]); return }
      const d = await res.json()
      setCustomers(d.customers || [])
    } catch { setCustomers([]) } finally { setLoading(false) }
  }, [search])

  const selectCustomer = useCallback((id: string) => {
    setSelectedId(id)
    fetchCustomer(id)
  }, [fetchCustomer])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch()
  }, [doSearch])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left: search + list */}
      <div className="space-y-4">
        <AnimatedCard delay={0} className="bg-white rounded-xl border border-[#D7CCC8] p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nombre o telefono..."
                className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] py-2 pl-9 pr-3 text-sm text-[#3E2723] placeholder:text-[#BCAAA4] focus:border-[#6B2737] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={doSearch}
              disabled={loading}
              className="rounded-lg bg-[#6B2737] px-4 py-2 text-sm font-medium text-white hover:bg-[#6B2737]/90 active:scale-[0.97] disabled:opacity-50"
              style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
            >
              Buscar
            </button>
          </div>
        </AnimatedCard>

        {/* Customer list */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Spinner size={24} className="animate-spin text-[#8D6E63]" />
          </div>
        )}
        {!loading && customers.length === 0 && search.trim() && (
          <p className="text-center text-sm text-[#8D6E63] py-8">Sin resultados</p>
        )}
        <AnimatePresence>
          {customers.map((c, i) => (
            <motion.button
              key={c.id}
              type="button"
              initial={{ opacity: 0, transform: 'translateY(8px)' }}
              animate={{ opacity: 1, transform: 'translateY(0)' }}
              transition={{ duration: 0.2, delay: i * 0.04, ease: 'easeOut' }}
              onClick={() => selectCustomer(c.id)}
              className={`w-full text-left rounded-xl border p-4 active:scale-[0.97] ${
                selectedId === c.id
                  ? 'border-[#6B2737] bg-[#6B2737]/5'
                  : 'border-[#D7CCC8] bg-white hover:border-[#BCAAA4]'
              }`}
              style={{ transition: 'transform 160ms ease-out, border-color 200ms ease-out, background-color 200ms ease-out' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFEBE9] text-[#6B2737]">
                  <User size={18} weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[#3E2723]">
                    {c.full_name || 'Sin nombre'}
                  </p>
                  <p className="truncate text-xs text-[#8D6E63]">
                    {c.phone || c.email || '\u2014'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <TierBadge tier={c.loyalty_tier} />
                  <span className="text-[10px] text-[#8D6E63]">{c.total_visits}v</span>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Right: detail panel */}
      <div className="md:col-span-2">
        {detailLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size={32} className="animate-spin text-[#8D6E63]" />
          </div>
        )}
        {detail && (
          <CustomerDetail data={detail} onClose={() => { setSelectedId(null); clearDetail() }} />
        )}
        {!detail && !detailLoading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#D7CCC8] bg-white/30 py-16 text-center">
            <div className="mb-3 text-[#BCAAA4]"><User size={32} /></div>
            <p className="text-sm font-medium text-[#3E2723]">Selecciona un cliente</p>
            <p className="mt-1 text-xs text-[#8D6E63]">Busca por nombre o telefono para ver sus detalles</p>
          </div>
        )}
      </div>
    </div>
  )
}