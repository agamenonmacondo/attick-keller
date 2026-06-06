'use client'

import { useProductMargins } from '@/lib/hooks/useProductMargins'
import { Lightning, Warning, Fire, Copy, CaretDown, CaretUp } from '@phosphor-icons/react'
import { useState, useMemo } from 'react'

interface Props {
  from: string
  to: string
}

const MACRO_LABELS: Record<string, { icon: string; label: string }> = {
  COCTELES: { icon: '\u{1F378}', label: 'Cocteles' },
  LICORES: { icon: '\u{1F943}', label: 'Licores' },
  VINOS: { icon: '\u{1F377}', label: 'Vinos' },
  COMIDA: { icon: '\u{1F37D}\uFE0F', label: 'Comida' },
  BEBIDAS: { icon: '\u{1F964}', label: 'Bebidas' },
}

const SEMAFORO_COLORS: Record<string, string> = {
  '\u{1F7E2}': 'var(--color-success)',
  '\u{1F7E1}': 'var(--color-warning)',
  '\u{1F534}': 'var(--color-danger)',
}

function formatPesos(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

function formatNum(n: number): string {
  return Math.round(n).toLocaleString('es-CO')
}

function getSemaforo(marginPct: number, metaPct: number = 30): string {
  if (marginPct >= metaPct) return '\u{1F7E2}'
  if (marginPct >= metaPct - 5) return '\u{1F7E1}'
  return '\u{1F534}'
}

export function RentabilidadPanel({ from, to }: Props) {
  const [categoryFilter, setCategoryFilter] = useState('Todas')
  const [showAllDrena, setShowAllDrena] = useState(false)
  const [showAllImporta, setShowAllImporta] = useState(false)
  const { data, loading, error } = useProductMargins(from, to, categoryFilter === 'Todas' ? '' : categoryFilter)

  const categorias = data?.resumen_ejecutivo?.categorias || []
  const drenan = data?.drenan || []
  const importan = data?.importan || []
  const kpis = data?.kpis
  const metaMargen = 30

  const visibleDrenan = showAllDrena ? drenan : drenan.slice(0, 5)
  const visibleImportan = showAllImporta ? importan : importan.slice(0, 15)

  // Diagnóstico concreto para cada lastre
  function getDiagnostico(p: any): string {
    if (p.margin_pct <= 10) return 'Margen muy bajo — revisar receta o precio'
    if (p.margin_pct <= 20) return 'Margen bajo — costo de ingredientes alto'
    if (p.quantity_sold <= 3) return 'Sin rotación — solo se vendió ' + formatNum(p.quantity_sold) + ' vez'
    if (p.cost_total > p.revenue * 0.7) return 'Costo receta > 70% del precio'
    return 'Margen bajo'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-ak-dorado)] border-t-transparent" />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">Cargando márgenes...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <Warning size={24} className="mx-auto mb-2 text-[var(--color-danger)]" />
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
      {/* ═══ SECCIÓN 1: RESUMEN EJECUTIVO ═══ */}
      <div className="space-y-1.5">
        {categorias.slice(0, 3).map((cat, i) => {
          const semaforo = cat.margin_pct >= metaMargen ? '\u{1F7E2}' : cat.margin_pct >= metaMargen - 5 ? '\u{1F7E1}' : '\u{1F534}'
          const diff = cat.margin_pct - metaMargen
          const diffStr = diff >= 0 ? `+${diff}` : `${diff}`
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span>{semaforo}</span>
              <span className="text-[var(--text-primary)] font-medium">{MACRO_LABELS[cat.categoria]?.label || cat.categoria}</span>
              <span className="text-[var(--text-secondary)]">{cat.margin_pct}% margen</span>
              <span className={diff >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                {diffStr} pts vs meta
              </span>
            </div>
          )
        })}
      </div>

      {/* ═══ SECCIÓN 2: KPIs VITALES ═══ */}
      {kpis && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{formatPesos(kpis.total_revenue)}</div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Ventas</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{kpis.margin_pct}%</div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Margen Bruto</div>
            <div className={`text-xs mt-1 font-medium ${kpis.margin_pct >= metaMargen ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
              {getSemaforo(kpis.margin_pct)} {kpis.margin_pct >= metaMargen ? 'Sobre meta' : `${metaMargen - kpis.margin_pct} pts bajo meta`}
            </div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{kpis.total_productos}</div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Productos</div>
          </div>
        </div>
      )}

      {/* ═══ SECCIÓN 3: LO QUE DRENA ═══ */}
      {drenan.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Warning size={16} weight="fill" className="text-[var(--color-danger)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Lo que drena — requiere acción
            </h3>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="text-left p-2.5 font-medium">Producto</th>
                  <th className="text-left p-2.5 font-medium hidden sm:table-cell">Cat.</th>
                  <th className="text-right p-2.5 font-medium">Margen</th>
                  <th className="text-right p-2.5 font-medium hidden sm:table-cell">Revenue</th>
                  <th className="text-left p-2.5 font-medium hidden md:table-cell">Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {visibleDrenan.map((p, i) => (
                  <tr key={i} className="border-b border-[var(--border-light)] last:border-0 hover:bg-[rgba(255,255,255,0.01)]">
                    <td className="p-2.5 text-[var(--text-primary)] font-medium">{p.product_name}</td>
                    <td className="p-2.5 text-[var(--text-secondary)] hidden sm:table-cell">
                      {MACRO_LABELS[p.macro_category]?.icon} {MACRO_LABELS[p.macro_category]?.label}
                    </td>
                    <td className={`p-2.5 text-right font-semibold ${p.margin_pct <= 15 ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}`}>
                      {p.margin_pct}%
                    </td>
                    <td className="p-2.5 text-right text-[var(--text-secondary)] hidden sm:table-cell">{formatPesos(p.revenue)}</td>
                    <td className="p-2.5 text-xs text-[var(--text-muted)] hidden md:table-cell">{getDiagnostico(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* ═══ SECCIÓN 4: POR CATEGORÍA ═══ */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">
          Por categoría
        </h3>
        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['Todas', 'COCTELES', 'LICORES', 'VINOS', 'COMIDA', 'BEBIDAS'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-[var(--color-ak-dorado)] text-black'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--color-ak-dorado)]'
              }`}
            >
              {cat === 'Todas' ? 'Todas' : MACRO_LABELS[cat]?.label || cat}
            </button>
          ))}
        </div>
        {/* Table */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                <th className="text-left p-2.5 font-medium">Categoría</th>
                <th className="text-right p-2.5 font-medium">Revenue</th>
                <th className="text-right p-2.5 font-medium">Margen</th>
                <th className="text-right p-2.5 font-medium hidden sm:table-cell">🔥 Importan</th>
                <th className="text-right p-2.5 font-medium hidden sm:table-cell">⚠️ Drenan</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat, i) => {
                const semaforo = getSemaforo(cat.margin_pct)
                return (
                  <tr
                    key={i}
                    onClick={() => setCategoryFilter(cat.categoria)}
                    className={`border-b border-[var(--border-light)] last:border-0 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] ${
                      categoryFilter === cat.categoria ? 'bg-[rgba(201,169,78,0.05)]' : ''
                    }`}
                  >
                    <td className="p-2.5 text-[var(--text-primary)] font-medium">
                      {MACRO_LABELS[cat.categoria]?.icon} {MACRO_LABELS[cat.categoria]?.label}
                    </td>
                    <td className="p-2.5 text-right text-[var(--text-secondary)]">{formatPesos(cat.revenue)}</td>
                    <td className="p-2.5 text-right">
                      <span className="font-semibold text-[var(--text-primary)]">{cat.margin_pct}%</span>
                      <span className="ml-1">{semaforo}</span>
                    </td>
                    <td className="p-2.5 text-right text-[var(--color-success)] font-medium hidden sm:table-cell">{cat.importan}</td>
                    <td className="p-2.5 text-right text-[var(--color-danger)] font-medium hidden sm:table-cell">{cat.drenan}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ SECCIÓN 5: LO QUE IMPORTA ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Fire size={16} weight="fill" className="text-[var(--color-ak-dorado)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            Lo que importa — proteger
          </h3>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                <th className="text-left p-2.5 font-medium">Producto</th>
                <th className="text-left p-2.5 font-medium hidden sm:table-cell">Cat.</th>
                <th className="text-right p-2.5 font-medium">Margen</th>
                <th className="text-right p-2.5 font-medium hidden sm:table-cell">Revenue</th>
                <th className="text-right p-2.5 font-medium hidden md:table-cell">M. Bruto</th>
              </tr>
            </thead>
            <tbody>
              {visibleImportan.map((p, i) => (
                <tr key={i} className="border-b border-[var(--border-light)] last:border-0 hover:bg-[rgba(255,255,255,0.01)]">
                  <td className="p-2.5 text-[var(--text-primary)] font-medium">{p.product_name}</td>
                  <td className="p-2.5 text-[var(--text-secondary)] hidden sm:table-cell">
                    {MACRO_LABELS[p.macro_category]?.icon} {MACRO_LABELS[p.macro_category]?.label}
                  </td>
                  <td className="p-2.5 text-right font-semibold text-[var(--color-success)]">{p.margin_pct}%</td>
                  <td className="p-2.5 text-right text-[var(--text-secondary)] hidden sm:table-cell">{formatPesos(p.revenue)}</td>
                  <td className="p-2.5 text-right font-medium text-[var(--color-ak-dorado)] hidden md:table-cell">{formatPesos(p.margin_bruto)}</td>
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

      {/* ═══ SECCIÓN 6: PARA LA JUNTA ═══ */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Copy size={16} className="text-[var(--color-ak-dorado)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            Para la junta
          </h3>
        </div>
        <div className="space-y-2 text-sm text-[var(--text-secondary)]">
          {(() => {
            // Usar los datos reales de drenan para generar el resumen
            const drenanConMargen = drenan.filter((p: any) => Number(p.margin_pct || 0) < 20)
            const drenanNegativos = drenan.filter((p: any) => Number(p.margin_bruto || 0) < 0)
            const catDrenan = drenan.length > 0 ? drenan[0].macro_category : 'Comida'
            const catLabel = MACRO_LABELS[catDrenan]?.label || catDrenan

            // Top categoria por margen
            const mejorCat = categorias.length > 0
              ? categorias.reduce((a: any, b: any) => (a.margin_pct > b.margin_pct ? a : b))
              : null

            return (
              <>
                {mejorCat && (
                  <div className="flex gap-2">
                    <span className="text-[var(--color-success)] font-bold">1.</span>
                    <span>
                      <strong className="text-[var(--text-primary)]">{MACRO_LABELS[mejorCat.categoria]?.label || mejorCat.categoria}</strong> lidera con {mejorCat.margin_pct}% de margen y {mejorCat.importan} productos estrella {getSemaforo(mejorCat.margin_pct)}
                      {' '}— mantener estrategia de precios y promociones actuales.
                    </span>
                  </div>
                )}
                {drenanConMargen.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-[var(--color-warning)] font-bold">2.</span>
                    <span>
                      <strong className="text-[var(--text-primary)]">ATENCIÓN:</strong> {drenanConMargen.length} productos con margen bajo (<20%) en <strong className="text-[var(--text-primary)]">{catLabel}</strong>
                      {' '}— revisar recetas y precios con cocina y barra. {drenanConMargen.slice(0, 2).map((p: any) => p.product_name).join(', ')}.
                    </span>
                  </div>
                )}
                {drenanNegativos.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-[var(--color-danger)] font-bold">{drenanConMargen.length > 0 ? '3.' : '2.'}</span>
                    <span>
                      <strong className="text-[var(--text-primary)]">URGENTE:</strong> {drenanNegativos.length} productos con margen bruto negativo en {catLabel}
                      {' '}— están costando más producir que lo que generan. Evaluar eliminación inmediata.
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-[var(--color-ak-dorado)] font-bold">{drenanConMargen.length > 0 || drenanNegativos.length > 0 ? '4.' : '1.'}</span>
                  <span>
                    <strong className="text-[var(--text-primary)]">Margen general del negocio:</strong> {kpis?.margin_pct || '?'}% sobre {formatPesos(kpis?.total_revenue || 0)} en ventas
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
