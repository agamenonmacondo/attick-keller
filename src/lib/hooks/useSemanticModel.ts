'use client'

import { useState, useCallback } from 'react'

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

async function fetchOne(base: string, from: string, to: string) {
  const params = new URLSearchParams({ from, to })
  const res = await fetch(`${base}?${params}`, { credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error cargando datos' }))
    throw new Error(err.error || 'Error cargando datos')
  }
  return res.json()
}

export function useSemanticModel() {
  const [state, setState] = useState<SemanticModelState>({
    ...EMPTY,
    loading: false,
    error: null,
  })

  const fetchAll = useCallback(async (from: string, to: string) => {
    setLoading(true)
    setError(null)
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

    const results = await Promise.allSettled(
      endpoints.map(([, url]) => fetchOne(url, from, to)),
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

    function setLoading(v: boolean) {
      setState(s => ({ ...s, loading: v }))
    }
    function setError(e: string | null) {
      setState(s => ({ ...s, error: e }))
    }
  }, [])

  return { ...state, fetchAll }
}