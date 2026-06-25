'use client'

import { useState, useEffect } from 'react'
import { X, Spinner, Check, Buildings, GridFour, Table, Warning } from '@phosphor-icons/react'

interface TableOption {
  type: 'full_zone' | 'combination' | 'single_table' | 'multi_zone'
  label: string
  // full_zone
  zone_id?: string
  zone_name?: string
  zone_letter?: string | null
  total_capacity?: number
  table_count?: number
  table_ids?: string[]
  tables?: Array<{ id: string; number: string; name_attick: string | null; capacity: number }>
  // combination
  combination_id?: string
  combination_name?: string | null
  combined_capacity?: number
  // single_table
  table_id?: string
  table_number?: string
  table_name?: string | null
  capacity?: number
  // multi_zone
  zones?: Array<{
    zone_id: string; zone_name: string; zone_letter: string | null
    capacity_used: number; total_capacity: number
    table_ids: string[]; tables: Array<{ id: string; number: string; name_attick: string | null; capacity: number }>
  }>
  zone_count?: number
  covers?: boolean
  deficit?: number
}

interface TableOptionsData {
  reservation: {
    id: string
    party_size: number
    date: string
    time_start: string
    time_end: string
  }
  options: {
    full_zones: TableOption[]
    combinations: TableOption[]
    single_tables: TableOption[]
    multi_zone: TableOption | null
  }
  summary: {
    total_free_capacity: number
    total_free_tables: number
    has_full_zone: boolean
    has_combination: boolean
    has_single_table: boolean
    has_multi_zone: boolean
  }
}

interface AssignTablePopupProps {
  reservationId: string
  partySize: number
  customerName: string
  timeStart: string
  timeEnd: string
  onClose: () => void
  onAssigned: () => void
}

