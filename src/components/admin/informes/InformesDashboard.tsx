'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'
import { Trophy, CreditCard, MapPin } from '@phosphor-icons/react'

// ═══ A&K Brand Colors (CSS vars auto-switch in dark mode) ═══
const CHART_DORADO = 'var(--color-ak-dorado)'
const CHART_DORADO_LIGHT = 'var(--color-ak-ambar)'
const CHART_BORGONA = 'var(--color-ak-borgona)'
const CHART_MADERA = 'var(--color-ak-madera)'
const CHART_NEUTRAL = 'var(--text-secondary)'

const BAR_COLORS = [CHART_DORADO, CHART_DORADO, CHART_DORADO, CHART_DORADO_LIGHT, CHART_DORADO_LIGHT, CHART_DORADO_LIGHT, CHART_NEUTRAL, CHART_NEUTRAL, CHART_NEUTRAL, CHART_NEUTRAL]
const PIE_COLORS = [CHART_DORADO, CHART_BORGONA, CHART_NEUTRAL, CHART_MADERA, 'var(--color-ak-ladrillo)']

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
      name: p.product_name?.length > 14 ? p.product_name.substring(0, 12) + '...' : p.product_name || `Prod ${i+1}`,
      ventas: p.total_revenue || p.revenue || 0,
      fill: BAR_COLORS[i] || CHART_NEUTRAL,
    }))
  }, [data])

  const paymentMethods = useMemo(() => {
    if (!data?.payments?.length) return []
    return data.payments.map((p: any, i: number) => ({
      name: (p.method || p.payment_method || '').toLowerCase().replace('_', ' '),
      value: p.amount || p.total || 0,
      count: p.count || p.cheques || 0,
      pct: p.percentage || p.pct || 0,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }))
  }, [data])

  const zones = useMemo(() => {
    if (!data?.zones?.length) return []
    return data.zones.map((z: any) => ({
      name: z.zone_name || z.zone || z.derived_zone_name || 'Sin zona',
      ventas: z.total_revenue || z.revenue || z.total_ventas || 0,
      cheques: z.cheques || z.total_cheques || 0,
      ticket: z.avg_ticket || z.ticket_promedio || (z.total_cheques > 0 ? Math.round(z.total_ventas / z.total_cheques) : 0),
    }))
  }, [data])

  const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-ak-dorado)', borderRadius: 8, padding: '8px 12px' }}>
        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{payload[0].payload.name}</p>
        <p style={{ color: 'var(--color-ak-dorado)', fontSize: 13 }}>{fmt(payload[0].value)}</p>
      </div>
    )
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-ak-dorado)', borderRadius: 8, padding: '8px 12px' }}>
        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{d.name}</p>
        <p style={{ color: 'var(--color-ak-dorado)', fontSize: 13 }}>{fmt(d.value)} · {Math.round(d.pct)}%</p>
      </div>
    )
  }

  const PieLabel = ({ name, pct }: any) => {
    if (pct < 5) return null
    return (
      <text fill="var(--text-primary)" fontSize={11} textAnchor="middle">
        {name} {Math.round(pct)}%
      </text>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Top Products Bar Chart */}
        <div
          className="lg:col-span-3 rounded-xl p-5 border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-ak-dorado)', opacity: 0.15 }}>
              <Trophy size={14} weight="fill" style={{ color: 'var(--color-ak-dorado)' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Top Productos</h3>
          </div>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
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
          ) : (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Sin datos de productos</p>
          )}
        </div>

        {/* Payment Methods Donut */}
        <div
          className="lg:col-span-2 rounded-xl p-5 border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-ak-borgona)', opacity: 0.15 }}>
              <CreditCard size={14} weight="fill" style={{ color: 'var(--color-ak-borgona)' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Metodos de Pago</h3>
          </div>
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
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Sin datos de pagos</p>
          )}
          {/* Legend */}
          <div className="mt-2 space-y-1.5">
            {paymentMethods.map((p: any) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
                  <span className="capitalize" style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                </div>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{fmt(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Zones Table ── */}
      {zones.length > 0 && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-ak-oliva)', opacity: 0.15 }}>
              <MapPin size={14} weight="fill" style={{ color: 'var(--color-ak-oliva)' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Por Zona</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th className="text-left py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Zona</th>
                  <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Ventas</th>
                  <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Cheques</th>
                  <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Ticket Prom.</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z: any) => (
                  <tr key={z.name} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td className="py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{z.name}</td>
                    <td className="text-right py-2.5" style={{ color: 'var(--color-ak-dorado)', fontWeight: 500 }}>{fmt(z.ventas)}</td>
                    <td className="text-right py-2.5" style={{ color: 'var(--text-secondary)' }}>{fmtN(z.cheques)}</td>
                    <td className="text-right py-2.5" style={{ color: 'var(--text-secondary)' }}>{fmt(z.ticket)}</td>
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