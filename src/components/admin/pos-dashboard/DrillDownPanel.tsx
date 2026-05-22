'use client'

import { useState } from 'react'
import { X, Spinner } from '@phosphor-icons/react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCOPDisplay } from './KPICard'
import type { DrillDownState, DrillDownData } from '@/lib/hooks/usePOSDashboard'

// ── Format helpers ──────────────────────────────────────────
function formatHourShort(h: number): string {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

function formatShortDate(d: string): string {
  const dt = new Date(d + 'T12:00:00')
  const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
  return `${days[dt.getDay()]} ${dt.getDate()}`
}

// ── Mini tooltip ────────────────────────────────────────────
interface TTProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string | number
  formatLabel?: (l: string | number) => string
}

function MiniTooltip({ active, payload, label, formatLabel }: TTProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 shadow-lg text-[10px]">
      <p className="font-medium text-[var(--text-primary)]">
        {formatLabel ? formatLabel(label ?? '') : label}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="text-[var(--text-secondary)]">
          {p.dataKey === 'revenue' ? formatCOPDisplay(p.value) : p.dataKey === 'qty' ? `${p.value} uds` : p.dataKey === 'cheques' ? `${p.value} cheques` : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Tab button ──────────────────────────────────────────────
function TabBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
        active
          ? 'bg-[var(--color-ak-borgona)] text-white'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'
      }`}
    >
      {children}
    </button>
  )
}

// ── Simple table ────────────────────────────────────────────
type ColDef = { key: string; label: string; align?: 'left' | 'right'; format?: (v: unknown) => string }

function SimpleTable({ rows, columns }: {
  rows: Array<Record<string, unknown>>
  columns: ColDef[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[var(--border-default)]">
            {columns.map((col) => (
              <th key={col.key} className={`py-1.5 px-2 text-[var(--text-secondary)] font-medium ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border-default)] last:border-0">
              {columns.map((col) => (
                <td key={col.key} className={`py-1.5 px-2 ${col.align === 'right' ? 'text-right tabular-nums' : ''} text-[var(--text-primary)]`}>
                  {col.format ? col.format(row[col.key]) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-[10px] text-[var(--text-secondary)] text-center py-4">Sin datos</p>
      )}
    </div>
  )
}

// ── Horizontal bars ─────────────────────────────────────────
function HorizontalBars({ data, labelKey, valueKey, color }: {
  data: Array<Record<string, unknown>>
  labelKey: string
  valueKey: string
  color?: string
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1)
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0
        const pct = (val / max) * 100
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)] w-20 truncate shrink-0">{String(d[labelKey])}</span>
            <div className="flex-1 h-3 bg-[var(--bg-input)] rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color || 'var(--color-ak-borgona)',
                  opacity: 0.85,
                  transition: 'width 400ms ease-out',
                }}
              />
            </div>
            <span className="text-[10px] font-mono tabular-nums text-[var(--text-primary)] shrink-0 w-16 text-right">
              {formatCOPDisplay(val)}
            </span>
          </div>
        )
      })}
      {data.length === 0 && <p className="text-[10px] text-[var(--text-secondary)] text-center py-4">Sin datos</p>}
    </div>
  )
}

// ── Mini bar chart ───────────────────────────────────────────
function MiniBarChart({ data, xKey, yKey, formatX }: {
  data: Array<Record<string, unknown>>
  xKey: string
  yKey: string
  formatX?: (v: string | number) => string
}) {
  if (data.length === 0) return <p className="text-[10px] text-[var(--text-secondary)] text-center py-4">Sin datos</p>
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={formatX || ((v: string | number) => String(v))}
          tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
          axisLine={{ stroke: 'var(--border-default)' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatCOPDisplay(v)}
          tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          content={
            <MiniTooltip
              formatLabel={(l) => formatX ? formatX(l) : String(l)}
            />
          }
        />
        <Bar
          dataKey={yKey}
          fill="var(--color-ak-borgona)"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Summary row ─────────────────────────────────────────────
function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[var(--border-default)] last:border-0">
      <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
      <span className="text-[11px] font-mono tabular-nums text-[var(--text-primary)] font-medium">
        {typeof value === 'number' ? formatCOPDisplay(value) : value}
      </span>
    </div>
  )
}

