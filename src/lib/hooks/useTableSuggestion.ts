'use client'

import { useState, useCallback } from 'react'
import type { AssignmentResult } from '@/lib/algorithms/table-assignment'

interface SuggestionState {
  loading: boolean
  result: AssignmentResult | null
  error: string | null
}

/**
 * Hook to fetch table assignment suggestions for a reservation.
 *
 * Usage:
 *   const { suggest, loading, result, error, clear } = useTableSuggestion()
 *   // Call suggest(reservationId) when host clicks an unassigned reservation
 *   // result contains suggested_table_id, alternatives, score, breakdown, reason
 *   // clear() resets the state when popover closes
 */
export function useTableSuggestion() {
  const [state, setState] = useState<SuggestionState>({
    loading: false,
    result: null,
    error: null,
  })

  const suggest = useCallback(async (reservationId: string) => {
    setState({ loading: true, result: null, error: null })
    try {
      const res = await fetch('/api/admin/table-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState({ loading: false, result: null, error: data.error || 'Error al obtener sugerencia' })
        return
      }
      setState({ loading: false, result: data as AssignmentResult, error: null })
    } catch {
      setState({ loading: false, result: null, error: 'Error de conexión' })
    }
  }, [])

  const clear = useCallback(() => {
    setState({ loading: false, result: null, error: null })
  }, [])

  return {
    ...state,
    suggest,
    clear,
  }
}