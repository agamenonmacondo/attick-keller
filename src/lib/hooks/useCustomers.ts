'use client'

import { useState, useCallback, useEffect } from 'react'

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
}

interface CustomersResponse {
  customers: CustomerRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  error?: string
}

export function useCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<FetchOptions>({})

  const fetchCustomers = useCallback(async (opts: FetchOptions = {}) => {
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

      const query = params.toString()
      const res = await fetch('/api/admin/customers' + (query ? '?' + query : ''))

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

  useEffect(() => {
    fetchCustomers({ page: 1, limit: 25 })
  }, [fetchCustomers])

  return {
    customers, total, totalPages, currentPage, loading, error,
    fetchCustomers, applyFilters, goToPage,
  }
}