// ── PRODUCT TABS ─────────────────────────────────────────────
function ProductDrillDown({ data }: { data: DrillDownData }) {
  const [tab, setTab] = useState<'zona' | 'hora' | 'dias' | 'companantes'>('zona')
  const summary = data.summary as Record<string, unknown>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <TabBtn active={tab === 'zona'} onClick={() => setTab('zona')}>Zona</TabBtn>
        <TabBtn active={tab === 'hora'} onClick={() => setTab('hora')}>Hora</TabBtn>
        <TabBtn active={tab === 'dias'} onClick={() => setTab('dias')}>Dias</TabBtn>
        <TabBtn active={tab === 'companantes'} onClick={() => setTab('companantes')}>Acompanantes</TabBtn>
      </div>

      <div className="space-y-2">
        <SummaryRow label="Revenue total" value={Number(summary.totalRevenue) || 0} />
        <SummaryRow label="Unidades vendidas" value={`${Number(summary.totalQty) || 0}`} />
        <SummaryRow label="Cheques" value={`${Number(summary.totalCheques) || 0}`} />
        <SummaryRow label="Ticket promedio" value={Number(summary.avgTicket) || 0} />
      </div>

      {tab === 'zona' && data.byZone && (
        <HorizontalBars
          data={data.byZone.map(z => ({ label: z.zone, value: z.revenue }))}
          labelKey="label"
          valueKey="value"
        />
      )}

      {tab === 'hora' && data.byHour && (
        <MiniBarChart
          data={data.byHour.map(h => ({ x: h.hour, revenue: h.revenue }))}
          xKey="x"
          yKey="revenue"
          formatX={(v) => formatHourShort(Number(v))}
        />
      )}

      {tab === 'dias' && data.byDay && (
        <MiniBarChart
          data={data.byDay.map(d => ({ x: formatShortDate(d.date), revenue: d.revenue }))}
          xKey="x"
          yKey="revenue"
        />
      )}

      {tab === 'companantes' && data.companions && (
        <SimpleTable
          rows={data.companions}
          columns={[
            { key: 'name', label: 'Producto' },
            { key: 'qty', label: 'Qty', align: 'right', format: (v) => String(v) },
            { key: 'revenue', label: 'Revenue', align: 'right', format: (v) => formatCOPDisplay(Number(v)) },
          ]}
        />
      )}
    </div>
  )
}

// ── STAFF TABS ───────────────────────────────────────────────
function StaffDrillDown({ data }: { data: DrillDownData }) {
  const [tab, setTab] = useState<'zona' | 'hora' | 'productos' | 'tendencia'>('zona')
  const summary = data.summary as Record<string, unknown>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <TabBtn active={tab === 'zona'} onClick={() => setTab('zona')}>Zona</TabBtn>
        <TabBtn active={tab === 'hora'} onClick={() => setTab('hora')}>Hora</TabBtn>
        <TabBtn active={tab === 'productos'} onClick={() => setTab('productos')}>Productos</TabBtn>
        <TabBtn active={tab === 'tendencia'} onClick={() => setTab('tendencia')}>Tendencia</TabBtn>
      </div>

      <div className="space-y-2">
        <SummaryRow label="Revenue total" value={Number(summary.totalRevenue) || 0} />
        <SummaryRow label="Cheques" value={`${Number(summary.totalCheques) || 0}`} />
        <SummaryRow label="Propinas" value={Number(summary.totalPropina) || 0} />
        <SummaryRow label="Ticket promedio" value={Number(summary.avgTicket) || 0} />
      </div>

      {tab === 'zona' && data.byZone && (
        <HorizontalBars
          data={data.byZone.map(z => ({ label: z.zone, value: z.revenue }))}
          labelKey="label"
          valueKey="value"
        />
      )}

      {tab === 'hora' && data.byHour && (
        <MiniBarChart
          data={data.byHour.map(h => ({ x: h.hour, revenue: h.revenue }))}
          xKey="x"
          yKey="revenue"
          formatX={(v) => formatHourShort(Number(v))}
        />
      )}

      {tab === 'productos' && data.topProducts && (
        <SimpleTable
          rows={data.topProducts}
          columns={
            (data.topProducts.some((p) => 'name' in p)
              ? [
                  { key: 'name', label: 'Producto' },
                  { key: 'qty', label: 'Qty', align: 'right' as const, format: (v: unknown) => String(v) },
                  { key: 'revenue', label: 'Revenue', align: 'right' as const, format: (v: unknown) => formatCOPDisplay(Number(v)) },
                ]
              : [
                  { key: 'product', label: 'Producto' },
                  { key: 'qty', label: 'Qty', align: 'right' as const, format: (v: unknown) => String(v) },
                  { key: 'revenue', label: 'Revenue', align: 'right' as const, format: (v: unknown) => formatCOPDisplay(Number(v)) },
                ]) as ColDef[]
          }
        />
      )}

      {tab === 'tendencia' && data.dailyTrend && (
        <MiniBarChart
          data={data.dailyTrend.map(d => ({ x: formatShortDate(d.date), revenue: d.revenue }))}
          xKey="x"
          yKey="revenue"
        />
      )}
    </div>
  )
}

