'use client'

import { useProductMargins } from '@/lib/hooks/useProductMargins'
import {
  Warning, Fire, Copy, CaretDown, CaretUp, CheckCircle,
  WarningCircle, XCircle, Wine, ForkKnife, Coffee,
  Martini, BeerBottle, ShootingStar
} from '@phosphor-icons/react'
import { useState } from 'react'

interface Props {
  from: string
  to: string
}

const MACRO_LABELS: Record<string, string> = {
  COCTELES: 'Cocteles',
  LICORES: 'Licores',
  VINOS: 'Vinos',
  COMIDA: 'Comida',
  BEBIDAS: 'Bebidas',
}

function MacroIcon({ cat, size = 16 }: { cat: string; size?: number }) {
  const color = 'var(--color-ak-dorado)'
  switch (cat) {
    case 'COCTELES': return <Martini size={size} weight="fill" style={{ color }} />
    case 'LICORES': return <Wine size={size} weight="fill" style={{ color }} />
    case 'VINOS': return <Wine size={size} weight="duotone" style={{ color }} />
    case 'COMIDA': return <ForkKnife size={size} weight="fill" style={{ color }} />
    case 'BEBIDAS': return <BeerBottle size={size} weight="fill" style={{ color }} />
    default: return <ShootingStar size={size} style={{ color: 'var(--text-muted)' }} />
  }
}

function SemaforoIcon({ pct, meta = 30 }: { pct: number; meta?: number }) {
  if (pct >= meta) return <CheckCircle size={14} weight="fill" style={{ color: 'var(--color-success)' }} />
  if (pct >= meta - 5) return <WarningCircle size={14} weight="fill" style={{ color: 'var(--color-warning)' }} />
  return <XCircle size={14} weight="fill" style={{ color: 'var(--color-danger)' }} />
}

