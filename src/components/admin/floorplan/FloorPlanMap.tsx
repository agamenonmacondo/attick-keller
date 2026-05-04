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
  CaretDown,
  CaretRight,
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

// Zone colors — each zone gets a distinct color for its hotspots
const ZONE_COLORS: Record<string, string> = {
  'Taller': '#8B5E3C',     // warm brown
  'Salón Central': '#6B2737', // burgundy
  'Barra': '#4A7C59',     // deep green
  'Tipi': '#7B68EE',      // medium slate blue
  'Semi-Privado': '#D4922A', // gold
  'Jardín': '#2E8B57',    // sea green
  'Chispas': '#CD5C5C',   // indian red
  'Ático': '#4682B4',     // steel blue
  'Attic': '#4682B4',     // steel blue
  'Lounge': '#4682B4',    // steel blue
}

const ZONE_BG: Record<string, string> = {
  'Taller': '#8B5E3C15',
  'Salón Central': '#6B273715',
  'Barra': '#4A7C5915',
  'Tipi': '#7B68EE15',
  'Semi-Privado': '#D4922A15',
  'Jardín': '#2E8B5715',
  'Chispas': '#CD5C5C15',
  'Ático': '#4682B415',
  'Attic': '#4682B415',
  'Lounge': '#4682B415',
}

const DEFAULT_ZONE_COLOR = '#8D6E63'

function getZoneColor(zoneName: string | null): string {
  if (!zoneName) return DEFAULT_ZONE_COLOR
  return ZONE_COLORS[zoneName] ?? DEFAULT_ZONE_COLOR
}

function getZoneBg(zoneName: string | null): string {
  if (!zoneName) return '#8D6E6315'
  return ZONE_BG[zoneName] ?? '#8D6E6315'
}

// ── TableHotspot with zone color ────────────────────────────────────────

