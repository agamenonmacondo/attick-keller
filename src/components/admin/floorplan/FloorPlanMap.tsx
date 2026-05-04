'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapTrifold,
  PencilSimple,
  ArrowsOut,
  Check,
  X,
  Spinner,
  Table,
  Users,
  Clock,
  Warning,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'
import { useFloorPlan, type FloorPlanFloor, type TableWithPosition, type UnpositionedTable, type TableStatus } from '@/lib/hooks/useFloorPlan'

// ── Constants ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#5C7A4D',
  reserved: '#D4922A',
  seated: '#6B2737',
}

const STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Disponible',
  reserved: 'Reservada',
  seated: 'Ocupada',
}

// ── Sub-components ──────────────────────────────────────────────────────

function TableHotspot({
  table,
  editMode,
  onDragEnd,
  onSelect,
}: {
  table: TableWithPosition
  editMode: boolean
  onDragEnd: (id: string, x: number, y: number) => void
  onSelect: (table: TableWithPosition) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)

  const color = STATUS_COLORS[table.status]
  const label = table.name_attick || table.number

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!editMode) {
        onSelect(table)
        return
      }
      e.stopPropagation()
      setDragging(true)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [editMode, onSelect, table]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !containerRef.current?.parentElement) return
      const parent = containerRef.current.parentElement
      const rect = parent.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setDragOffset({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => {
    if (dragging && dragOffset) {
      onDragEnd(table.id, dragOffset.x, dragOffset.y)
    }
    setDragging(false)
    setDragOffset(null)
  }, [dragging, dragOffset, onDragEnd, table.id])

  const posX = dragOffset ? dragOffset.x : table.position_x ?? 50
  const posY = dragOffset ? dragOffset.y : table.position_y ?? 50

  return (
    <div
      ref={containerRef}
      className="absolute z-10"
      style={{ left: `${posX}%`, top: `${posY}%`, transform: 'translate(-50%, -50%)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <motion.button
        className={cn(
          'relative flex flex-col items-center justify-center rounded-full border-2 shadow-lg transition-shadow',
          editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:shadow-xl'
        )}
        style={{
          borderColor: color,
          backgroundColor: color + '20',
          width: editMode ? 48 : 44,
          height: editMode ? 48 : 44,
          boxShadow: dragging ? `0 0 20px ${color}66` : undefined,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <span className="text-[10px] font-bold leading-none text-[#3E2723]">{label}</span>
        <span className="text-[8px] text-[#8D6E63]">
          <Users size={8} className="inline" /> {table.capacity}
        </span>
        {editMode && (
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white"
            style={{ backgroundColor: color }}
          />
        )}
      </motion.button>
      {/* Tooltip on hover */}
      {!editMode && table.reservation_id && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 pointer-events-none whitespace-nowrap"
          initial={{ opacity: 0, y: 4 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.15 }}
        >
          <div className="bg-[#3E2723] text-white text-[9px] rounded px-1.5 py-0.5 shadow-md">
            {table.customer_name} · {table.time_range}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function UnpositionedTableCard({
  table,
  editMode,
  onPosition,
}: {
  table: UnpositionedTable
  editMode: boolean
  onPosition: (table: UnpositionedTable) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border border-[#D7CCC8] bg-white',
        editMode && 'cursor-pointer hover:border-[#5C7A4D] hover:bg-[#5C7A4D]/5'
      )}
      onClick={() => editMode && onPosition(table)}
    >
      <Table size={16} className="text-[#8D6E63] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#3E2723] truncate">
          {table.name_attick || table.number}
        </p>
        <p className="text-[10px] text-[#8D6E63]">
          <Users size={8} className="inline mr-0.5" />
          {table.capacity} personas
        </p>
      </div>
      {editMode && (
        <span className="text-[9px] text-[#5C7A4D] font-medium">Posicionar</span>
      )}
    </motion.div>
  )
}

function TableDetailCard({ table, onClose }: { table: TableWithPosition; onClose: () => void }) {
  const color = STATUS_COLORS[table.status]
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="bg-white rounded-xl border border-[#D7CCC8] shadow-lg p-4 min-w-[220px]"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#3E2723]">
            {table.name_attick || table.number}
          </h3>
          <p className="text-xs text-[#8D6E63]">Mesa {table.number}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#D7CCC8]/50 transition-colors"
        >
          <X size={16} className="text-[#8D6E63]" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium text-[#3E2723]">
          {STATUS_LABELS[table.status]}
        </span>
      </div>
      <div className="space-y-1 text-xs text-[#8D6E63]">
        <p><Users size={12} className="inline mr-1" /> Capacidad: {table.capacity} personas</p>
        {table.can_combine && (
          <p className="text-[#5C7A4D]"><Check size={12} className="inline mr-1" /> Combinable</p>
        )}
        {table.customer_name && (
          <p><Users size={12} className="inline mr-1" /> {table.customer_name}</p>
        )}
        {table.time_range && (
          <p><Clock size={12} className="inline mr-1" /> {table.time_range}</p>
        )}
        {table.party_size && (
          <p><Users size={12} className="inline mr-1" /> {table.party_size} personas</p>
        )}
      </div>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────

export function FloorPlanMap() {
  const { floors, unpositionedTables, loading, refetch } = useFloorPlan()
  const [activeFloor, setActiveFloor] = useState(0) // index into floors[]
  const [editMode, setEditMode] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableWithPosition | null>(null)
  const [saving, setSaving] = useState(false)
  const [zoom, setZoom] = useState(1)
  const pendingUpdates = useRef<Map<string, { position_x: number; position_y: number }>>(new Map())
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentFloor: FloorPlanFloor | undefined = floors[activeFloor]

  // All tables for the current floor (flat across zones)
  const currentFloorTables = useMemo<TableWithPosition[]>(() => {
    if (!currentFloor) return []
    return currentFloor.zones.flatMap((z) => z.tables)
  }, [currentFloor])

  // Unpositioned on current floor
  const unpositionedOnFloor = useMemo<UnpositionedTable[]>(() => {
    if (!currentFloor) return unpositionedTables
    // Show all unpositioned tables
    return unpositionedTables
  }, [unpositionedTables, currentFloor])

  // Drag end handler: save position
  const handleDragEnd = useCallback(
    (tableId: string, x: number, y: number) => {
      // Optimistically update local state via refetch later
      pendingUpdates.current.set(tableId, { position_x: x, position_y: y })

      // Debounce saving
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        const updates = Array.from(pendingUpdates.current.entries()).map(([id, pos]) => ({
          id,
          ...pos,
        }))
        if (updates.length === 0) return

        setSaving(true)
        try {
          const res = await fetch('/api/admin/floorplan', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tables: updates }),
          })
          if (res.ok) {
            pendingUpdates.current.clear()
            refetch()
          }
        } finally {
          setSaving(false)
        }
      }, 600)
    },
    [refetch]
  )

  const handleUnpositionedClick = useCallback(
    (table: UnpositionedTable) => {
      if (!editMode) return
      // Place table in center of current floor plan — user can then drag it
      handleDragEnd(table.id, 50, 50)
    },
    [editMode, handleDragEnd]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} className="animate-spin text-[#8D6E63]" />
      </div>
    )
  }

  if (floors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8D6E63]">
        <MapTrifold size={48} className="mb-3 opacity-40" />
        <p className="text-lg font-semibold">No hay datos de pisos</p>
        <p className="text-sm">Configura las zonas y mesas primero.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-8rem)]">
      {/* ── Main Map Area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Floor tabs */}
          <div className="flex rounded-lg border border-[#D7CCC8] bg-white overflow-hidden">
            {floors.map((floor, idx) => (
              <button
                key={floor.floor_num}
                onClick={() => { setActiveFloor(idx); setSelectedTable(null) }}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  idx === activeFloor
                    ? 'bg-[#6B2737] text-white'
                    : 'bg-white text-[#8D6E63] hover:text-[#3E2723] hover:bg-[#D7CCC8]/30'
                )}
              >
                {floor.name}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-1.5 rounded border border-[#D7CCC8] bg-white text-[#8D6E63] hover:text-[#3E2723] transition-colors"
              title="Alejar"
            >
              −
            </button>
            <span className="text-xs text-[#8D6E63] w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="p-1.5 rounded border border-[#D7CCC8] bg-white text-[#8D6E63] hover:text-[#3E2723] transition-colors"
              title="Acercar"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 rounded border border-[#D7CCC8] bg-white text-[#8D6E63] hover:text-[#3E2723] transition-colors ml-1"
              title="Reiniciar zoom"
            >
              <ArrowsOut size={14} />
            </button>
          </div>

          {/* Edit mode toggle */}
          <button
            onClick={() => {
              setEditMode(!editMode)
              setSelectedTable(null)
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
              editMode
                ? 'bg-[#5C7A4D] text-white border-[#5C7A4D]'
                : 'bg-white text-[#3E2723] border-[#D7CCC8] hover:border-[#5C7A4D]'
            )}
          >
            {editMode ? <Check size={16} /> : <PencilSimple size={16} />}
            {editMode ? 'Guardar' : 'Editar'}
          </button>

          {saving && (
            <span className="text-xs text-[#8D6E63] flex items-center gap-1">
              <Spinner size={12} className="animate-spin" /> Guardando...
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 text-xs text-[#8D6E63]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#5C7A4D' }} /> Disponible
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#D4922A' }} /> Reservada
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6B2737' }} /> Ocupada
          </span>
        </div>

        {/* Map Container */}
        <div className="flex-1 rounded-xl border border-[#D7CCC8] bg-white overflow-auto relative">
          <div
            className="relative w-full h-full min-h-[400px]"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            {/* Floor plan SVG background */}
            {currentFloor && (
              <div
                className="w-full h-full min-h-[400px] bg-cover bg-no-repeat bg-center"
                style={{ backgroundImage: `url(${currentFloor.image_url})` }}
              >
                {/* Hotspots overlay */}
                <div className="relative w-full h-full min-h-[400px]">
                  <AnimatePresence>
                    {currentFloorTables
                      .filter((t) => t.position_x !== null && t.position_y !== null)
                      .map((table) => (
                        <TableHotspot
                          key={table.id}
                          table={table}
                          editMode={editMode}
                          onDragEnd={handleDragEnd}
                          onSelect={setSelectedTable}
                        />
                      ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Selected Table Detail */}
          <AnimatePresence>
            {selectedTable && !editMode && (
              <div className="absolute bottom-4 right-4 z-30">
                <TableDetailCard table={selectedTable} onClose={() => setSelectedTable(null)} />
              </div>
            )}
          </AnimatePresence>

          {editMode && (
            <div className="absolute top-3 left-3 z-20 bg-[#5C7A4D]/90 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-sm">
              <PencilSimple size={14} />
              Modo edición — arrastra las mesas para reposicionar
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        {/* Unpositioned Tables */}
        <div className="bg-white rounded-xl border border-[#D7CCC8] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Warning size={18} className="text-[#D4922A]" weight="fill" />
            <h3 className="text-sm font-semibold text-[#3E2723]">Mesas sin posición</h3>
          </div>
          {unpositionedOnFloor.length === 0 ? (
            <p className="text-xs text-[#8D6E63]">
              Todas las mesas están posicionadas en el plano.
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <AnimatePresence>
                {unpositionedOnFloor.map((table) => (
                  <UnpositionedTableCard
                    key={table.id}
                    table={table}
                    editMode={editMode}
                    onPosition={handleUnpositionedClick}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Floor Summary */}
        {currentFloor && (
          <div className="bg-white rounded-xl border border-[#D7CCC8] p-4">
            <h3 className="text-sm font-semibold text-[#3E2723] mb-3 flex items-center gap-2">
              <MapTrifold size={18} className="text-[#6B2737]" />
              {currentFloor.name} — Resumen
            </h3>
            <div className="space-y-2">
              {currentFloor.zones.map((zone) => (
                <div key={zone.id} className="text-xs">
                  <p className="font-medium text-[#3E2723]">{zone.name}</p>
                  <div className="flex gap-3 text-[#8D6E63] mt-0.5">
                    <span className="text-[#5C7A4D]">
                      {zone.tables.filter((t) => t.status === 'available').length} libres
                    </span>
                    <span className="text-[#D4922A]">
                      {zone.tables.filter((t) => t.status === 'reserved').length} reservadas
                    </span>
                    <span className="text-[#6B2737]">
                      {zone.tables.filter((t) => t.status === 'seated').length} ocupadas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}