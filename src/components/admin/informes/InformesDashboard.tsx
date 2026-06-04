'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'

// ═══ Design System A&K ═══
const BORGONA = '#5D1528'
const DORADO = '#C9A94E'
const DORADO_LIGHT = '#E8D48B'
const OSCURO = '#1A0A10'
const CARD_BG = '#1A1215'
const CARD_BORDER = 'rgba(201,169,78,0.15)'
const GRIS = '#6B5B6E'
const BLANCO = '#FFFFFF'

const fmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

const fmtN = (n: number) => Math.round(n).toLocaleString('es-CO')

interface InformesDashboardProps {
  data: any
}

export function InformesDashboard({ data }: InformesDashboardProps) {
  const topProducts = useMemo(() => {
    if (!data?.topProducts?.length) return []
    return data.topProducts.slice(0, 10).map((p: any, i: number) => ({
      name: p.product_name?.length > 14 ? p.product_name.substring(0, 12) + '…' : p.product_name || `Prod ${i+1}`,
      ventas: p.total_revenue || p.revenue || 0,
      fill: i === 0 ? DORADO : i < 3 ? DORADO_LIGHT : '#8B7B6E',
    }))
  }, [data])

  const paymentMethods = useMemo(() => {
    if (!data?.payments?.length) return []
    const COLORS = [DORADO, BORGONA, '#8B7B6E', '#3E2723', '#A89070']
    return data.payments.map((p: any, i: number) => ({
      name: (p.method || p.payment_method || '').toLowerCase().replace('_', ' '),
      value: p.amount || p.total || 0,
      count: p.count || p.cheques || 0,
      pct: p.percentage || p.pct || 0,
      fill: COLORS[i % COLORS.length],
    }))
  }, [data])

  const zones = useMemo(() => {
    if (!data?.zones?.length) return []
    return data.zones.map((z: any) => ({
      name: z.zone_name || z.zone || z.derived_zone_name || 'Sin zona',
      ventas: z.total_revenue || z.revenue || 0,
      cheques: z.cheques || z.total_cheques || 0,
      ticket: z.avg_ticket || z.ticket_promedio || 0,
    }))
  }, [data])

  const kpis = data?.kpis || data || {}
  const revenue = kpis.total_revenue ?? kpis.revenue ?? 0
  const cheques = kpis.total_cheques ?? kpis.cheques ?? 0
  const ticket = kpis.ticket_promedio ?? kpis.avg_ticket ?? 0
  const personas = kpis.party_size_total ?? kpis.total_persons ?? kpis.personas ?? 0
  const propina = kpis.propina_total ?? kpis.tip_total ?? 0
  const propPerPerson = personas > 0 ? propina / personas : 0

  // Deltas
  const revDelta = kpis.revenue_delta ?? kpis.rev_change_pct ?? 0
  const cheqDelta = kpis.cheques_delta ?? kpis.cheques_change_pct ?? 0
  const tickDelta = kpis.ticket_delta ?? kpis.ticket_change_pct ?? 0
  const persDelta = kpis.persons_delta ?? kpis.persons_change_pct ?? 0
  const tipDelta = kpis.tip_delta ?? kpis.tip_change_pct ?? 0

  const DeltaBadge = ({ value }: { value: number }) => {
    if (!value) return null
    const isDown = value < 0
    return (
      <span className={`text-xs font-semibold ${isDown ? 'text-red-400' : 'text-emerald-400'}`}>
        {isDown ? '↓' : '↑'}{Math.abs(value).toFixed(1)}%
      </span>
    )
  }

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#1A1215] border border-[rgba(201,169,78,0.3)] rounded-lg px-3 py-2 shadow-xl">
        <p className="text-white text-sm font-medium">{payload[0].payload.name}</p>
        <p className="text-[#C9A94E] text-sm">{fmt(payload[0].value)}</p>
      </div>
    )
  }

  // Custom tooltip for pie
  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-[#1A1215] border border-[rgba(201,169,78,0.3)] rounded-lg px-3 py-2 shadow-xl">
        <p className="text-white text-sm font-medium capitalize">{d.name}</p>
        <p className="text-[#C9A94E] text-sm">{fmt(d.value)} · {Math.round(d.pct)}%</p>
      </div>
    )
  }

  const PieLabel = ({ name, pct }: any) => {
    if (pct < 3) return null
    return (
      <text fill="#fff" fontSize={11} textAnchor="middle" className="capitalize">
        {name} {Math.round(pct)}%
      </text>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Ventas', value: fmt(revenue), sub: `${fmtN(cheques)} cheques`, delta: revDelta },
          { label: 'Cheques', value: fmtN(cheques), sub: `${fmtN(personas)} personas`, delta: cheqDelta },
          { label: 'Ticket Prom.', value: fmt(ticket), sub: '', delta: tickDelta },
          { label: 'Personas', value: fmtN(personas), sub: '', delta: persDelta },
          { label: 'Propina', value: fmt(propina), sub: '', delta: tipDelta },
          { label: 'Prop/Persona', value: fmt(propPerPerson), sub: '', delta: 0 },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl p-4 border transition-all hover:scale-[1.02]"
            style={{ background: CARD_BG, borderColor: CARD_BORDER }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: GRIS }}>{kpi.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold" style={{ color: BLANCO }}>{kpi.value}</span>
              <DeltaBadge value={kpi.delta} />
            </div>
            {kpi.sub && <p className="text-xs mt-0.5" style={{ color: GRIS }}>{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Top Products Bar Chart */}
        <div
          className="lg:col-span-3 rounded-xl p-5 border"
          style={{ background: CARD_BG, borderColor: CARD_BORDER }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: DORADO }}>
            🏆 Top Productos
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fill: '#B0A0A8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="ventas" radius={[0, 4, 4, 0]} barSize={18}>
                {topProducts.map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods Donut */}
        <div
          className="lg:col-span-2 rounded-xl p-5 border"
          style={{ background: CARD_BG, borderColor: CARD_BORDER }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: DORADO }}>
            💳 Métodos de Pago
          </h3>
          {paymentMethods.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  labelLine={false}
                  label={PieLabel}
                >
                  {paymentMethods.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8" style={{ color: GRIS }}>Sin datos de pagos</p>
          )}
          {/* Legend */}
          <div className="mt-2 space-y-1">
            {paymentMethods.map((p: any) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
                  <span className="capitalize" style={{ color: '#B0A0A8' }}>{p.name}</span>
                </div>
                <span style={{ color: BLANCO }}>{fmt(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Zones Table ── */}
      {zones.length > 0 && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: CARD_BG, borderColor: CARD_BORDER }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: DORADO }}>
            📍 Por Zona
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: CARD_BORDER }}>
                  <th className="text-left py-2 font-medium" style={{ color: GRIS }}>Zona</th>
                  <th className="text-right py-2 font-medium" style={{ color: GRIS }}>Ventas</th>
                  <th className="text-right py-2 font-medium" style={{ color: GRIS }}>Cheques</th>
                  <th className="text-right py-2 font-medium" style={{ color: GRIS }}>Ticket Prom.</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z: any) => (
                  <tr key={z.name} className="border-b" style={{ borderColor: 'rgba(201,169,78,0.08)' }}>
                    <td className="py-2.5 font-medium" style={{ color: BLANCO }}>{z.name}</td>
                    <td className="text-right py-2.5" style={{ color: DORADO }}>{fmt(z.ventas)}</td>
                    <td className="text-right py-2.5" style={{ color: '#B0A0A8' }}>{fmtN(z.cheques)}</td>
                    <td className="text-right py-2.5" style={{ color: '#B0A0A8' }}>{fmt(z.ticket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}