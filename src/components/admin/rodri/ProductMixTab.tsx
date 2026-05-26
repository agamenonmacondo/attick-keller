'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import type { useRodriData } from '@/lib/hooks/useRodriData'
import { formatCOP } from '@/lib/hooks/useRodriData'

const COLORS = ['var(--color-ak-borgona)', 'var(--color-ak-verde)', 'var(--color-ak-dorado)', 'var(--color-ak-madera)', '#D4922A', 'var(--text-secondary)', 'var(--text-primary)', 'var(--border-default)', 'var(--bg-primary)', '#B8860B']

type Data = ReturnType<typeof useRodriData>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtTooltip = (v: any) => typeof v === 'number' ? formatCOP(v) : String(v ?? '')

export function ProductMixTab({ data }: { data: Data }) {
  const [monthIdx, setMonthIdx] = useState(data.productMix.length - 1)
  const pm = data.productMix[monthIdx]

  if (!pm) return <p className="text-[var(--text-secondary)]">Sin datos de product mix</p>

  // Accumulated categories
  const allCats: Record<string, { ventas: number; costo: number }> = {}
  data.productMix.forEach(m => {
    if (!m.productos) return
    for (const p of m.productos) {
      const g = p.grupo || 'Sin grupo'
      if (!allCats[g]) allCats[g] = { ventas: 0, costo: 0 }
      allCats[g].ventas += p.venta_total
      allCats[g].costo += p.costo_total
    }
  })
  const topCats = Object.entries(allCats)
    .sort((a, b) => b[1].ventas - a[1].ventas)
    .slice(0, 12)

  // Bar data per month
  const barData = data.productMix.map(m => ({
    mes: new Date(m.fecha).toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
    Ventas: m.total_ventas,
    Costo: m.total_costo,
  }))

  // Donut data for selected month
  const monthCats: Record<string, number> = {}
  if (pm.productos) {
    for (const p of pm.productos) {
      const g = p.grupo || 'Sin grupo'
      monthCats[g] = (monthCats[g] || 0) + p.venta_total
    }
  }
  const donutData = Object.entries(monthCats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }))

  // Top products
  const topProducts = [...(pm.productos || [])]
    .sort((a, b) => b.venta_total - a.venta_total)
    .slice(0, 20)

  // Category bar chart data
  const catBarData = topCats.map(([name, vals]) => ({
    categoria: name.length > 12 ? name.slice(0, 12) + '...' : name,
    Ventas: vals.ventas,
    Costo: vals.costo,
  }))

  return (
    <div>
      {/* Month selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {data.productMix.map((m, i) => (
          <button
            key={i}
            onClick={() => setMonthIdx(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              monthIdx === i
                ? 'bg-[var(--color-ak-borgona)] text-[var(--color-ak-dorado)]'
                : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-ak-borgona)]'
            }`}
          >
            {new Date(m.fecha).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
          </button>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Bar: Ventas vs Costo */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Ventas vs Costo por Mes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <XAxis dataKey="mes" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tickFormatter={v => v >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : ''} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip formatter={fmtTooltip} labelStyle={{ color: 'var(--text-primary)' }} />
              <Bar dataKey="Ventas" fill="var(--color-ak-borgona)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Costo" fill="#D4922A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut: Categories */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Ventas por Categoria</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40}>
                {donutData.map((_, i) => (
                  <Cell key={i} fill={['#6B2737','#5C7A4D','#C9A94E','#A0522D','#D4922A','#8D6E63','#3E2723','#D7CCC8','#B8860B','#F5EDE0'][i % 10]} />
                ))}
              </Pie>
              <Tooltip formatter={fmtTooltip} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Horizontal bar: Category margin */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4 mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Margen por Categoria (Acumulado)</h3>
        <ResponsiveContainer width="100%" height={Math.max(200, topCats.length * 28)}>
          <BarChart data={catBarData} layout="vertical">
            <XAxis type="number" tickFormatter={v => v >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : ''} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <YAxis type="category" dataKey="categoria" tick={{ fill: 'var(--text-primary)', fontSize: 11 }} width={100} />
            <Tooltip formatter={fmtTooltip} />
            <Bar dataKey="Ventas" fill="var(--color-ak-borgona)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="Costo" fill="#D4922A" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top products table */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Top 20 Productos — {new Date(pm.fecha).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase tracking-wide">#</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase tracking-wide">Producto</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase tracking-wide">Categoria</th>
              <th className="text-right py-2 px-2 text-xs text-[var(--text-secondary)] uppercase tracking-wide">Qty</th>
              <th className="text-right py-2 px-2 text-xs text-[var(--text-secondary)] uppercase tracking-wide">Venta Total</th>
              <th className="text-right py-2 px-2 text-xs text-[var(--text-secondary)] uppercase tracking-wide">Costo</th>
              <th className="text-right py-2 px-2 text-xs text-[var(--text-secondary)] uppercase tracking-wide">Margen</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p, i) => {
              const margen = p.venta_total > 0 ? ((p.venta_total - p.costo_total) / p.venta_total * 100) : 0
              return (
                <tr key={i} className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-hover)]/50">
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{i + 1}</td>
                  <td className="py-2 px-2 font-medium text-[var(--text-primary)]">{p.descripcion || p.clave}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{p.grupo}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{p.cantidad.toLocaleString('es-CO')}</td>
                  <td className="py-2 px-2 text-right tabular-nums font-medium text-[var(--text-primary)]">{formatCOP(p.venta_total)}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-[var(--text-secondary)]">{formatCOP(p.costo_total)}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[var(--border-default)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${margen}%`,
                            backgroundColor: margen > 70 ? '#5C7A4D' : margen > 50 ? '#D4922A' : '#6B2737',
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums">{margen.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}