function formatPesos(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

function formatNum(n: number): string {
  return Math.round(n).toLocaleString('es-CO')
}

export function RentabilidadPanel({ from, to }: Props) {
  const [categoryFilter, setCategoryFilter] = useState('Todas')
  const [showAllDrena, setShowAllDrena] = useState(false)
  const [showAllImporta, setShowAllImporta] = useState(false)
  const [drenaExpanded, setDrenaExpanded] = useState<number | null>(null)
  const { data, loading, error } = useProductMargins(from, to, categoryFilter === 'Todas' ? '' : categoryFilter)

  const categorias = data?.resumen_ejecutivo?.categorias || []
  const drenan = data?.drenan || []
  const importan = data?.importan || []
  const kpis = data?.kpis
  const metaMargen = 30

  const visibleDrenan = showAllDrena ? drenan : drenan.slice(0, 5)
  const visibleImportan = showAllImporta ? importan : importan.slice(0, 15)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-ak-dorado)] border-t-transparent" />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">Calculando márgenes...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <Warning size={24} className="mx-auto mb-2" style={{ color: 'var(--color-danger)' }} />
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
      </div>
    )
  }

  if (!data || importan.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">Sin datos de margen para este período</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ RESUMEN EJECUTIVO ═══ */}
      <div className="space-y-1.5">
        {categorias.slice(0, 3).map((cat, i) => {
          const diff = cat.margin_pct - metaMargen
          const diffStr = diff >= 0 ? `+${diff}` : `${diff}`
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <SemaforoIcon pct={cat.margin_pct} />
              <MacroIcon cat={cat.categoria} size={14} />
              <span className="text-[var(--text-primary)] font-medium">{MACRO_LABELS[cat.categoria] || cat.categoria}</span>
              <span className="text-[var(--text-secondary)]">{cat.margin_pct}% margen</span>
              <span className={diff >= 0 ? 'text-[var(--color-success)] text-xs font-medium' : 'text-[var(--color-danger)] text-xs font-medium'}>
                {diffStr} pts vs meta ({metaMargen}%)
              </span>
            </div>
          )
        })}
      </div>

      {/* ═══ KPIs VITALES ═══ */}
      {kpis && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{formatPesos(kpis.total_revenue)}</div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Ventas</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{kpis.margin_pct}%</div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Margen Bruto</div>
            <div className="flex items-center gap-1 text-xs mt-1 font-medium" style={{ color: kpis.margin_pct >= metaMargen ? 'var(--color-success)' : 'var(--color-warning)' }}>
              <SemaforoIcon pct={kpis.margin_pct} />
              {kpis.margin_pct >= metaMargen ? 'Sobre meta' : `${metaMargen - kpis.margin_pct} pts bajo meta`}
            </div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{kpis.total_productos}</div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Productos</div>
            <div className="text-xs mt-1 text-[var(--text-muted)]">con margen calculable</div>
          </div>
        </div>
      )}

      {/* ═══ LO QUE DRENA ═══ */}
      {drenan.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Warning size={16} weight="fill" style={{ color: 'var(--color-danger)' }} />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Lo que drena
            </h3>
            <span className="text-xs text-[var(--text-muted)]">— productos que menos aportan al negocio</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
            {visibleDrenan.map((p: any, i: number) => {
              const expanded = drenaExpanded === i
              return (
                <div key={i} className={`border-b border-[var(--border-light)] last:border-0 ${expanded ? 'bg-[rgba(93,21,40,0.05)]' : ''}`}>
                  <div
                    className="flex items-center p-2.5 cursor-pointer hover:bg-[rgba(255,255,255,0.01)]"
                    onClick={() => setDrenaExpanded(expanded ? null : i)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MacroIcon cat={p.macro_category} size={14} />
                        <span className="text-[var(--text-primary)] font-medium text-sm">{p.product_name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                        <span>Margen: <strong className="text-[var(--color-danger)]">{p.margin_pct}%</strong></span>
                        <span>Revenue: {formatPesos(p.revenue)}</span>
                        <span>Ganancia neta: <strong className="text-[var(--color-ak-dorado)]">{formatPesos(p.margin_bruto)}</strong></span>
                      </div>
                    </div>
                    <CaretDown size={14} className={`text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>
                  {expanded && (
                    <div className="px-4 pb-3 pt-0">
                      <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(93,21,40,0.08)' }}>
                        <WarningCircle size={16} weight="fill" style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{p.diagnostico || 'Contribución neta mínima al negocio.'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {drenan.length > 5 && (
              <button
                onClick={() => setShowAllDrena(!showAllDrena)}
                className="w-full p-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center justify-center gap-1 border-t border-[var(--border-light)]"
              >
                {showAllDrena ? 'Mostrar solo 5' : `Ver los ${drenan.length} productos`}
                {showAllDrena ? <CaretUp size={12} /> : <CaretDown size={12} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ POR CATEGORÍA ═══ */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">
          Por categoría
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['Todas', 'COCTELES', 'LICORES', 'VINOS', 'COMIDA', 'BEBIDAS'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-[var(--color-ak-dorado)] text-black'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--color-ak-dorado)]'
              }`}
            >
              {cat !== 'Todas' && <MacroIcon cat={cat} size={12} />}
              {cat === 'Todas' ? 'Todas' : MACRO_LABELS[cat] || cat}
            </button>
          ))}
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                <th className="text-left p-2.5 font-medium">Categoría</th>
                <th className="text-right p-2.5 font-medium">Revenue</th>
                <th className="text-right p-2.5 font-medium">Margen</th>
                <th className="text-right p-2.5 font-medium hidden sm:table-cell">Importan</th>
                <th className="text-right p-2.5 font-medium hidden sm:table-cell">Drenan</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat, i) => (
                <tr
                  key={i}
                  onClick={() => setCategoryFilter(cat.categoria)}
                  className={`border-b border-[var(--border-light)] last:border-0 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] ${
                    categoryFilter === cat.categoria ? 'bg-[rgba(252,204,4,0.05)]' : ''
                  }`}
                >
                  <td className="p-2.5 text-[var(--text-primary)] font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <MacroIcon cat={cat.categoria} size={14} />
                      {MACRO_LABELS[cat.categoria] || cat.categoria}
                    </span>
                  </td>
                  <td className="p-2.5 text-right text-[var(--text-secondary)]">{formatPesos(cat.revenue)}</td>
                  <td className="p-2.5 text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <span className="font-semibold text-[var(--text-primary)]">{cat.margin_pct}%</span>
                      <SemaforoIcon pct={cat.margin_pct} />
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-medium hidden sm:table-cell" style={{ color: 'var(--color-success)' }}>{cat.importan}</td>
                  <td className="p-2.5 text-right font-medium hidden sm:table-cell" style={{ color: 'var(--color-danger)' }}>{cat.drenan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ LO QUE IMPORTA ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Fire size={16} weight="fill" style={{ color: 'var(--color-ak-dorado)' }} />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            Lo que importa
          </h3>
          <span className="text-xs text-[var(--text-muted)]">— mayor ganancia neta, proteger</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                <th className="text-left p-2.5 font-medium">Producto</th>
                <th className="text-left p-2.5 font-medium hidden sm:table-cell">Cat.</th>
                <th className="text-right p-2.5 font-medium">Margen</th>
                <th className="text-right p-2.5 font-medium hidden sm:table-cell">Revenue</th>
                <th className="text-right p-2.5 font-medium hidden md:table-cell">Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {visibleImportan.map((p: any, i: number) => (
                <tr key={i} className="border-b border-[var(--border-light)] last:border-0 hover:bg-[rgba(255,255,255,0.01)]">
                  <td className="p-2.5 text-[var(--text-primary)] font-medium text-sm">{p.product_name}</td>
                  <td className="p-2.5 text-[var(--text-secondary)] hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1">
                      <MacroIcon cat={p.macro_category} size={12} />
                      {MACRO_LABELS[p.macro_category] || p.macro_category}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <span className="font-semibold" style={{ color: 'var(--color-success)' }}>{p.margin_pct}%</span>
                      <SemaforoIcon pct={p.margin_pct} />
                    </span>
                  </td>
                  <td className="p-2.5 text-right text-[var(--text-secondary)] hidden sm:table-cell">{formatPesos(p.revenue)}</td>
                  <td className="p-2.5 text-right font-medium hidden md:table-cell" style={{ color: 'var(--color-ak-dorado)' }}>{formatPesos(p.margin_bruto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {importan.length > 15 && (
            <button
              onClick={() => setShowAllImporta(!showAllImporta)}
              className="w-full p-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center justify-center gap-1 border-t border-[var(--border-light)]"
            >
              {showAllImporta ? 'Mostrar solo 15' : `Ver los ${importan.length} productos`}
              {showAllImporta ? <CaretUp size={12} /> : <CaretDown size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* ═══ PARA LA JUNTA ═══ */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Copy size={16} style={{ color: 'var(--color-ak-dorado)' }} />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            Para la junta
          </h3>
        </div>
        <div className="space-y-2.5 text-sm text-[var(--text-secondary)]">
          {(() => {
            const mejorCat = categorias.length > 0
              ? categorias.reduce((a: any, b: any) => (a.margin_pct > b.margin_pct ? a : b))
              : null

            return (
              <>
                {mejorCat && (
                  <div className="flex gap-2">
                    <CheckCircle size={16} weight="fill" style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
                    <span>
                      <strong className="text-[var(--text-primary)]">{MACRO_LABELS[mejorCat.categoria]}</strong> lidera con {mejorCat.margin_pct}% de margen y {mejorCat.importan} productos estrella
                      {' '}— mantener estrategia de precios y promociones actuales.
                    </span>
                  </div>
                )}
                {drenan.length > 0 && (
                  <div className="flex gap-2">
                    <WarningCircle size={16} weight="fill" style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 1 }} />
                    <span>
                      <strong className="text-[var(--text-primary)]">ATENCIÓN:</strong> {drenan.length} productos en el 5% inferior por ganancia neta. {drenan[0]?.product_name || ''} genera solo {drenan[0] ? formatPesos(drenan[0].margin_bruto) : ''} netos en el período.
                      {' '}— evaluar si justifican su espacio en menú, cocina e inventario.
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Fire size={16} weight="fill" style={{ color: 'var(--color-ak-dorado)', flexShrink: 0, marginTop: 1 }} />
                  <span>
                    <strong className="text-[var(--text-primary)]">Margen general del negocio:</strong> {kpis?.margin_pct || '?'}% sobre {kpis ? formatPesos(kpis.total_revenue) : '?'} en ventas
                    {' '}— {kpis && kpis.margin_pct >= metaMargen ? 'saludable, sobre la meta del ' + metaMargen + '%.' : (metaMargen - (kpis?.margin_pct || 0)) + ' puntos bajo la meta del ' + metaMargen + '%.'}
                  </span>
                </div>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
