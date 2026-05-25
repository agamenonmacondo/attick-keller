import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// ── Helpers ──────────────────────────────────────────
function qparam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key)
}

/** Parse interval string "HH:MM:SS" or "D days, HH:MM:SS" to total minutes */
function intervalToMinutes(val: string | null | undefined): number {
  if (!val) return 0
  // Handle "D days, HH:MM:SS" or just "HH:MM:SS"
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

  // ── Get all staff ──
  const { data: staff, error: staffError } = await sb
    .from('pos_nomina_staff')
    .select('id, cedula, nombre_completo, pos_staff_id, es_medio_tiempo')
    .order('nombre_completo')

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 500 })
  }

  // ── Get date range ──
  const from = qparam(request, 'from') || '2026-04-01'
  const to = qparam(request, 'from') ? (qparam(request, 'to') || from) : '2026-04-30'
  const staffId = qparam(request, 'staff_id')

  // ── Fetch daily records ──
  let dailyQuery = sb
    .from('pos_nomina_daily')
    .select('id, staff_id, fecha, hora_entrada, hora_salida, total_horas, ho, hed, hen, hdd, hdn, rn, recargo_dominical, horas_extras, cl75, es_dominical, shift_number')
    .gte('fecha', from)
    .lte('fecha', to)
    .order('fecha')

  if (staffId) {
    dailyQuery = dailyQuery.eq('staff_id', staffId)
  }

  const { data: daily, error: dailyError } = await dailyQuery
  if (dailyError) {
    return NextResponse.json({ error: dailyError.message }, { status: 500 })
  }

  // ── Action: staff detail ──
  if (action === 'staff_detail' && staffId) {
    const staffMember = staff.find((s: any) => s.id === staffId)
    if (!staffMember) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    const staffDays = daily.filter((d: any) => d.staff_id === staffId)

    // Calculate totals per type
    const totals = {
      ho: 0, hed: 0, hen: 0, hdd: 0, hdn: 0, rn: 0,
      totalHoras: 0, horasExtras: 0, diasTrabajados: new Set<string>().size,
      dominicales: 0,
    }

    const dailyDetails = staffDays.map((d: any) => {
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
      if (d.es_dominical || d.cl75) totals.dominicales++
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

    // Group by week
    const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
    const byWeekDay = staffDays.reduce((acc: Record<string, { count: number; hoMins: number; totalMins: number }>, d: any) => {
      const dayName = weekDays[new Date(d.fecha + 'T12:00:00').getDay()]
      if (!acc[dayName]) acc[dayName] = { count: 0, hoMins: 0, totalMins: 0 }
      acc[dayName].count++
      acc[dayName].hoMins += intervalToMinutes(d.ho)
      acc[dayName].totalMins += intervalToMinutes(d.total_horas)
      return acc
    }, {})

    // Get POS staff data if linked
    let posData = null
    if (staffMember.pos_staff_id) {
      const { data: posSales } = await sb
        .from('pos_sales')
        .select('revenue, propina, personas, pos_staff_id, sold_at')
        .eq('pos_staff_id', staffMember.pos_staff_id)
        .gte('sold_at', `${from}T00:00:00`)
        .lte('sold_at', `${to}T23:59:59`)

      if (posSales && posSales.length > 0) {
        const totalRevenue = posSales.reduce((s: number, r: any) => s + (r.revenue || 0), 0)
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
      staff: staffMember,
      totals: {
        diasTrabajados: new Set(staffDays.map((d: any) => d.fecha)).size,
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

  // ── Action: summary (default) ──
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

  for (const s of staff) {
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

  for (const d of daily) {
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

  const staffList = Array.from(staffMap.values())
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

  // Average shift length
  const totalShifts = daily.length
  const avgShiftMins = totalShifts > 0 ? grandTotal.total / totalShifts : 0

  // % extras
  const pctExtras = grandTotal.total > 0
    ? ((grandTotal.hed + grandTotal.hen) / grandTotal.total * 100)
    : 0

  return NextResponse.json({
    periodo: { from, to },
    resumen: {
      totalEmpleados: staffList.length,
      totalDiasRegistros: totalShifts,
      totalHorasOrdinarias: formatHours(grandTotal.ho),
      totalHorasExtras: formatHours(grandTotal.hed + grandTotal.hen),
      totalHorasDominicales: formatHours(grandTotal.hdd + grandTotal.hdn),
      totalRecargoNocturno: formatHours(grandTotal.rn),
      totalHoras: formatHours(grandTotal.total),
      totalHorasExtrasCount: grandTotal.horasExtras,
      promedioTurno: formatMinutes(avgShiftMins),
      pctExtras: pctExtras.toFixed(1),
      // Raw minutes for chart data
      hoMins: grandTotal.ho,
      hedMins: grandTotal.hed,
      henMins: grandTotal.hen,
      hddMins: grandTotal.hdd,
      hdnMins: grandTotal.hdn,
      rnMins: grandTotal.rn,
    },
    staff: staffList,
  })
}