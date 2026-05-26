'use client'

import { useState, useEffect } from 'react'

export interface OpsCostData {
  periodo: {
    id: string
    periodo: string
    sede: string
    fecha_inicio: string
    fecha_fin: string
    total_devengado: number
    total_deducciones: number
    total_neto: number
  }
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

export function useNominaOpsCosts(periodo: string = 'ABRIL 2026') {
  const [data, setData] = useState<OpsCostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/nomina/ops-costs?periodo=${encodeURIComponent(periodo)}`)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [periodo])

  return { data, loading, error }
}