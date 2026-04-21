'use client'

import { useState, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Spinner, MagnifyingGlass, User, CalendarBlank, Funnel } from '@phosphor-icons/react'
import { useCustomers } from '@/lib/hooks/useCustomers'
import { useCustomerDetail } from '@/lib/hooks/useCustomerDetail'
import { getLocalDate, addDays } from '@/lib/utils/formatDate'
import { AnimatedCard } from '../shared/AnimatedCard'
import { EmptyState } from '../shared/EmptyState'
import { TierBadge } from '../shared/TierBadge'
import { CustomerDetail } from './CustomerDetail'

type Tab = 'search' | 'date'

interface Preset {
  label: string
  getRange: () => { from: string; to: string }
}

const PRESETS: Preset[] = [
  { label: 'Hoy', getRange: () => {
    const today = getLocalDate()
    return { from: today, to: today }
  }},
  { label: 'Ayer', getRange: () => {
    const yesterday = addDays(getLocalDate(), -1)
    return { from: yesterday, to: yesterday }
  }},
  { label: 'Ultimos 7 dias', getRange: () => {
    const today = getLocalDate()
    return { from: addDays(today, -6), to: today }
  }},
  { label: 'Ultimos 30 dias', getRange: () => {
    const today = getLocalDate()
    return { from: addDays(today, -29), to: today }
  }},
]

function getMonthBounds(offsetMonths = 0) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + offsetMonths
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { from: getLocalDate(start), to: getLocalDate(end) }
}

