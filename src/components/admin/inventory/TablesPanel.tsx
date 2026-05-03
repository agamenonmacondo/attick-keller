'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Spinner,
  CaretDown,
  CaretRight,
  Trash,
  Warning,
} from '@phosphor-icons/react'
import { AnimatedCard } from '../shared/AnimatedCard'
import { SectionHeading } from '../shared/SectionHeading'
import { EmptyState } from '../shared/EmptyState'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { useTableInventory } from '@/lib/hooks/useTableInventory'
import type { Table, Zone, Combination } from '@/lib/types/inventory'
import { TableCard } from './TableCard'
import { ZoneEditor } from './ZoneEditor'
import { TableEditor } from './TableEditor'
import { CombinationEditor } from './CombinationEditor'

export function TablesPanel() {
  const {
    data,
    loading,
    error,
    refetch,
    toggleTable,
    deleteTable,
    deleteZone,
    deleteCombination,
  } = useTableInventory()

  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set())
  const [expandedCombos, setExpandedCombos] = useState(false)

  // Modal state
  const [showZoneEditor, setShowZoneEditor] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | undefined>(undefined)
  const [showTableEditor, setShowTableEditor] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | undefined>(undefined)
  const [newTableZoneId, setNewTableZoneId] = useState<string | undefined>(undefined)
  const [showCombinationEditor, setShowCombinationEditor] = useState(false)
  const [editingCombination, setEditingCombination] = useState<Combination | undefined>(undefined)

  // Confirm dialog state
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'zone' | 'table' | 'combination'
    id: string
    label: string
  } | null>(null)

  // Expand all zones by default when data loads
  useEffect(() => {
    if (data && data.zones.length > 0) {
      setExpandedZones(prev => {
        const next = new Set(prev)
        data.zones.forEach(z => next.add(z.id))
        return next
      })
    }
  }, [data])

  const toggleZone = (id: string) => {
    setExpandedZones(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggle = useCallback(async (id: string, active: boolean) => {
    try {
      await toggleTable(id, active)
    } catch {
      // Error handled silently
    }
  }, [toggleTable])

  const handleDeleteZone = useCallback(async () => {
    if (!confirmDelete || confirmDelete.type !== 'zone') return
    try {
      await deleteZone(confirmDelete.id)
    } catch {
      // Error handled silently
    }
    setConfirmDelete(null)
  }, [confirmDelete, deleteZone])

  const handleDeleteCombination = useCallback(async () => {
    if (!confirmDelete || confirmDelete.type !== 'combination') return
    try {
      await deleteCombination(confirmDelete.id)
    } catch {
      // Error handled silently
    }
    setConfirmDelete(null)
  }, [confirmDelete, deleteCombination])

  const openTableEditor = (table?: Table, zoneId?: string) => {
    setEditingTable(table)
    setNewTableZoneId(zoneId)
    setShowTableEditor(true)
  }

  const openZoneEditor = (zone?: Zone) => {
    setEditingZone(zone)
    setShowZoneEditor(true)
  }

  const openCombinationEditor = (combination?: Combination) => {
    setEditingCombination(combination)
    setShowCombinationEditor(true)
  }

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={32} className="animate-spin text-[#8D6E63]" />
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <Warning size={24} className="text-red-500" />
        </div>
        <p className="text-sm font-medium text-[#3E2723]">Error al cargar</p>
        <p className="mt-1 text-xs text-[#8D6E63]">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-4 rounded-lg bg-[#6B2737] px-4 py-2 text-sm font-medium text-white hover:bg-[#6B2737]/90"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!data) return null

  const { zones, tables, combinations } = data

  // Group tables by zone
  const tablesByZone = new Map<string | 'unassigned', Table[]>()
  tables.forEach(t => {
    const key = t.zone_id || 'unassigned'
    if (!tablesByZone.has(key)) tablesByZone.set(key, [])
    tablesByZone.get(key)!.push(t)
  })

  // Sort tables within each zone
  for (const [, zoneTables] of tablesByZone) {
    zoneTables.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }

  // Sort zones
  const sortedZones = [...zones].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-6 pb-20">
      {/* Header actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => openTableEditor()}
          className="flex items-center gap-1.5 rounded-lg bg-[#6B2737] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6B2737]/90 active:scale-[0.97]"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
        >
          <Plus size={16} weight="bold" />
          Nueva Mesa
        </button>
        <button
          type="button"
          onClick={() => openCombinationEditor()}
          className="flex items-center gap-1.5 rounded-lg border border-[#6B2737] px-4 py-2.5 text-sm font-medium text-[#6B2737] hover:bg-[#6B2737]/10 active:scale-[0.97]"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
        >
          <Plus size={16} weight="bold" />
          Combinacion
        </button>
      </div>

      {/* Zone sections */}
      {sortedZones.map((zone, zi) => {
        const zoneTables = tablesByZone.get(zone.id) || []
        const isExpanded = expandedZones.has(zone.id)

        return (
          <AnimatedCard key={zone.id} delay={zi * 0.06} className="rounded-xl border border-[#D7CCC8] bg-white overflow-hidden">
            {/* Zone header */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#EFEBE9]/50"
              onClick={() => toggleZone(zone.id)}
              style={{ transition: 'background-color 200ms ease-out' }}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <CaretDown size={16} className="text-[#8D6E63]" /> : <CaretRight size={16} className="text-[#8D6E63]" />}
                <h3 className="font-['Playfair_Display'] text-base font-semibold text-[#3E2723]">
                  {zone.name}
                </h3>
                <span className="text-xs text-[#8D6E63]">({zoneTables.length} {zoneTables.length === 1 ? 'mesa' : 'mesas'})</span>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => openTableEditor(undefined, zone.id)}
                  className="flex h-7 w-7 items-center justify-center rounded text-[#8D6E63] hover:bg-[#D7CCC8]/50"
                  title="Agregar mesa a esta zona"
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => openZoneEditor(zone)}
                  className="flex h-7 w-7 items-center justify-center rounded text-[#8D6E63] hover:bg-[#D7CCC8]/50"
                  title="Editar zona"
                >
                  <span className="text-xs font-medium">&#9998;</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete({ type: 'zone', id: zone.id, label: zone.name })}
                  className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600"
                  title="Eliminar zona"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>

            {/* Tables grid */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-[#D7CCC8] px-5 py-4">
                    {zoneTables.length === 0 ? (
                      <p className="py-4 text-center text-sm text-[#8D6E63]">Sin mesas en esta zona</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {zoneTables.map((table, ti) => (
                          <motion.div
                            key={table.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: ti * 0.04, duration: 0.2 }}
                          >
                            <TableCard
                              table={table}
                              onToggle={handleToggle}
                              onEdit={openTableEditor}
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </AnimatedCard>
        )
      })}

      {/* Unassigned tables */}
      {tablesByZone.has('unassigned') && (
        <AnimatedCard delay={sortedZones.length * 0.06} className="rounded-xl border border-[#D7CCC8] bg-white overflow-hidden">
          <div className="px-5 py-4">
            <SectionHeading>Sin zona ({tablesByZone.get('unassigned')!.length} mesas)</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              {tablesByZone.get('unassigned')!.map((table, ti) => (
                <motion.div
                  key={table.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ti * 0.04, duration: 0.2 }}
                >
                  <TableCard
                    table={table}
                    onToggle={handleToggle}
                    onEdit={openTableEditor}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Combinations section */}
      {combinations.length > 0 && (
        <AnimatedCard delay={(sortedZones.length + 1) * 0.06} className="rounded-xl border border-[#D7CCC8] bg-white overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#EFEBE9]/50"
            onClick={() => setExpandedCombos(!expandedCombos)}
            style={{ transition: 'background-color 200ms ease-out' }}
          >
            <div className="flex items-center gap-2">
              {expandedCombos ? <CaretDown size={16} className="text-[#8D6E63]" /> : <CaretRight size={16} className="text-[#8D6E63]" />}
              <h3 className="font-['Playfair_Display'] text-base font-semibold text-[#3E2723]">
                Combinaciones
              </h3>
              <span className="text-xs text-[#8D6E63]">({combinations.length})</span>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); openCombinationEditor() }}
              className="flex h-7 w-7 items-center justify-center rounded text-[#8D6E63] hover:bg-[#D7CCC8]/50"
              title="Nueva combinacion"
            >
              <Plus size={14} />
            </button>
          </div>
          <AnimatePresence>
            {expandedCombos && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="border-t border-[#D7CCC8] px-5 py-4 space-y-2">
                  {combinations.map(combo => (
                    <div
                      key={combo.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        combo.is_active ? 'border-[#D7CCC8]' : 'border-red-100 bg-red-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#3E2723]">
                          {combo.name || `Combinacion ${combo.table_ids.length} mesas`}
                        </span>
                        <span className="text-xs text-[#8D6E63]">{combo.combined_capacity} pers.</span>
                        {!combo.is_active && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-medium text-red-500">Inactiva</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openCombinationEditor(combo)}
                          className="flex h-7 w-7 items-center justify-center rounded text-[#8D6E63] hover:bg-[#D7CCC8]/50"
                          title="Editar combinacion"
                        >
                          <span className="text-xs font-medium">&#9998;</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete({ type: 'combination', id: combo.id, label: combo.name || 'Combinacion' })}
                          className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar combinacion"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatedCard>
      )}

      {/* Empty state */}
      {zones.length === 0 && tables.length === 0 && (
        <EmptyState
          icon={<span className="text-2xl">&#127860;</span>}
          title="No hay mesas ni zonas"
          description="Crea una zona o mesa para empezar"
        />
      )}

      {/* FAB - Add Zone */}
      <button
        type="button"
        onClick={() => openZoneEditor()}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#6B2737] text-white shadow-lg hover:bg-[#6B2737]/90 active:scale-[0.93]"
        style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
        title="Nueva zona"
      >
        <Plus size={24} weight="bold" />
      </button>

      {/* Zone Editor Modal */}
      {showZoneEditor && (
        <ZoneEditor
          zone={editingZone}
          onClose={() => { setShowZoneEditor(false); setEditingZone(undefined) }}
          onSave={refetch}
        />
      )}

      {/* Table Editor Modal */}
      {showTableEditor && (
        <TableEditor
          table={editingTable}
          zoneId={newTableZoneId}
          zones={zones}
          onClose={() => { setShowTableEditor(false); setEditingTable(undefined); setNewTableZoneId(undefined) }}
          onSave={refetch}
        />
      )}

      {/* Combination Editor Modal */}
      {showCombinationEditor && (
        <CombinationEditor
          combination={editingCombination}
          tables={tables}
          onClose={() => { setShowCombinationEditor(false); setEditingCombination(undefined) }}
          onSave={refetch}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete ? `Eliminar ${confirmDelete.type === 'zone' ? 'zona' : confirmDelete.type === 'table' ? 'mesa' : 'combinacion'}` : ''}
        description={confirmDelete ? `¿Estas seguro de eliminar "${confirmDelete.label}"?` : ''}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={confirmDelete?.type === 'combination' ? handleDeleteCombination : handleDeleteZone}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