// ── CATEGORY TABS ───────────────────────────────────────────
function CategoryDrillDown({ data }: { data: DrillDownData }) {
  const [tab, setTab] = useState<'productos' | 'zona' | 'hora'>('productos')
  const summary = data.summary as Record<string, unknown>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <TabBtn active={tab === 'productos'} onClick={() => setTab('productos')}>Productos</TabBtn>
        <TabBtn active={tab === 'zona'} onClick={() => setTab('zona')}>Zona</TabBtn>
        <TabBtn active={tab === 'hora'} onClick={() => setTab('hora')}>Hora</TabBtn>
      </div>

      <div className="space-y-2">
        <SummaryRow label="Revenue total" value={Number(summary.totalRevenue) || 0} />
        <SummaryRow label="Unidades vendidas" value={`${Number(summary.totalQty) || 0}`} />
        <SummaryRow label="Cheques" value={`${Number(summary.totalCheques) || 0}`} />
      </div>

      {tab === 'productos' && data.topProducts && (
        <SimpleTable
          rows={data.topProducts}
          columns={[
            { key: 'name', label: 'Producto' },
            { key: 'qty', label: 'Qty', align: 'right', format: (v) => String(v) },
            { key: 'revenue', label: 'Revenue', align: 'right', format: (v) => formatCOPDisplay(Number(v)) },
            { key: 'cheques', label: 'Cheques', align: 'right', format: (v) => v != null ? String(v) : '' },
          ]}
        />
      )}

      {tab === 'zona' && data.byZone && (
        <HorizontalBars
          data={data.byZone.map(z => ({ label: z.zone, value: z.revenue }))}
          labelKey="label"
          valueKey="value"
        />
      )}

      {tab === 'hora' && data.byHour && (
        <MiniBarChart
          data={data.byHour.map(h => ({ x: h.hour, revenue: h.revenue }))}
          xKey="x"
          yKey="revenue"
          formatX={(v) => formatHourShort(Number(v))}
        />
      )}
    </div>
  )
}

// ── HOUR TABS ────────────────────────────────────────────────
function HourDrillDown({ data }: { data: DrillDownData }) {
  const [tab, setTab] = useState<'productos' | 'meseros' | 'zonas'>('productos')
  const summary = data.summary as Record<string, unknown>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <TabBtn active={tab === 'productos'} onClick={() => setTab('productos')}>Productos</TabBtn>
        <TabBtn active={tab === 'meseros'} onClick={() => setTab('meseros')}>Meseros</TabBtn>
        <TabBtn active={tab === 'zonas'} onClick={() => setTab('zonas')}>Zonas</TabBtn>
      </div>

      <div className="space-y-2">
        <SummaryRow label="Hora" value={formatHourShort(Number(summary.hour) || 0)} />
        <SummaryRow label="Revenue total" value={Number(summary.totalRevenue) || 0} />
        <SummaryRow label="Cheques" value={`${Number(summary.totalCheques) || 0}`} />
      </div>

      {tab === 'productos' && data.topProducts && (
        <SimpleTable
          rows={data.topProducts}
          columns={[
            { key: 'product', label: 'Producto' },
            { key: 'qty', label: 'Qty', align: 'right', format: (v) => String(v) },
            { key: 'revenue', label: 'Revenue', align: 'right', format: (v) => formatCOPDisplay(Number(v)) },
          ]}
        />
      )}

      {tab === 'meseros' && data.topStaff && (
        <SimpleTable
          rows={data.topStaff}
          columns={[
            { key: 'name', label: 'Mesero' },
            { key: 'cheques', label: 'Cheques', align: 'right', format: (v) => String(v) },
            { key: 'revenue', label: 'Revenue', align: 'right', format: (v) => formatCOPDisplay(Number(v)) },
          ]}
        />
      )}

      {tab === 'zonas' && data.byZone && (
        <HorizontalBars
          data={data.byZone.map(z => ({ label: z.zone, value: z.revenue }))}
          labelKey="label"
          valueKey="value"
        />
      )}
    </div>
  )
}

