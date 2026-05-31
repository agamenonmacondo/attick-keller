'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

interface CustomerRow {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  loyalty_tier: string
  total_visits: number
  total_spent: number
  last_visit_date: string | null
  created_at: string | null
  is_recurring: boolean
  tag_ids: string[]
  [key: string]: unknown
}

interface FetchOptions {
  page?: number
  limit?: number
  sort?: string
  order?: string
  q?: string
  tag_ids?: string
  has_email?: string
  min_visits?: number
  last_visit_days?: number
  visits_range?: string
  is_recurring?: string
  loyalty_tier?: string
}

interface CustomersResponse {
  customers: CustomerRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  error?: string
}

interface SegmentCounts {
  all: number
  nuevos: number
  ocasional: number
  frecuente: number
  habitual: number
  vip: number
}

interface QuickFilters {
  isRecurring: string | null
  tiers: string[]
  lastActivity: number | null
  hasEmail: string | null
}

const SEGMENT_VISITS_RANGES: Record<string, string> = {
  nuevos: '1-1',
  ocasional: '2-3',
  frecuente: '4-5',
  habitual: '6-10',
  vip: '11+',
}

export function useCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<FetchOptions>({})
  const [segmentCounts, setSegmentCounts] = useState<SegmentCounts | null>(null)
  const [activeSegment, setActiveSegment] = useState<string | null>(null)
  const [quickFilters, setQuickFilters] = useState<QuickFilters>({
    isRecurring: null,
    tiers: [],
    lastActivity: null,
    hasEmail: null,
  })
  const [perPage, setPerPage] = useState(50)

  const abortRef = useRef<AbortController | null>(null)

  const fetchWithAbort = useCallback(async (url: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const res = await fetch(url, { signal: controller.signal })
    return res
  }, [])

  const fetchCustomers = useCallback(async (opts: FetchOptions = {}) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setCurrentFilters(opts)
    try {
      const params = new URLSearchParams()
      if (opts.page) params.set('page', String(opts.page))
      if (opts.limit) params.set('limit', String(opts.limit))
      if (opts.sort) params.set('sort', opts.sort)
      if (opts.order) params.set('order', opts.order)
      if (opts.q) params.set('q', opts.q)
      if (opts.tag_ids) params.set('tag_ids', opts.tag_ids)
      if (opts.has_email) params.set('has_email', opts.has_email)
      if (opts.min_visits) params.set('min_visits', String(opts.min_visits))
      if (opts.last_visit_days) params.set('last_visit_days', String(opts.last_visit_days))
      if (opts.visits_range) params.set('visits_range', opts.visits_range)
      if (opts.is_recurring) params.set('is_recurring', opts.is_recurring)
      if (opts.loyalty_tier) params.set('loyalty_tier', opts.loyalty_tier)

      const query = params.toString()
      const res = await fetch('/api/admin/customers' + (query ? '?' + query : ''), {
        signal: controller.signal,
      })

      if (!res.ok) {
        let msg = `Error ${res.status}`
        try {
          const errData = await res.json()
          msg = errData.error || msg
        } catch {}
        setError(msg)
        setCustomers([])
        setTotal(0)
        setTotalPages(0)
        return
      }

      const d: CustomersResponse = await res.json()
      if (d.error) {
        setError(d.error)
        setCustomers([])
      } else {
        setCustomers(d.customers || [])
        setTotal(d.total)
        setTotalPages(d.totalPages)
        setCurrentPage(d.page)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Error de conexion')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const goToPage = useCallback((page: number) => {
    fetchCustomers({ ...currentFilters, page })
  }, [currentFilters, fetchCustomers])

  const applyFilters = useCallback((filters: FetchOptions) => {
    fetchCustomers({ ...filters, page: 1 })
  }, [fetchCustomers])

  const handleSetActiveSegment = useCallback((segment: string | null) => {
    setActiveSegment(segment)
    if (segment && segment !== 'all') {
      const visitsRange = SEGMENT_VISITS_RANGES[segment]
      fetchCustomers({ ...currentFilters, visits_range: visitsRange, page: 1 })
    } else {
      const { visits_range: _, ...rest } = currentFilters
      fetchCustomers({ ...rest, page: 1 })
    }
  }, [currentFilters, fetchCustomers])

  const handleSetQuickFilters = useCallback((qf: QuickFilters) => {
    setQuickFilters(qf)
    const newOpts: FetchOptions = { ...currentFilters, page: 1 }

    if (qf.isRecurring !== null) {
      newOpts.is_recurring = qf.isRecurring
    } else {
      delete newOpts.is_recurring
    }

    if (qf.tiers.length > 0) {
      newOpts.loyalty_tier = qf.tiers.join(',')
    } else {
      delete newOpts.loyalty_tier
    }

    if (qf.lastActivity !== null) {
      newOpts.last_visit_days = qf.lastActivity
    } else {
      delete newOpts.last_visit_days
    }

    if (qf.hasEmail !== null) {
      newOpts.has_email = qf.hasEmail
    } else {
      delete newOpts.has_email
    }

    fetchCustomers(newOpts)
  }, [currentFilters, fetchCustomers])

  const handleSetPerPage = useCallback((n: number) => {
    setPerPage(n)
    fetchCustomers({ ...currentFilters, limit: n, page: 1 })
  }, [currentFilters, fetchCustomers])

  // Fetch segment counts on mount
  useEffect(() => {
    let cancelled = false
    fetchWithAbort('/api/admin/customers/segment-counts')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data) setSegmentCounts(data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [fetchWithAbort])

  // Initial fetch
  useEffect(() => {
    fetchCustomers({ page: 1, limit: 50 })
  }, [fetchCustomers])

  return {
    customers, total, totalPages, currentPage, loading, error,
    segmentCounts, activeSegment, quickFilters, perPage,
    fetchCustomers, applyFilters, goToPage,
    setActiveSegment: handleSetActiveSegment,
    setQuickFilters: handleSetQuickFilters,
    setPerPage: handleSetPerPage,
  }
}