export function AssignTablePopup({
  reservationId,
  partySize,
  customerName,
  timeStart,
  timeEnd,
  onClose,
  onAssigned,
}: AssignTablePopupProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TableOptionsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<TableOption | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/reservations/${reservationId}/table-options`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(json => setData(json))
      .catch(() => setError('Error cargando opciones'))
      .finally(() => setLoading(false))
  }, [reservationId])

  const handleAssign = async () => {
    if (!selected) return
    setSubmitting(true)
    setError(null)

    try {
      let tableId: string | null = null

      if (selected.type === 'single_table') {
        tableId = selected.table_id || null
      } else if (selected.type === 'combination') {
        // Use the first table of the combo as table_id
        // The combination is tracked via table_combination_id
        tableId = selected.table_ids?.[0] || null
      } else if (selected.type === 'full_zone') {
        // For full zone, assign the largest table as primary
        const largest = selected.tables?.reduce((a, b) => a.capacity > b.capacity ? a : b)
        tableId = largest?.id || selected.table_ids?.[0] || null
      } else if (selected.type === 'multi_zone') {
        // For multi-zone, send ALL table IDs from ALL zones
        // The PATCH route will create a table_combination and assign it
        const allTableIds = selected.zones?.flatMap(z => z.table_ids) || []
        const allTables = selected.zones?.flatMap(z => z.tables || []) || []
        const totalCap = allTables.reduce((s, t) => s + t.capacity, 0)
        const zoneNames = selected.zones?.map(z => z.zone_name).join('+') || 'Multi-zona'

        const res = await fetch(`/api/admin/reservations/${reservationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_ids: allTableIds,
            combined_capacity: totalCap,
            zone_names: zoneNames,
            party_size: partySize,
          }),
        })
        if (res.ok) {
          onAssigned()
          onClose()
        } else {
          const d = await res.json().catch(() => ({}))
          setError(d.error || 'Error al asignar')
        }
        setSubmitting(false)
        return  // early return — don't fall through to the generic PATCH below
      }

      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: tableId }),
      })

      if (res.ok) {
        onAssigned()
        onClose()
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Error al asignar')
      }
    } catch {
      setError('Error de conexion')
    } finally {
      setSubmitting(false)
    }
  }

  const getCapacity = (opt: TableOption): number => {
    if (opt.type === 'full_zone') return opt.total_capacity || 0
    if (opt.type === 'combination') return opt.combined_capacity || 0
    if (opt.type === 'multi_zone') return opt.total_capacity || 0
    return opt.capacity || 0
  }

  const getTableIds = (opt: TableOption): string[] => {
    return opt.table_ids || (opt.table_id ? [opt.table_id] : [])
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-primary)] rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--text-primary)]">Asignar Mesa</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {customerName} · {partySize}p · {timeStart} – {timeEnd}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
          </div>
        ) : error && !data ? (
          <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-xl p-4 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : data ? (
          <>
            {/* Summary bar */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{data.summary.total_free_capacity}p libres</span>
              <span>·</span>
              <span>{data.summary.total_free_tables} mesas</span>
              {data.summary.has_full_zone && (
                <span className="ml-auto text-[var(--color-ak-oliva)] dark:text-[var(--color-ak-oliva-light)] font-medium flex items-center gap-1">
                  <Buildings size={12} /> Zona disponible
                </span>
              )}
            </div>

            {/* Tier 1: Full Zones */}
            {data.options.full_zones.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Buildings size={14} className="text-[var(--color-ak-oliva)] dark:text-[var(--color-ak-oliva-light)]" />
                  Zonas Completas
                </h3>
                <div className="space-y-1.5">
                  {data.options.full_zones.map(opt => (
                    <button
                      key={opt.zone_id}
                      onClick={() => setSelected(opt)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selected?.zone_id === opt.zone_id
                          ? 'border-[var(--color-ak-oliva)] dark:border-[var(--color-ak-oliva-light)] bg-[var(--color-ak-oliva)]/5 dark:bg-[var(--color-ak-oliva-light)]/10 ring-1 ring-[var(--color-ak-oliva)] dark:ring-[var(--color-ak-oliva-light)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{opt.zone_name}</span>
                          <span className="text-xs text-[var(--text-secondary)] ml-2">
                            {opt.total_capacity}p · {opt.table_count} mesas
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            (opt.total_capacity || 0) >= partySize
                              ? 'bg-[var(--color-ak-oliva)]/10 text-[var(--color-ak-oliva)] dark:bg-[var(--color-ak-oliva-light)]/10 dark:text-[var(--color-ak-oliva-light)]'
                              : 'bg-[var(--color-ak-ambar)]/10 text-[var(--color-ak-ambar)] dark:bg-[var(--color-ak-ambar-light)]/10 dark:text-[var(--color-ak-ambar-light)]'
                          }`}>
                            {(opt.total_capacity || 0) >= partySize ? 'Cubre' : `Faltan ${partySize - (opt.total_capacity || 0)}p`}
                          </span>
                          {selected?.zone_id === opt.zone_id && (
                            <Check size={16} weight="bold" className="text-[var(--color-ak-oliva)] dark:text-[var(--color-ak-oliva-light)]" />
                          )}
                        </div>
                      </div>
                      {/* Show tables in zone */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {opt.tables?.slice(0, 8).map(t => (
                          <span key={t.id} className="text-[10px] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]">
                            {t.number} ({t.capacity}p)
                          </span>
                        ))}
                        {(opt.tables?.length || 0) > 8 && (
                          <span className="text-[10px] text-[var(--text-secondary)]">+{opt.tables!.length - 8} más</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tier 2: Combinations */}
            {data.options.combinations.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <GridFour size={14} className="text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)]" />
                  Combinaciones
                </h3>
                <div className="space-y-1.5">
                  {data.options.combinations.map(opt => (
                    <button
                      key={opt.combination_id}
                      onClick={() => setSelected(opt)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selected?.combination_id === opt.combination_id
                          ? 'border-[var(--color-ak-ambar)] dark:border-[var(--color-ak-ambar-light)] bg-[var(--color-ak-ambar)]/5 dark:bg-[var(--color-ak-ambar-light)]/10 ring-1 ring-[var(--color-ak-ambar)] dark:ring-[var(--color-ak-ambar-light)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {opt.combination_name || 'Combinación'}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)] ml-2">
                            {opt.combined_capacity}p · {opt.table_count} mesas · {opt.zone_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            (opt.combined_capacity || 0) >= partySize
                              ? 'bg-[var(--color-ak-oliva)]/10 text-[var(--color-ak-oliva)] dark:bg-[var(--color-ak-oliva-light)]/10 dark:text-[var(--color-ak-oliva-light)]'
                              : 'bg-[var(--color-ak-ambar)]/10 text-[var(--color-ak-ambar)] dark:bg-[var(--color-ak-ambar-light)]/10 dark:text-[var(--color-ak-ambar-light)]'
                          }`}>
                            {(opt.combined_capacity || 0) >= partySize ? 'Cubre' : `Faltan ${partySize - (opt.combined_capacity || 0)}p`}
                          </span>
                          {selected?.combination_id === opt.combination_id && (
                            <Check size={16} weight="bold" className="text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)]" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {opt.tables?.map(t => (
                          <span key={t.id} className="text-[10px] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]">
                            {t.number} ({t.capacity}p)
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tier 3: Single Tables */}
            {data.options.single_tables.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Table size={14} className="text-[var(--text-primary)]" />
                  Mesas Individuales
                </h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {data.options.single_tables.map(opt => (
                    <button
                      key={opt.table_id}
                      onClick={() => setSelected(opt)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                        selected?.table_id === opt.table_id
                          ? 'border-[var(--color-ak-borgona)] dark:border-[var(--color-ak-borgona-light)] bg-[var(--color-ak-borgona)]/5 dark:bg-[var(--color-ak-borgona-light)]/10 ring-1 ring-[var(--color-ak-borgona)] dark:ring-[var(--color-ak-borgona-light)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            Mesa {opt.table_number}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {opt.capacity}p · {opt.zone_name}
                          </span>
                        </div>
                        {selected?.table_id === opt.table_id && (
                          <Check size={16} weight="bold" className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tier 4: Multi-Zona (when no single zone covers) */}
            {data.options.multi_zone && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Buildings size={14} className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]" />
                  Combinación Multi-Zona Sugerida
                </h3>
                <button
                  onClick={() => setSelected(data.options.multi_zone!)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selected?.type === 'multi_zone'
                      ? 'border-[var(--color-ak-borgona)] dark:border-[var(--color-ak-borgona-light)] bg-[var(--color-ak-borgona)]/5 dark:bg-[var(--color-ak-borgona-light)]/10 ring-1 ring-[var(--color-ak-borgona)] dark:ring-[var(--color-ak-borgona-light)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {data.options.multi_zone.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        data.options.multi_zone.covers
                          ? 'bg-[var(--color-ak-oliva)]/10 text-[var(--color-ak-oliva)] dark:bg-[var(--color-ak-oliva-light)]/10 dark:text-[var(--color-ak-oliva-light)]'
                          : 'bg-[var(--color-ak-ambar)]/10 text-[var(--color-ak-ambar)] dark:bg-[var(--color-ak-ambar-light)]/10 dark:text-[var(--color-ak-ambar-light)]'
                      }`}>
                        {data.options.multi_zone.covers ? 'Cubre' : `Faltan ${data.options.multi_zone.deficit}p`}
                      </span>
                      {selected?.type === 'multi_zone' && (
                        <Check size={16} weight="bold" className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]" />
                      )}
                    </div>
                  </div>
                  {/* Per-zone breakdown */}
                  <div className="space-y-1">
                    {data.options.multi_zone.zones?.map(z => (
                      <div key={z.zone_id} className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-[var(--text-primary)] min-w-[4rem]">{z.zone_name}</span>
                        <span className="text-[var(--text-secondary)]">{z.capacity_used}p de {z.total_capacity}p</span>
                        <div className="flex flex-wrap gap-0.5">
                          {z.tables?.map(t => (
                            <span key={t.id} className="text-[10px] bg-[var(--bg-primary)] px-1 py-0.5 rounded text-[var(--text-secondary)]">
                              {t.number}({t.capacity}p)
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-2">
                    {data.options.multi_zone.table_count} mesas en {data.options.multi_zone.zone_count} zonas · {data.options.multi_zone.total_capacity}p total
                  </p>
                </button>
              </div>
            )}

            {/* No options fallback */}
            {data.options.full_zones.length === 0 && data.options.combinations.length === 0 && data.options.single_tables.length === 0 && !data.options.multi_zone && (
              <div className="bg-[var(--color-ak-ambar)]/10 border border-[var(--color-ak-ambar)]/20 rounded-xl p-4 text-center mb-4">
                <Warning size={24} className="text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-primary)] font-medium">Sin opciones disponibles</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  No hay mesas, combinaciones ni zonas completas libres para {partySize}p en este horario.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-[var(--color-danger)] bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-3">{error}</p>
            )}

            {/* Action button */}
            <button
              onClick={handleAssign}
              disabled={!selected || submitting}
              className="w-full py-3 rounded-xl bg-[var(--color-ak-borgona)] text-white dark:bg-[var(--color-ak-borgona-light)] font-medium hover:bg-[var(--color-ak-borgona)] dark:hover:bg-[var(--color-ak-borgona-light)]/80 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-all"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size={16} className="animate-spin" />
                  Asignando...
                </span>
              ) : selected ? (
                `Asignar ${
                  selected.type === 'full_zone' ? `Zona ${selected.zone_name}`
                  : selected.type === 'combination' ? 'Combinación'
                  : selected.type === 'multi_zone' ? `Multi-zona (${selected.label})`
                  : `Mesa ${selected.table_number}`
                } (${getCapacity(selected)}p)`
              ) : (
                'Selecciona una opción'
              )}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