export function CustomersPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('search')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Date filters
  const [dateField, setDateField] = useState('created_at')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { customers, loading, search: doSearch, refetch: refetchCustomers, fetchCustomers } = useCustomers()
  const { data: detail, loading: detailLoading, fetchCustomer, clear: clearDetail } = useCustomerDetail()

  const handleSearch = useCallback(() => {
    if (search.trim()) {
      doSearch(search.trim())
    } else {
      fetchCustomers({})
    }
  }, [search, doSearch, fetchCustomers])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }, [handleSearch])

  const selectCustomer = useCallback((id: string) => {
    setSelectedId(id)
    fetchCustomer(id)
  }, [fetchCustomer])

  const applyPreset = useCallback((preset: Preset) => {
    const { from: f, to: t } = preset.getRange()
    setFrom(f)
    setTo(t)
    fetchCustomers({ from: f, to: t, dateField })
  }, [dateField, fetchCustomers])

  const applyMonthPreset = useCallback((offset: number) => {
    const { from: f, to: t } = getMonthBounds(offset)
    setFrom(f)
    setTo(t)
    fetchCustomers({ from: f, to: t, dateField })
  }, [dateField, fetchCustomers])

  const applyCustomRange = useCallback(() => {
    if (from && to) {
      fetchCustomers({ from, to, dateField })
    }
  }, [from, to, dateField, fetchCustomers])

  const todayStr = useMemo(() => getLocalDate(), [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left: tabs + filters + list */}
      <div className="space-y-4">
        {/* Tabs */}
        <AnimatedCard delay={0} className="bg-white rounded-xl border border-[#D7CCC8] p-1">
          <div className="relative flex">
            <button
              type="button"
              onClick={() => { setActiveTab('search'); fetchCustomers({}) }}
              className={`relative flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                activeTab === 'search' ? 'text-[#3E2723]' : 'text-[#8D6E63] hover:text-[#3E2723]'
              }`}
            >
              {activeTab === 'search' && (
                <motion.div
                  layoutId="customers-tab"
                  className="absolute inset-0 rounded-lg bg-[#EFEBE9]"
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                <MagnifyingGlass size={14} /> Buscar
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('date'); fetchCustomers({}) }}
              className={`relative flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                activeTab === 'date' ? 'text-[#3E2723]' : 'text-[#8D6E63] hover:text-[#3E2723]'
              }`}
            >
              {activeTab === 'date' && (
                <motion.div
                  layoutId="customers-tab"
                  className="absolute inset-0 rounded-lg bg-[#EFEBE9]"
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                <CalendarBlank size={14} /> Por fecha
              </span>
            </button>
          </div>
        </AnimatedCard>

        {/* Filter panel */}
        {activeTab === 'search' && (
          <AnimatedCard delay={0.05} className="bg-white rounded-xl border border-[#D7CCC8] p-4">
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
                onClick={handleSearch}
                disabled={loading}
                className="rounded-lg bg-[#6B2737] px-4 py-2 text-sm font-medium text-white hover:bg-[#6B2737]/90 active:scale-[0.97] disabled:opacity-50"
                style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
              >
                Buscar
              </button>
            </div>
          </AnimatedCard>
        )}

        {activeTab === 'date' && (
          <AnimatedCard delay={0.05} className="bg-white rounded-xl border border-[#D7CCC8] p-4 space-y-4">
            {/* Date field selector */}
            <div className="flex rounded-lg border border-[#D7CCC8] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setDateField('created_at')
                  if (from && to) fetchCustomers({ from, to, dateField: 'created_at' })
                }}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  dateField === 'created_at'
                    ? 'bg-[#6B2737] text-white'
                    : 'bg-white text-[#8D6E63] hover:bg-[#EFEBE9]'
                }`}
              >
                Fecha de registro
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateField('last_visit_date')
                  if (from && to) fetchCustomers({ from, to, dateField: 'last_visit_date' })
                }}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  dateField === 'last_visit_date'
                    ? 'bg-[#6B2737] text-white'
                    : 'bg-white text-[#8D6E63] hover:bg-[#EFEBE9]'
                }`}
              >
                Ultima visita
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-1.5 text-xs font-medium text-[#3E2723] hover:bg-[#D7CCC8]/50 active:scale-[0.97]"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => applyMonthPreset(0)}
                className="rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-1.5 text-xs font-medium text-[#3E2723] hover:bg-[#D7CCC8]/50 active:scale-[0.97]"
                style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
              >
                Este mes
              </button>
              <button
                type="button"
                onClick={() => applyMonthPreset(-1)}
                className="rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-1.5 text-xs font-medium text-[#3E2723] hover:bg-[#D7CCC8]/50 active:scale-[0.97]"
                style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
              >
                Mes pasado
              </button>
            </div>

            {/* Custom range */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#8D6E63]">Rango personalizado</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={from}
                  max={todayStr}
                  onChange={(e) => setFrom(e.target.value)}
                  className="flex-1 rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-xs text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                />
                <span className="text-xs text-[#8D6E63]">a</span>
                <input
                  type="date"
                  value={to}
                  max={todayStr}
                  onChange={(e) => setTo(e.target.value)}
                  className="flex-1 rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-xs text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={applyCustomRange}
                  disabled={!from || !to || loading}
                  className="rounded-lg bg-[#6B2737] px-3 py-2 text-xs font-medium text-white hover:bg-[#6B2737]/90 active:scale-[0.97] disabled:opacity-50"
                  style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                >
                  <Funnel size={14} />
                </button>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Customer list */}
        {loading && customers.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Spinner size={24} className="animate-spin text-[#8D6E63]" />
          </div>
        )}
        {!loading && customers.length === 0 && (
          <EmptyState
            icon={<User size={32} />}
            title="Sin resultados"
            description={activeTab === 'date' ? 'Ningun cliente coincide con el rango de fechas.' : 'Busca por nombre o telefono para encontrar clientes.'}
          />
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
                  <div className="flex items-center gap-1.5 text-xs text-[#8D6E63]">
                    {c.phone && <span className="truncate">{c.phone}</span>}
                    {c.phone && c.email && <span className="text-[#D7CCC8]">·</span>}
                    {c.email && <span className="truncate">{c.email}</span>}
                    {!c.phone && !c.email && <span>—</span>}
                  </div>
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
          <CustomerDetail data={detail} onClose={() => { setSelectedId(null); clearDetail() }} onRefresh={refetchCustomers} />
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
