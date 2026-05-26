import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const periodo = request.nextUrl.searchParams.get('periodo') || 'ABRIL 2026'

  try {
    // 1. Nomina periodo C75
    const { data: periodoData, error: pErr } = await sb
      .from('nomina_periodos')
      .select('*')
      .eq('periodo', periodo)
      .eq('sede', 'C75')
      .single()
    if (pErr) throw pErr

    const periodoId = periodoData.id

    // 2. Detalle C75
    const { data: detalle, error: dErr } = await sb
      .from('nomina_detalle')
      .select('*')
      .eq('periodo_id', periodoId)
      .eq('sede', 'C75')
    if (dErr) throw dErr

    // 3. Provisiones C75
    const { data: provisiones, error: provErr } = await sb
      .from('nomina_provisiones')
      .select('*')
      .eq('periodo_id', periodoId)
      .eq('sede', 'C75')
    if (provErr) throw provErr

    // 4. HE y Recargos C75
    const { data: heRecargos, error: heErr } = await sb
      .from('nomina_he_recargos')
      .select('*')
      .eq('periodo_id', periodoId)
      .eq('sede', 'C75')
    if (heErr) throw heErr

    // 5. Novedades C75
    const { data: novedades, error: nErr } = await sb
      .from('nomina_novedades')
      .select('*, staff:pos_nomina_staff(nombre_completo, cargo)')
      .eq('periodo_id', periodoId)
      .eq('sede', 'C75')
    if (nErr) throw nErr

    // 6. Propinas C75
    const { data: propinas, error: propErr } = await sb
      .from('nomina_propinas')
      .select('*')
      .eq('periodo_id', periodoId)
      .eq('sede', 'C75')
      .single()
    if (propErr && propErr.code !== 'PGRST116') throw propErr

    // 7. POS Revenue for the period's month
    // periodo: "ABRIL 2026" → dates: 2026-04-01 to 2026-04-30
    const periodoDateMap: Record<string, { from: string; to: string }> = {
      'ABRIL 2026': { from: '2026-04-01', to: '2026-04-30' },
      'MAYO 2026': { from: '2026-05-01', to: '2026-05-31' },
    }
    const dateRange = periodoDateMap[periodo] || { from: '2026-05-01', to: '2026-05-31' }

    const { data: posData, error: posErr } = await sb
      .from('pos_sales')
      .select('total, tip_amount, food_total, drinks_total, party_size')
      .gte('created_at', dateRange.from)
      .lt('created_at', dateRange.to + 'T23:59:59')
      .eq('is_paid', true)
      .eq('is_cancelled', false)

    const posRevenue = posData?.reduce((s: number, r: any) => s + (r.total || 0), 0) || 0
    const posTips = posData?.reduce((s: number, r: any) => s + (r.tip_amount || 0), 0) || 0
    const posFood = posData?.reduce((s: number, r: any) => s + (r.food_total || 0), 0) || 0
    const posDrinks = posData?.reduce((s: number, r: any) => s + (r.drinks_total || 0), 0) || 0
    const posTransactions = posData?.length || 0

    // ── Calculate summary ──
    const empleados = detalle?.length || 0
    const totalDevengado = detalle?.reduce((s: number, d: any) => s + (d.total_devengado || 0), 0) || 0
    const totalNeto = detalle?.reduce((s: number, d: any) => s + (d.neto_a_pagar || 0), 0) || 0
    const totalDeducciones = detalle?.reduce((s: number, d: any) => s + (d.total_deducciones || 0), 0) || 0

    const salarioDev = detalle?.reduce((s: number, d: any) => s + (d.salario_devengado || 0), 0) || 0
    const auxTransporte = detalle?.reduce((s: number, d: any) => s + (d.auxilio_transporte || 0), 0) || 0
    const recargos = detalle?.reduce((s: number, d: any) => s + (d.recargos_he_rn_rd || 0), 0) || 0
    const propinasDev = detalle?.reduce((s: number, d: any) => s + (d.propinas || 0), 0) || 0
    const auxNoSalarial = detalle?.reduce((s: number, d: any) => s + (d.auxilio_no_salarial || 0), 0) || 0

    const saludEmp = detalle?.reduce((s: number, d: any) => s + (d.salud_empleado || 0), 0) || 0
    const pensionEmp = detalle?.reduce((s: number, d: any) => s + (d.pension_empleado || 0), 0) || 0
    const pagosRealizados = detalle?.reduce((s: number, d: any) => s + (d.pagos_realizados || 0), 0) || 0
    const prestamos = detalle?.reduce((s: number, d: any) => s + (d.prestamos_consumos || 0), 0) || 0

    const totalProvisiones = provisiones?.reduce((s: number, p: any) => s + (p.total_provision_empleador || 0), 0) || 0
    const provSalud = provisiones?.reduce((s: number, p: any) => s + (p.salud_empleador || 0), 0) || 0
    const provPension = provisiones?.reduce((s: number, p: any) => s + (p.pension_empleador || 0), 0) || 0
    const provArl = provisiones?.reduce((s: number, p: any) => s + (p.arl_empleador || 0), 0) || 0
    const provCaja = provisiones?.reduce((s: number, p: any) => s + (p.caja_empleador || 0), 0) || 0
    const provCesantias = provisiones?.reduce((s: number, p: any) => s + (p.cesantias_empleador || 0), 0) || 0
    const provPrima = provisiones?.reduce((s: number, p: any) => s + (p.prima_empleador || 0), 0) || 0
    const provVacaciones = provisiones?.reduce((s: number, p: any) => s + (p.vacaciones_empleador || 0), 0) || 0

    const totalHERecargos = heRecargos?.reduce((s: number, h: any) => s + (h.total_recargos || 0), 0) || 0

    const novedadesSummary = novedades?.reduce((acc: Record<string, number>, n: any) => {
      const tipo = n.tipo || 'OTRO'
      acc[tipo] = (acc[tipo] || 0) + 1
      return acc
    }, {})

    const costoReal = totalDevengado + totalProvisiones

    // ── Ratios Nómina/Ventas ──
    const ratios = {
      nominaDevenidoVsRevenue: posRevenue > 0 ? (totalDevengado / posRevenue) * 100 : null,
      costoRealVsRevenue: posRevenue > 0 ? (costoReal / posRevenue) * 100 : null,
      netoVsRevenue: posRevenue > 0 ? (totalNeto / posRevenue) * 100 : null,
      salarioVsRevenue: posRevenue > 0 ? (salarioDev / posRevenue) * 100 : null,
      provisionesVsRevenue: posRevenue > 0 ? (totalProvisiones / posRevenue) * 100 : null,
      propinasVsRevenue: posRevenue > 0 ? (propinasDev / posRevenue) * 100 : null,
      margenBruto: posRevenue > 0 ? ((posRevenue - costoReal) / posRevenue) * 100 : null,
    }

    return NextResponse.json({
      periodo: periodoData,
      empleados,
      resumen: {
        totalDevengado,
        totalNeto,
        totalDeducciones,
        totalProvisiones,
        costoReal,
        costoPorEmpleado: empleados > 0 ? costoReal / empleados : 0,
        netoPorEmpleado: empleados > 0 ? totalNeto / empleados : 0,
      },
      composicion: {
        salarioDevengado: salarioDev,
        auxilioTransporte: auxTransporte,
        recargosHERN: recargos,
        propinas: propinasDev,
        auxilioNoSalarial: auxNoSalarial,
      },
      deducciones: {
        saludEmpleado: saludEmp,
        pensionEmpleado: pensionEmp,
        pagosRealizados,
        prestamosConsumos: prestamos,
      },
      provisiones: {
        saludEmpleador: provSalud,
        pensionEmpleador: provPension,
        arlEmpleador: provArl,
        cajaEmpleador: provCaja,
        cesantiasEmpleador: provCesantias,
        primaEmpleador: provPrima,
        vacacionesEmpleador: provVacaciones,
        total: totalProvisiones,
      },
      heRecargos: {
        total: totalHERecargos,
        count: heRecargos?.length || 0,
      },
      novedades: {
        summary: novedadesSummary,
        total: novedades?.length || 0,
        detail: novedades?.map((n: any) => ({
          tipo: n.tipo,
          empleado: n.staff?.nombre_completo || n.staff_id,
          cargo: n.staff?.cargo || '',
          dias: n.dias,
          observacion: n.observacion,
        })),
      },
      propinas: propinas ? {
        totalVentas: propinas.total_propinas_ventas,
        prometidos100: propinas.prometidos_100_pct,
        propinaParaRep: propinas.propina_para_rep,
        diasLaborados: propinas.dias_laborados_total,
        valorDiaPropina: propinas.valor_dia_propina,
      } : null,
      ventas: {
        revenue: posRevenue,
        tips: posTips,
        food: posFood,
        drinks: posDrinks,
        transactions: posTransactions,
        ticketPromedio: posTransactions > 0 ? posRevenue / posTransactions : 0,
      },
      ratios,
    })
  } catch (e: any) {
    console.error('Error in nomina ops-costs:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}