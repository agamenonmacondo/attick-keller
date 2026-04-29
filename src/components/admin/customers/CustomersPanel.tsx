'use client'

import { useState, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Users } from '@phosphor-icons/react'
import { useCustomers } from '@/lib/hooks/useCustomers'
import { useCustomerDetail } from '@/lib/hooks/useCustomerDetail'
import { useCustomerTags } from '@/lib/hooks/useCustomerTags'
import { CustomerFilters } from './CustomerFilters'
import { CustomerList } from './CustomerList'
import { CampaignComposer } from './CampaignComposer'
import { CustomerDetail } from './CustomerDetail'

export function CustomersPanel() {
  const { customers, total, totalPages, currentPage, loading, applyFilters, goToPage } = useCustomers()
  const { data: detail, loading: detailLoading, fetchCustomer, clear: clearDetail } = useCustomerDetail()
  const { tags, createTag } = useCustomerTags()

  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentFilters, setCurrentFilters] = useState({
    q: '', tag_ids: '', has_email: '', min_visits: 0, last_visit_days: 0,
  })

  const [selectingAll, setSelectingAll] = useState(false)

  const rightPanel = useMemo<'empty' | 'detail' | 'composer'>(() => {
    if (selectedIds.size > 0) return 'composer'
    if (activeCustomerId && detail) return 'detail'
    return 'empty'
  }, [selectedIds.size, activeCustomerId, detail])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      customers.forEach(c => next.add(c.id))
      return next
    })
  }, [customers])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleSelectAllFiltered = useCallback(async () => {
    setSelectingAll(true)
    try {
      const params = new URLSearchParams()
      if (currentFilters.q) params.set('q', currentFilters.q)
      if (currentFilters.tag_ids) params.set('tag_ids', currentFilters.tag_ids)
      if (currentFilters.has_email) params.set('has_email', currentFilters.has_email)
      if (currentFilters.min_visits) params.set('min_visits', String(currentFilters.min_visits))
      if (currentFilters.last_visit_days) params.set('last_visit_days', String(currentFilters.last_visit_days))

      const res = await fetch('/api/admin/customers/ids?' + params.toString())
      if (res.ok) {
        const d = await res.json()
        setSelectedIds(new Set(d.ids || []))
      }
    } finally {
      setSelectingAll(false)
    }
  }, [currentFilters])

  const handleCustomerClick = useCallback((id: string) => {
    setActiveCustomerId(id)
    fetchCustomer(id)
  }, [fetchCustomer])

  const handleApplyFilters = useCallback((filters: {
    q: string; tag_ids: string; has_email: string; min_visits: number; last_visit_days: number
  }) => {
    setCurrentFilters(filters)
    applyFilters(filters)
    clearSelection()
    clearDetail()
    setActiveCustomerId(null)
  }, [applyFilters, clearSelection, clearDetail])

  const handleSendCampaign = useCallback(async (data: {
    name: string; subject: string; bodyHtml: string
    filterTagIds: string[]; filterHasEmail: boolean
    filterMinVisits: number; filterLastVisitDays: number
  }) => {
    const res = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        subject: data.subject,
        body_html: data.bodyHtml,
        filter_tag_ids: data.filterTagIds,
        filter_has_email: data.filterHasEmail,
        filter_min_visits: data.filterMinVisits,
        filter_last_visit_days: data.filterLastVisitDays,
      }),
    })
    if (res.ok) {
      const d = await res.json()
      alert('Campana iniciada: ' + d.campaign.recipient_count + ' destinatarios')
      clearSelection()
    } else {
      const d = await res.json()
      alert(d.error || 'Error al enviar campana')
    }
  }, [clearSelection])

  const previewCustomer: { full_name: string | null; loyalty_tier: string } | null = detail
    ? { full_name: detail.customer.full_name, loyalty_tier: detail.stats?.loyalty_tier || 'bronze' }
    : customers[0]
      ? { full_name: customers[0].full_name, loyalty_tier: customers[0].loyalty_tier }
      : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_400px] gap-6">
      {/* Columna 1: Filtros */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-xl border border-[#D7CCC8] p-4 h-fit lg:sticky lg:top-24"
      >
        <CustomerFilters
          tags={tags}
          initialFilters={currentFilters}
          onApply={handleApplyFilters}
          onCreateTag={() => {
            const tagName = prompt('Nombre de la etiqueta:')
            if (tagName) createTag(tagName)
          }}
        />
      </motion.div>

      {/* Columna 2: Lista */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <CustomerList
          customers={customers}
          loading={loading}
          page={currentPage}
          total={total}
          totalPages={totalPages}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onPageChange={goToPage}
          onCustomerClick={handleCustomerClick}
          activeCustomerId={activeCustomerId}
          onSelectAllFiltered={handleSelectAllFiltered}
          selectingAll={selectingAll}
        />
      </motion.div>

      {/* Columna 3: Panel contextual */}
      <AnimatePresence mode="wait">
        {rightPanel === 'composer' && (
          <motion.div
            key="composer"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
            className="lg:h-[calc(100vh-12rem)] lg:sticky lg:top-24"
          >
            <CampaignComposer
              selectedCount={selectedIds.size}
              filterTagIds={currentFilters.tag_ids.split(',').filter(Boolean)}
              filterHasEmail={currentFilters.has_email}
              filterMinVisits={currentFilters.min_visits}
              filterLastVisitDays={currentFilters.last_visit_days}
              tags={tags}
              previewCustomer={previewCustomer}
              onSend={handleSendCampaign}
              onClose={clearSelection}
            />
          </motion.div>
        )}

        {rightPanel === 'detail' && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
          >
            <CustomerDetail
              data={detail!}
              onClose={() => { setActiveCustomerId(null); clearDetail() }}
              onRefresh={() => applyFilters(currentFilters)}
            />
          </motion.div>
        )}

        {rightPanel === 'empty' && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden lg:flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D7CCC8] bg-white/30 py-16 text-center min-h-[200px]"
          >
            <div className="mb-3 text-[#BCAAA4]"><Users size={36} /></div>
            <p className="text-sm font-medium text-[#3E2723]">Selecciona clientes</p>
            <p className="mt-1 text-xs text-[#8D6E63] max-w-[240px]">
              Usa los filtros y checkboxes para segmentar, luego crea una campana de email
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
