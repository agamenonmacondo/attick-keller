import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// ── Helpers ──────────────────────────────────────────
function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

/** Parse interval string "HH:MM:SS" or "D days, HH:MM:SS" to total minutes */
function intervalToMinutes(val: string | null | undefined): number {
  if (!val) return 0
  let days = 0
  let timePart = val
  const dayMatch = val.match(/(\d+)\s*days?/i)
  if (dayMatch) {
    days = parseInt(dayMatch[1], 10)
    timePart = val.replace(/\d+\s*days?\s*,?\s*/i, '')
  }
  const parts = timePart.trim().split(':')
  const hours = parseInt(parts[0] || '0', 10)
  const minutes = parseInt(parts[1] || '0', 10)
  const seconds = parseInt(parts[2] || '0', 10)
  return (days * 24 * 60) + (hours * 60) + minutes + Math.round(seconds / 60)
}

/** Format minutes to "Hh Mm" */
function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Format minutes to hours with one decimal */
function formatHours(mins: number): string {
  const h = mins / 60
  if (h >= 100) return h.toFixed(0)
  return h.toFixed(1)
}

// ── Main handler ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const action = qparam(request, 'action') || 'summary'

  // ── Action: contable (new nómina contable) ──
  if (action === 'contable') {
    const periodo = qparam(request, 'periodo')
    const sede = qparam(request, 'sede')

    // Build query for periodos
    let periodoQuery = sb.from('nomina_periodos').select('*').order('fecha_inicio', { ascending: false })
    if (periodo) periodoQuery = periodoQuery.ilike('periodo', periodo)
    if (sede) periodoQuery = periodoQuery.eq('sede', sede)

    const { data: periodos, error: periodosError } = await periodoQuery
    if (periodosError) return NextResponse.json({ error: periodosError.message }, { status: 500 })

    if (!periodos || periodos.length === 0) {
      return NextResponse.json({ periodos: [], detalle: [], resumen: null })
    }

    // If specific periodo+sede requested, get detalle for that periodo
    if (periodo && sede) {
      const periodoObj = periodos[0]
      if (!periodoObj) return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 })

      // Get detalle with staff names
      const { data: detalle, error: detalleError } = await sb
        .from('nomina_detalle')
        .select('*, pos_nomina_staff(nombre_completo, cargo, cedula)')
        .eq('periodo_id', periodoObj.id)
        .eq('sede', sede)
        .order('neto_a_pagar', { ascending: false })

      if (detalleError) return NextResponse.json({ error: detalleError.message }, { status: 500 })

      // Flatten staff name into each row
      const flatDetalle = (detalle || []).map((d: any) => ({
        ...d,
        nombre_completo: d.pos_nomina_staff?.nombre_completo || 'Desconocido',
        cargo: d.pos_nomina_staff?.cargo || '',
        cedula: d.pos_nomina_staff?.cedula || '',
      }))

      // Calculated totals
      const resumen = {
        total_devengado: flatDetalle.reduce((s: number, d: any) => s + (Number(d.total_devengado) || 0), 0),
        total_deducciones: flatDetalle.reduce((s: number, d: any) => s + (Number(d.total_deducciones) || 0), 0),
        total_neto: flatDetalle.reduce((s: number, d: any) => s + (Number(d.neto_a_pagar) || 0), 0),
        total_propinas: flatDetalle.reduce((s: number, d: any) => s + (Number(d.propinas) || 0), 0),
        total_salario_devengado: flatDetalle.reduce((s: number, d: any) => s + (Number(d.salario_devengado) || 0), 0),
        total_salud: flatDetalle.reduce((s: number, d: any) => s + (Number(d.salud_empleado) || 0), 0),
        total_pension: flatDetalle.reduce((s: number, d: any) => s + (Number(d.pension_empleado) || 0), 0),
        total_auxilio_transporte: flatDetalle.reduce((s: number, d: any) => s + (Number(d.auxilio_transporte) || 0), 0),
        total_recargos: flatDetalle.reduce((s: number, d: any) => s + (Number(d.recargos_he_rn_rd) || 0), 0),
        total_pagos_realizados: flatDetalle.reduce((s: number, d: any) => s + (Number(d.pagos_realizados) || 0), 0),
        total_prestamos: flatDetalle.reduce((s: number, d: any) => s + (Number(d.prestamos_consumos) || 0), 0),
        empleados: flatDetalle.length,
      }

      // Get propinas summary for this periodo+sede
      const { data: propinasData } = await sb
        .from('nomina_propinas')
        .select('*')
        .eq('periodo_id', periodoObj.id)
        .eq('sede', sede)
        .single()

      return NextResponse.json({
        periodos,
        periodoSeleccionado: periodoObj,
        detalle: flatDetalle,
        resumen,
        propinas: propinasData,
      })
    }

    // If only periodo (no sede), return list of periodos for selection
    return NextResponse.json({
      periodos,
      detalle: [],
      resumen: null,
    })
  }

  // ── Action: staff_detail (original) ──
  if (action === 'staff_detail') {
    const staffId = qparam(request, 'staff_id')
    if (!staffId) return NextResponse.json({ error: 'staff_id requerido' }, { status: 400 })
    const from = qparam(request, 'from') || '2026-04-01'
    const to = qparam(request, 'to') || '2026-04-30'

    const [staffMember, staffDays] = await Promise.all([
      sb.from('pos_nomina_staff').select('*').eq('id', staffId).single(),
      sb.from('pos_nomina_daily').select('*').eq('staff_id', staffId).gte('fecha', from).lte('fecha', to).order('fecha'),
    ])

    if (staffMember.error) return NextResponse.json({ error: staffMember.error.message }, { status: 404 })

    const daily = staffDays.data || []

    // Aggregate totals for this staff member
    const totals = {
      ho: 0, hed: 0, hen: 0, hdd: 0, hdn: 0, rn: 0,
      totalHoras: 0, horasExtras: 0, dominicales: 0,
    }

    const dailyDetails = daily.map((d: any) => {
      const hoMins = intervalToMinutes(d.ho)
      const hedMins = intervalToMinutes(d.hed)
      const henMins = intervalToMinutes(d.hen)
      const hddMins = intervalToMinutes(d.hdd)
      const hdnMins = intervalToMinutes(d.hdn)
      const rnMins = intervalToMinutes(d.rn)
      const totalMins = intervalToMinutes(d.total_horas)

      totals.ho += hoMins
      totals.hed += hedMins
      totals.hen += henMins
      totals.hdd += hddMins
      totals.hdn += hdnMins
      totals.rn += rnMins
      totals.totalHoras += totalMins
      totals.horasExtras += (d.horas_extras || 0)
      if (d.es_dominical) totals.dominicales++

      return {
        fecha: d.fecha,
        hora_entrada: d.hora_entrada,
        hora_salida: d.hora_salida,
        total_horas: formatMinutes(totalMins),
        ho: formatMinutes(hoMins),
        hed: formatMinutes(hedMins),
        hen: formatMinutes(henMins),
        hdd: formatMinutes(hddMins),
        hdn: formatMinutes(hdnMins),
        rn: formatMinutes(rnMins),
        horas_extras: d.horas_extras || 0,
        es_dominical: d.es_dominical,
        cl75: d.cl75,
        shift_number: d.shift_number,
      }
    })

    // Group by weekday
    const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
    const byWeekDay: Record<string, { count: number; hoMins: number; totalMins: number }> = {}
    const seenDates = new Set<string>()

    for (const d of daily) {
      const dayName = weekDays[new Date(d.fecha + 'T12:00:00').getDay()]
      if (!byWeekDay[dayName]) byWeekDay[dayName] = { count: 0, hoMins: 0, totalMins: 0 }

      const dateKey = d.fecha
      if (!seenDates.has(dateKey)) {
        seenDates.add(dateKey)
        byWeekDay[dayName].count++
      }

      byWeekDay[dayName].hoMins += intervalToMinutes(d.ho)
      byWeekDay[dayName].totalMins += intervalToMinutes(d.total_horas)
    }

    // Get POS staff data if linked
    let posData = null
    if (staffMember.data.pos_staff_id) {
      const { data: posSales } = await sb
        .from('pos_sales')
        .select('total,propina,pos_staff_id')
        .eq('pos_staff_id', staffMember.data.pos_staff_id)
        .gte('fecha', from)
        .lte('fecha', to)

      if (posSales && posSales.length > 0) {
        const totalRevenue = posSales.reduce((s: number, r: any) => s + (r.total || 0), 0)
        const totalPropina = posSales.reduce((s: number, r: any) => s + (r.propina || 0), 0)
        const totalCheques = posSales.length
        posData = {
          totalRevenue,
          totalPropina,
          totalCheques,
          avgTicket: totalRevenue / totalCheques,
          productivity: totals.totalHoras > 0 ? (totalRevenue / (totals.totalHoras / 60)) : 0,
        }
      }
    }

    return NextResponse.json({
      staff: {
        id: staffMember.data.id,
        cedula: staffMember.data.cedula,
        nombre_completo: staffMember.data.nombre_completo,
        pos_staff_id: staffMember.data.pos_staff_id,
        es_medio_tiempo: staffMember.data.es_medio_tiempo,
      },
      totals: {
        diasTrabajados: seenDates.size,
        ho: formatMinutes(totals.ho),
        hed: formatMinutes(totals.hed),
        hen: formatMinutes(totals.hen),
        hdd: formatMinutes(totals.hdd),
        hdn: formatMinutes(totals.hdn),
        rn: formatMinutes(totals.rn),
        totalHoras: formatMinutes(totals.totalHoras),
        horasExtras: totals.horasExtras,
        dominicales: totals.dominicales,
        hoHours: formatHours(totals.ho),
        hedHours: formatHours(totals.hed),
        henHours: formatHours(totals.hen),
        hddHours: formatHours(totals.hdd),
        hdnHours: formatHours(totals.hdn),
        rnHours: formatHours(totals.rn),
        totalHours: formatHours(totals.totalHoras),
      },
      daily: dailyDetails,
      byWeekDay,
      posData,
    })
  }

  // ── Action: summary (default, original biometric) ──
  // Get available periodos from nomina_periodos for selector
  const { data: periodosDisponibles } = await sb
    .from('nomina_periodos')
    .select('id, periodo, sede, fecha_inicio, fecha_fin')
    .order('fecha_inicio', { ascending: false })

  const from = qparam(request, 'from') || '2026-04-01'
  const to = qparam(request, 'to') || '2026-04-30'

  const [staff, daily] = await Promise.all([
    sb.from('pos_nomina_staff').select('*').order('nombre_completo'),
    sb.from('pos_nomina_daily').select('*').gte('fecha', from).lte('fecha', to).order('fecha'),
  ])

  if (staff.error) return NextResponse.json({ error: staff.error.message }, { status: 500 })

  const staffList = staff.data || []
  const dailyData = daily.data || []

  // Group by staff
  const staffMap = new Map<string, {
    id: string
    cedula: string
    nombre_completo: string
    pos_staff_id: string | null
    es_medio_tiempo: boolean
    diasTrabajados: Set<string>
    hoMins: number
    hedMins: number
    henMins: number
    hddMins: number
    hdnMins: number
    rnMins: number
    totalMins: number
    horasExtras: number
    dominicales: number
  }>()

  for (const s of staffList) {
    staffMap.set(s.id, {
      id: s.id,
      cedula: s.cedula,
      nombre_completo: s.nombre_completo,
      pos_staff_id: s.pos_staff_id,
      es_medio_tiempo: s.es_medio_tiempo || false,
      diasTrabajados: new Set(),
      hoMins: 0, hedMins: 0, henMins: 0, hddMins: 0, hdnMins: 0, rnMins: 0,
      totalMins: 0, horasExtras: 0, dominicales: 0,
    })
  }

  let grandTotal = { ho: 0, hed: 0, hen: 0, hdd: 0, hdn: 0, rn: 0, total: 0, horasExtras: 0 }

  for (const d of dailyData) {
    const entry = staffMap.get(d.staff_id)
    if (!entry) continue

    entry.diasTrabajados.add(d.fecha)
    const hoMins = intervalToMinutes(d.ho)
    const hedMins = intervalToMinutes(d.hed)
    const henMins = intervalToMinutes(d.hen)
    const hddMins = intervalToMinutes(d.hdd)
    const hdnMins = intervalToMinutes(d.hdn)
    const rnMins = intervalToMinutes(d.rn)
    const totalMins = intervalToMinutes(d.total_horas)

    entry.hoMins += hoMins
    entry.hedMins += hedMins
    entry.henMins += henMins
    entry.hddMins += hddMins
    entry.hdnMins += hdnMins
    entry.rnMins += rnMins
    entry.totalMins += totalMins
    entry.horasExtras += (d.horas_extras || 0)
    if (d.es_dominical) entry.dominicales++

    grandTotal.ho += hoMins
    grandTotal.hed += hedMins
    grandTotal.hen += henMins
    grandTotal.hdd += hddMins
    grandTotal.hdn += hdnMins
    grandTotal.rn += rnMins
    grandTotal.total += totalMins
    grandTotal.horasExtras += (d.horas_extras || 0)
  }

  const result = Array.from(staffMap.values())
    .filter(s => s.diasTrabajados.size > 0)
    .sort((a, b) => b.totalMins - a.totalMins)
    .map(s => ({
      id: s.id,
      cedula: s.cedula,
      nombre_completo: s.nombre_completo,
      pos_staff_id: s.pos_staff_id,
      es_medio_tiempo: s.es_medio_tiempo,
      dias_trabajados: s.diasTrabajados.size,
      ho: formatMinutes(s.hoMins),
      hed: formatMinutes(s.hedMins),
      hen: formatMinutes(s.henMins),
      hdd: formatMinutes(s.hddMins),
      hdn: formatMinutes(s.hdnMins),
      rn: formatMinutes(s.rnMins),
      total_horas: formatMinutes(s.totalMins),
      horas_extras: s.horasExtras,
      dominicales: s.dominicales,
      hoHours: formatHours(s.hoMins),
      totalHours: formatHours(s.totalMins),
    }))

  const uniqueDates = new Set(dailyData.map((d: any) => d.fecha))
  const totalShifts = result.reduce((s, st) => s + st.dias_trabajados, 0)
  const avgShiftMins = grandTotal.total > 0 ? grandTotal.total / totalShifts : 0
  const pctExtras = grandTotal.total > 0
    ? ((grandTotal.hed + grandTotal.hen) / grandTotal.total * 100)
    : 0

  // Daily breakdown
  const dailyBreakdown: Record<string, { fecha: string; diaSemana: string; personas: number; horasTotal: number; horasPromedio: number }> = {}
  const weekDayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

  for (const d of dailyData) {
    if (!dailyBreakdown[d.fecha]) {
      const dayIdx = new Date(d.fecha + 'T12:00:00').getDay()
      dailyBreakdown[d.fecha] = {
        fecha: d.fecha,
        diaSemana: weekDayNames[dayIdx],
        personas: 0,
        horasTotal: 0,
        horasPromedio: 0,
      }
    }
  }

  const staffPerDate = new Map<string, Set<string>>()
  const hoursPerDate = new Map<string, number>()
  for (const d of dailyData) {
    if (!staffPerDate.has(d.fecha)) {
      staffPerDate.set(d.fecha, new Set())
      hoursPerDate.set(d.fecha, 0)
    }
    staffPerDate.get(d.fecha)!.add(d.staff_id)
    hoursPerDate.set(d.fecha, (hoursPerDate.get(d.fecha) || 0) + intervalToMinutes(d.total_horas))
  }

  const dailyBreakdownList = Object.keys(dailyBreakdown).sort().map(fecha => {
    const personas = staffPerDate.get(fecha)?.size || 0
    const horasTotal = hoursPerDate.get(fecha) || 0
    return {
      ...dailyBreakdown[fecha],
      personas,
      horasTotal: Math.round(horasTotal / 60 * 10) / 10,
      horasPromedio: personas > 0 ? Math.round((horasTotal / personas / 60) * 10) / 10 : 0,
    }
  })

  // Weekday aggregation
  const weekdayAvg: Record<string, { dia: string; avgPersonas: number; avgHoras: number; count: number }> = {}
  for (const db of dailyBreakdownList) {
    const dia = db.diaSemana
    if (!weekdayAvg[dia]) weekdayAvg[dia] = { dia, avgPersonas: 0, avgHoras: 0, count: 0 }
    weekdayAvg[dia].avgPersonas += db.personas
    weekdayAvg[dia].avgHoras += db.horasPromedio
    weekdayAvg[dia].count++
  }
  const weekdayAvgList = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
    .filter(d => weekdayAvg[d])
    .map(d => ({
      dia: d,
      avgPersonas: Math.round(weekdayAvg[d].avgPersonas / weekdayAvg[d].count * 10) / 10,
      avgHoras: Math.round(weekdayAvg[d].avgHoras / weekdayAvg[d].count * 10) / 10,
      count: weekdayAvg[d].count,
    }))

  return NextResponse.json({
    periodo: { from, to },
    periodosDisponibles: periodosDisponibles || [],
    resumen: {
      totalEmpleados: result.length,
      totalDiasRegistros: uniqueDates.size,
      totalHorasOrdinarias: formatHours(grandTotal.ho),
      totalHorasExtras: formatHours(grandTotal.hed + grandTotal.hen),
      totalHorasDominicales: formatHours(grandTotal.hdd + grandTotal.hdn),
      totalRecargoNocturno: formatHours(grandTotal.rn),
      totalHoras: formatHours(grandTotal.total),
      totalHorasExtrasCount: grandTotal.horasExtras,
      promedioTurno: formatMinutes(avgShiftMins),
      pctExtras: pctExtras.toFixed(1),
      hoMins: grandTotal.ho,
      hedMins: grandTotal.hed,
      henMins: grandTotal.hen,
      hddMins: grandTotal.hdd,
      hdnMins: grandTotal.hdn,
      rnMins: grandTotal.rn,
    },
    staff: result,
    dailyBreakdown: dailyBreakdownList,
    weekdayAvg: weekdayAvgList,
  })
}