// ── ZONE TABS ────────────────────────────────────────────────
function ZoneDrillDown({ data }: { data: DrillDownData }) {
  const [tab, setTab] = useState<'productos' | 'hora' | 'meseros' | 'tendencia'>('productos')
  const summary = data.summary as Record<string, unknown>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <TabBtn active={tab === 'productos'} onClick={() => setTab('productos')}>Productos</TabBtn>
        <TabBtn active={tab === 'hora'} onClick={() => setTab('hora')}>Hora</TabBtn>
        <TabBtn active={tab === 'meseros'} onClick={() => setTab('meseros')}>Meseros</TabBtn>
        <TabBtn active={tab === 'tendencia'} onClick={() => setTab('tendencia')}>Tendencia</TabBtn>
      </div>

      <div className="space-y-2">
        <SummaryRow label="Zona" value={String(summary.zone || '')} />
        <SummaryRow label="Revenue total" value={Number(summary.totalRevenue) || 0} />
        <SummaryRow label="Cheques" value={`${Number(summary.totalCheques) || 0}`} />
        <SummaryRow label="Propinas" value={Number(summary.totalPropina) || 0} />
      </div>

      {tab === 'productos' && data.topProducts && (
        <SimpleTable
          rows={data.topProducts}
          columns={[
            { key: 'product', label: 'Producto' },
            { key: 'qty', label: 'Qty', align: 'right', format: (v) => String(v) },
            { key: 'revenue', label: 'Revenue', align: 'right', format: (v) => formatCOPDisplay(Number(v)) },
          ]}
        />
      )}

      {tab === 'hora' && data.byHour && (
        <MiniBarChart
          data={data.byHour.map(h => ({ x: h.hour, revenue: h.revenue }))}
          xKey="x"
          yKey="revenue"
          formatX={(v) => formatHourShort(Number(v))}
        />
      )}

      {tab === 'meseros' && data.topStaff && (
        <SimpleTable
          rows={data.topStaff}
          columns={[
            { key: 'name', label: 'Mesero' },
            { key: 'cheques', label: 'Cheques', align: 'right', format: (v) => String(v) },
            { key: 'revenue', label: 'Revenue', align: 'right', format: (v) => formatCOPDisplay(Number(v)) },
          ]}
        />
      )}

      {tab === 'tendencia' && data.dailyTrend && (
        <MiniBarChart
          data={data.dailyTrend.map(d => ({ x: formatShortDate(d.date), revenue: d.revenue }))}
          xKey="x"
          yKey="revenue"
        />
      )}
    </div>
  )
}

// ── Type labels ──────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  product: 'Producto',
  staff: 'Mesero',
  category: 'Categoria',
  hour: 'Hora',
  zone: 'Zona',
}

// ── Main DrillDownPanel ─────────────────────────────────────
interface DrillDownPanelProps {
  drillDown: DrillDownState
  data: DrillDownData | null
  loading: boolean
  error: string | null
  onClose: () => void
}

export function DrillDownPanel({ drillDown, data, loading, error, onClose }: DrillDownPanelProps) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--color-ak-borgona)]/30 p-5 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[var(--text-secondary)]">Operacion</span>
          <span className="text-[11px] text-[var(--text-secondary)]">/</span>
          <span className="text-[11px] font-medium text-[var(--color-ak-borgona)]">
            {TYPE_LABELS[drillDown.type] || drillDown.type}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">/</span>
          <span className="text-[11px] font-semibold text-[var(--text-primary)]">{drillDown.label}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Cerrar detalle"
        >
          <X size={16} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 flex items-center justify-center">
          <Spinner size={24} className="animate-spin text-[var(--text-secondary)]" />
          <span className="ml-2 text-xs text-[var(--text-secondary)]">Cargando detalle...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="py-8 text-center">
          <p className="text-xs text-[var(--color-danger)]">{error}</p>
        </div>
      )}

      {/* Content */}
      {data && !loading && !error && (
        <>
          {drillDown.type === 'product' && <ProductDrillDown data={data} />}
          {drillDown.type === 'staff' && <StaffDrillDown data={data} />}
          {drillDown.type === 'category' && <CategoryDrillDown data={data} />}
          {drillDown.type === 'hour' && <HourDrillDown data={data} />}
          {drillDown.type === 'zone' && <ZoneDrillDown data={data} />}
        </>
      )}
    </div>
  )
}