'use client'

import { useState, useCallback, useRef } from 'react'

export interface SemanticSummary {
  [key: string]: any
}

export interface SemanticModelState {
  nominaVsVentas: { data: any[]; summary: SemanticSummary } | null
  horasExtra: { data: any[]; summary: SemanticSummary } | null
  horasNocturnas: { data: any[]; summary: SemanticSummary } | null
  revenueVsTurnos: { data: any[]; summary: SemanticSummary } | null
  gapsCobertura: { data: any[]; summary: SemanticSummary } | null
  productividadArea: { data: any[]; summary: SemanticSummary } | null
  reservasVsVentas: { data: any[]; summary: SemanticSummary } | null
  loading: boolean
  error: string | null
}

const EMPTY: Omit<SemanticModelState, 'loading' | 'error'> = {
  nominaVsVentas: null,
  horasExtra: null,
  horasNocturnas: null,
  revenueVsTurnos: null,
  gapsCobertura: null,
  productividadArea: null,
  reservasVsVentas: null,
}

export function useSemanticModel() {
  const [state, setState] = useState<SemanticModelState>({
    ...EMPTY,
    loading: false,
    error: null,
  })

  const fetchingRef = useRef(false)

  const fetchAll = useCallback(async (from: string, to: string) => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    setState(s => ({ ...s, loading: true, error: null }))

    const root = '/api/admin/informes-rayo'
    const endpoints = [
      ['nominaVsVentas', `${root}/nomina-vs-ventas`],
      ['horasExtra', `${root}/horas-extra`],
      ['horasNocturnas', `${root}/horas-nocturnas`],
      ['revenueVsTurnos', `${root}/revenue-vs-turnos`],
      ['gapsCobertura', `${root}/gaps-cobertura`],
      ['productividadArea', `${root}/productividad-area`],
      ['reservasVsVentas', `${root}/reservas-vs-ventas`],
    ] as const

    try {
      const results = await Promise.allSettled(
        endpoints.map(([, url]) => {
          const params = new URLSearchParams({ from, to })
          return fetch(`${url}?${params}`, { credentials: 'include' })
            .then(async res => {
              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
                throw new Error(err.error || `HTTP ${res.status}`)
              }
              return res.json()
            })
        }),
      )

      const next = { ...EMPTY, loading: false, error: null } as SemanticModelState
      let firstError: string | null = null

      results.forEach((r, i) => {
        const key = endpoints[i][0]
        if (r.status === 'fulfilled') {
          ;(next as any)[key] = { data: r.value.data || [], summary: r.value.summary || {} }
        } else if (!firstError) {
          firstError = (r.reason as Error)?.message || 'Error cargando datos'
        }
      })

      next.error = firstError
      setState(next)
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: (err as Error)?.message || 'Error' }))
    } finally {
      fetchingRef.current = false
    }
  }, [])

  return { ...state, fetchAll }
}