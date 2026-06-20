'use client'

import { useState, useEffect } from 'react'

export interface OpsCostData {
  periodo: {
    id: string
    periodo: string
    sede: string
    fecha_inicio: string
    fecha_fin: string
  }
  periodosDisponibles: { id: string; periodo: string; sede: string }[]
  empleados: number
  resumen: {
    totalDevengado: number
    totalNeto: number
    totalDeducciones: number
    totalProvisiones: number
    costoReal: number
    costoPorEmpleado: number
    netoPorEmpleado: number
  }
  composicion: {
    salarioDevengado: number
    auxilioTransporte: number
    recargosHERN: number
    propinas: number
    auxilioNoSalarial: number
  }
  deducciones: {
    saludEmpleado: number
    pensionEmpleado: number
    pagosRealizados: number
    prestamosConsumos: number
  }
  provisiones: {
    saludEmpleador: number
    pensionEmpleador: number
    arlEmpleador: number
    cajaEmpleador: number
    cesantiasEmpleador: number
    primaEmpleador: number
    vacacionesEmpleador: number
    total: number
  }
  heRecargos: {
    total: number
    count: number
  }
  novedades: {
    summary: Record<string, number>
    total: number
    detail: Array<{
      tipo: string
      empleado: string
      cargo: string
      dias: number | null
      observacion: string | null
    }>
  }
  propinas: {
    totalVentas: number
    prometidos100: number
    propinaParaRep: number
    diasLaborados: number
    valorDiaPropina: number
  } | null
  ventas: {
    revenue: number
    tips: number
    food: number
    drinks: number
    transactions: number
    ticketPromedio: number
  }
  ratios: {
    nominaDevenidoVsRevenue: number | null
    costoRealVsRevenue: number | null
    netoVsRevenue: number | null
    salarioVsRevenue: number | null
    provisionesVsRevenue: number | null
    propinasVsRevenue: number | null
    margenBruto: number | null
  }
}

export function useNominaOpsCosts(periodo?: string, sede = 'C75', enabled = true) {
  const [data, setData] = useState<OpsCostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (periodo) params.set('periodo', periodo)
    params.set('sede', sede)
    fetch(`/api/admin/nomina/ops-costs?${params.toString()}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error || 'Error cargando datos') }))
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [periodo, sede, enabled])

  return { data, loading, error }
}