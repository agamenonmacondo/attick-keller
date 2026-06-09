'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { LockSimple, LockSimpleOpen, Trash } from '@phosphor-icons/react/dist/ssr'

interface TableBlock {
  id: string
  table_id: string
  table?: { id: string; number: string; name_attick?: string; zone_id: string }
  date: string
  time_start: string
  time_end: string
  reason: string | null
  created_by_name: string | null
}

interface TableBlocksListProps {
  date: string
  blocks: TableBlock[]
  onRemove: (blockId: string) => void
  className?: string
}

export function TableBlocksList({ date, blocks, onRemove, className }: TableBlocksListProps) {
  if (blocks.length === 0) return null

  return (
    <div className={cn('space-y-1', className)}>
      <h4 className="text-sm font-semibold text-[var(--color-ak-madera)] dark:text-white/80 flex items-center gap-1.5 mb-2">
        <LockSimple size={16} weight="fill" className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]" />
        Mesas bloqueadas ({blocks.length})
      </h4>
      {blocks.map(block => (
        <div
          key={block.id}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--color-ak-borgona)]/8 dark:bg-[var(--color-ak-dorado)]/8 border border-[var(--color-ak-borgona)]/15 dark:border-[var(--color-ak-dorado)]/15"
        >
          <div className="flex items-center gap-2">
            <LockSimple size={14} className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]" />
            <div>
              <span className="text-sm font-medium text-[var(--color-ak-madera)] dark:text-white/90">
                Mesa {block.table?.number || block.table_id.slice(0, 8)}
              </span>
              <span className="text-xs text-[var(--color-ak-madera)]/60 dark:text-white/50 ml-2">
                {block.time_start} - {block.time_end}
              </span>
            </div>
            {block.reason && (
              <span className="text-xs italic text-[var(--color-ak-madera)]/50 dark:text-white/40">
                {block.reason}
              </span>
            )}
          </div>
          <button
            onClick={() => onRemove(block.id)}
            className="text-[var(--color-ak-madera)]/40 dark:text-white/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Remover bloqueo"
          >
            <Trash size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

interface TableBlockFormProps {
  date: string
  tables: Array<{ id: string; number: string; name_attick?: string; zone_name?: string; capacity: number }>
  existingBlocks: TableBlock[]
  onBlock: (block: { table_id: string; date: string; time_start: string; time_end: string; reason: string }) => Promise<void>
  onClose: () => void
  className?: string
}

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
]

export function TableBlockForm({ date, tables, existingBlocks, onBlock, onClose, className }: TableBlockFormProps) {
  const [tableId, setTableId] = useState('')
  const [timeStart, setTimeStart] = useState('18:00')
  const [timeEnd, setTimeEnd] = useState('22:00')
  const [reason, setReason] = useState('Walk-in')
  const [submitting, setSubmitting] = useState(false)

  const blockedTableIds = existingBlocks.map(b => b.table_id)
  const availableTables = tables.filter(t => !blockedTableIds.includes(t.id))

  const handleSubmit = async () => {
    if (!tableId) return
    setSubmitting(true)
    try {
      await onBlock({ table_id: tableId, date, time_start: timeStart, time_end: timeEnd, reason })
      setTableId('')
      setReason('Walk-in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn('space-y-3 p-4 rounded-lg border border-[var(--color-ak-madera)]/15 dark:border-white/10 bg-white/50 dark:bg-white/5', className)}>
      <h4 className="text-sm font-semibold text-[var(--color-ak-madera)] dark:text-white/80 flex items-center gap-1.5">
        <LockSimpleOpen size={16} className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]" />
        Bloquear mesa para walk-in
      </h4>

      <div className="grid grid-cols-3 gap-3">
        {/* Table selector */}
        <div>
          <label className="text-xs text-[var(--color-ak-madera)]/60 dark:text-white/50 block mb-1">Mesa</label>
          <select
            value={tableId}
            onChange={e => setTableId(e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded border border-[var(--color-ak-madera)]/20 dark:border-white/15 bg-white dark:bg-[#1a1a1a] text-[var(--color-ak-madera)] dark:text-white"
          >
            <option value="">Seleccionar...</option>
            {availableTables.map(t => (
              <option key={t.id} value={t.id}>
                {t.number} - {t.name_attick || t.zone_name || `Cap. ${t.capacity}`}
              </option>
            ))}
          </select>
        </div>

        {/* Time start */}
        <div>
          <label className="text-xs text-[var(--color-ak-madera)]/60 dark:text-white/50 block mb-1">Desde</label>
          <select
            value={timeStart}
            onChange={e => setTimeStart(e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded border border-[var(--color-ak-madera)]/20 dark:border-white/15 bg-white dark:bg-[#1a1a1a] text-[var(--color-ak-madera)] dark:text-white"
          >
            {TIME_SLOTS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Time end */}
        <div>
          <label className="text-xs text-[var(--color-ak-madera)]/60 dark:text-white/50 block mb-1">Hasta</label>
          <select
            value={timeEnd}
            onChange={e => setTimeEnd(e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded border border-[var(--color-ak-madera)]/20 dark:border-white/15 bg-white dark:bg-[#1a1a1a] text-[var(--color-ak-madera)] dark:text-white"
          >
            {TIME_SLOTS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="text-xs text-[var(--color-ak-madera)]/60 dark:text-white/50 block mb-1">Motivo</label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Walk-in, mantenimiento, etc."
          className="w-full px-2 py-1.5 text-sm rounded border border-[var(--color-ak-madera)]/20 dark:border-white/15 bg-white dark:bg-[#1a1a1a] text-[var(--color-ak-madera)] dark:text-white"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-[var(--color-ak-madera)]/60 dark:text-white/50 hover:text-[var(--color-ak-madera)] dark:hover:text-white"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!tableId || submitting}
          className="px-4 py-1.5 text-sm font-medium bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-dorado)] text-white dark:text-[var(--color-ak-madera)] rounded-lg disabled:opacity-50"
        >
          {submitting ? 'Bloqueando...' : 'Bloquear mesa'}
        </button>
      </div>
    </div>
  )
}