function TableHotspot({
  table,
  editMode,
  onDragEnd,
  onSelect,
  zoneColor,
}: {
  table: TableWithPosition
  editMode: boolean
  onDragEnd: (id: string, x: number, y: number) => void
  onSelect: (table: TableWithPosition) => void
  zoneColor: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)

  const statusColor = STATUS_COLORS[table.status]
  const label = table.name_attick || `Mesa ${table.number}`

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
    [editMode, onSelect, table],
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
    [dragging],
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
          editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:shadow-xl',
        )}
        style={{
          borderColor: zoneColor,
          backgroundColor: zoneColor + '20',
          width: editMode ? 48 : 44,
          height: editMode ? 48 : 44,
          boxShadow: dragging ? `0 0 20px ${zoneColor}66` : undefined,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <span className="text-[10px] font-bold leading-none text-[#3E2723]">{label}</span>
        <span className="text-[8px] text-[#8D6E63]">
          <Users size={8} className="inline" /> {table.capacity}
        </span>
        {/* Status dot */}
        <div
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white"
          style={{ backgroundColor: statusColor }}
        />
        {editMode && (
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white"
            style={{ backgroundColor: zoneColor }}
          />
        )}
      </motion.button>
      {/* Tooltip on hover when not in edit mode */}
      {!editMode && table.reservation_id && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 pointer-events-none whitespace-nowrap"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
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

// ── Collapsible zone group in sidebar ───────────────────────────────────

function ZoneGroup({
  zoneName,
  zoneColor,
  tables,
  editMode,
  onPosition,
  defaultOpen = true,
}: {
  zoneName: string
  zoneColor: string
  tables: UnpositionedTable[]
  editMode: boolean
  onPosition: (table: UnpositionedTable) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-[#D7CCC8] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white hover:bg-[#F5EDE0] transition-colors"
      >
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zoneColor }} />
        <span className="text-xs font-semibold text-[#3E2723] flex-1 text-left">{zoneName}</span>
        <span className="text-[10px] text-[#8D6E63]">{tables.length} mesas</span>
        {open ? <CaretDown size={12} className="text-[#8D6E63]" /> : <CaretRight size={12} className="text-[#8D6E63]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 space-y-1.5 bg-[#FAFAF8]">
              {tables.map((table) => (
                <motion.div
                  key={table.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md border border-[#D7CCC8] bg-white text-xs',
                    editMode && 'cursor-pointer hover:border-[#5C7A4D] hover:bg-[#5C7A4D]/5',
                  )}
                  onClick={() => editMode && onPosition(table)}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: zoneColor }} />
                  <span className="font-medium text-[#3E2723] truncate flex-1">
                    {table.name_attick || `Mesa ${table.number}`}
                  </span>
                  <span className="text-[#8D6E63]">
                    <Users size={10} className="inline mr-0.5" />
                    {table.capacity}
                  </span>
                  {editMode && (
                    <span className="text-[#5C7A4D] text-[9px] font-medium ml-1 shrink-0">Posicionar</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Table Detail Card ────────────────────────────────────────────────────

function TableDetailCard({ table, zoneColor, onClose }: { table: TableWithPosition; zoneColor: string; onClose: () => void }) {
  const statusColor = STATUS_COLORS[table.status]
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="bg-white rounded-xl border border-[#D7CCC8] shadow-lg p-4 min-w-[220px]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zoneColor }} />
          <div>
            <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#3E2723]">
              {table.name_attick || `Mesa ${table.number}`}
            </h3>
            <p className="text-xs text-[#8D6E63]">Mesa {table.number}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#D7CCC8]/50 transition-colors"
        >
          <X size={16} className="text-[#8D6E63]" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor }} />
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
  const [activeFloor, setActiveFloor] = useState(0)
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

  // Build a zone_name lookup for positioned tables
  const zoneNameMap = useMemo(() => {
    const map = new Map<string, string>()
    if (!currentFloor) return map
    for (const zone of currentFloor.zones) {
      for (const table of zone.tables) {
        map.set(table.id, zone.name)
      }
    }
    return map
  }, [currentFloor])

  // Group unpositioned tables by zone_name
  const unpositionedByZone = useMemo(() => {
    const groups = new Map<string, UnpositionedTable[]>()
    const zoneOrder: string[] = []

    for (const table of unpositionedTables) {
      const key = table.zone_name || 'Sin zona'
      if (!groups.has(key)) {
        groups.set(key, [])
        zoneOrder.push(key)
      }
      groups.get(key)!.push(table)
    }

    return { groups, zoneOrder }
  }, [unpositionedTables])

  // Drag end handler
  const handleDragEnd = useCallback(
    (tableId: string, x: number, y: number) => {
      pendingUpdates.current.set(tableId, { position_x: x, position_y: y })

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
    [refetch],
  )

  const handleUnpositionedClick = useCallback(
    (table: UnpositionedTable) => {
      if (!editMode) return
      handleDragEnd(table.id, 50, 50)
    },
    [editMode, handleDragEnd],
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
                    : 'bg-white text-[#8D6E63] hover:text-[#3E2723] hover:bg-[#D7CCC8]/30',
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
                : 'bg-white text-[#3E2723] border-[#D7CCC8] hover:border-[#5C7A4D]',
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

        {/* Zone color legend */}
        {currentFloor && (
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {currentFloor.zones.map((zone) => (
              <span key={zone.id} className="flex items-center gap-1 text-[11px] text-[#8D6E63]">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: getZoneColor(zone.name) }}
                />
                {zone.name}
              </span>
            ))}
            <span className="text-[#D7CCC8] mx-1">|</span>
            <span className="flex items-center gap-1 text-[11px] text-[#8D6E63]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#5C7A4D' }} /> Libre
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#8D6E63]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#D4922A' }} /> Reservada
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#8D6E63]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6B2737' }} /> Ocupada
            </span>
          </div>
        )}

        {/* Map Container */}
        <div className="flex-1 rounded-xl border border-[#D7CCC8] bg-white overflow-auto relative">
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: zoom !== 1 ? `${100 / zoom}%` : undefined,
            }}
          >
            {currentFloor && (
              <div className="relative inline-block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentFloor.image_url}
                  alt={`Plano ${currentFloor.name}`}
                  className="w-full h-auto block select-none pointer-events-none"
                  draggable={false}
                />
                {/* Hotspots overlay */}
                <div className="absolute inset-0">
                  <AnimatePresence>
                    {currentFloorTables
                      .filter((t) => t.position_x !== null && t.position_y !== null)
                      .map((table) => {
                        // Find zone name for this table
                        const zoneName = zoneNameMap.get(table.id) ?? null
                        return (
                          <TableHotspot
                            key={table.id}
                            table={table}
                            editMode={editMode}
                            onDragEnd={handleDragEnd}
                            onSelect={setSelectedTable}
                            zoneColor={getZoneColor(zoneName)}
                          />
                        )
                      })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Selected Table Detail */}
          <AnimatePresence>
            {selectedTable && !editMode && (
              <div className="absolute bottom-4 right-4 z-30">
                <TableDetailCard
                  table={selectedTable}
                  zoneColor={getZoneColor(zoneNameMap.get(selectedTable.id) ?? null)}
                  onClose={() => setSelectedTable(null)}
                />
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
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">
        {/* Mesas sin posición — collapsed by zone */}
        <div className="bg-white rounded-xl border border-[#D7CCC8] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Warning size={16} className="text-[#D4922A]" weight="fill" />
            <h3 className="text-sm font-semibold text-[#3E2723]">Mesas sin posición</h3>
            <span className="text-[10px] text-[#8D6E63] ml-auto">{unpositionedTables.length} total</span>
          </div>
          {unpositionedTables.length === 0 ? (
            <p className="text-xs text-[#8D6E63]">
              ✅ Todas las mesas están posicionadas en el plano.
            </p>
          ) : (
            <div className="space-y-2">
              {unpositionedByZone.zoneOrder.map((zoneName) => {
                const tables = unpositionedByZone.groups.get(zoneName) ?? []
                const color = getZoneColor(zoneName)
                return (
                  <ZoneGroup
                    key={zoneName}
                    zoneName={zoneName}
                    zoneColor={color}
                    tables={tables}
                    editMode={editMode}
                    onPosition={handleUnpositionedClick}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Floor Summary */}
        {currentFloor && (
          <div className="bg-white rounded-xl border border-[#D7CCC8] p-3">
            <h3 className="text-sm font-semibold text-[#3E2723] mb-3 flex items-center gap-2">
              <MapTrifold size={16} className="text-[#6B2737]" />
              {currentFloor.name} — Resumen
            </h3>
            <div className="space-y-2">
              {currentFloor.zones.map((zone) => {
                const color = getZoneColor(zone.name)
                return (
                  <div key={zone.id} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-[#3E2723]">{zone.name}</span>
                      <span className="text-[#8D6E63] ml-auto">{zone.tables.length} mesas</span>
                    </div>
                    <div className="flex gap-3 text-[#8D6E63] mt-0.5 ml-4">
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
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}