'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Plus, Clock, Warning } from '@phosphor-icons/react'
import type { ShiftType, ShiftTypeSegment } from '@/lib/types/shifts'
import type { ShiftArea } from '@/lib/types/shifts'
import { calcularHorasSegmento } from '@/lib/utils/costCalculator'

const TURNOS_PREDETERMINADOS: Record<string, { code: string; name: string; entrada: string; salida: string }[]> = {
  cocina: [
    { code: 'A', name: 'Apertura', entrada: '06:00', salida: '14:00' },
    { code: 'S', name: 'Seguido', entrada: '10:00', salida: '22:00' },
    { code: 'C', name: 'Cierre', entrada: '14:00', salida: '22:00' },
    { code: 'CD', name: 'Cierre 14h', entrada: '14:00', salida: '22:00' },
    { code: 'CS', name: 'Cierre Steward', entrada: '16:00', salida: '22:30' },
    { code: 'P1', name: 'Partido 9', entrada: '09:00', salida: '22:00' },
    { code: 'P2', name: 'Partido 10', entrada: '10:00', salida: '22:30' },
  ],
  barra: [
    { code: 'A', name: 'Apertura', entrada: '09:00', salida: '17:00' },
    { code: 'S', name: 'Seguido', entrada: '10:00', salida: '22:00' },
    { code: 'C', name: 'Cierre', entrada: '15:00', salida: '23:00' },
    { code: 'P1', name: 'Partido', entrada: '10:00', salida: '22:00' },
  ],
  servicio: [
    { code: 'A', name: 'Apertura', entrada: '09:00', salida: '16:00' },
    { code: 'S', name: 'Seguido', entrada: '11:00', salida: '22:00' },
    { code: 'C', name: 'Cierre', entrada: '16:00', salida: '23:00' },
    { code: 'P1', name: 'Partido', entrada: '11:00', salida: '22:30' },
  ],
}

// Opciones de hora en intervalos de 30 min
const TIME_OPTIONS = (() => {
  const opts: string[] = []
  for (let h = 5; h <= 23; h++) {
    for (const m of ['00', '30']) {
      opts.push(`${String(h).padStart(2, '0')}:${m}`)
    }
  }
  opts.push('00:00') // medianoche
  return opts
})()

const JORNADA_DIARIA = 8

// Presets de turnos partidos por area
const PARTIDO_PRESETS: Record<string, { code: string; name: string; segments: { entrada: string; salida: string }[] }[]> = {
  cocina: [
    { code: 'P1', name: 'Partido 9-22', segments: [{ entrada: '09:00', salida: '13:00' }, { entrada: '17:00', salida: '22:00' }] },
    { code: 'P2', name: 'Partido 10-22', segments: [{ entrada: '10:00', salida: '14:00' }, { entrada: '18:00', salida: '22:30' }] },
  ],
  barra: [
    { code: 'P1', name: 'Partido', segments: [{ entrada: '10:00', salida: '14:00' }, { entrada: '17:00', salida: '22:00' }] },
  ],
  servicio: [
    { code: 'P1', name: 'Partido', segments: [{ entrada: '11:00', salida: '15:00' }, { entrada: '18:00', salida: '22:30' }] },
  ],
}

interface ShiftTypeModalProps {
  isOpen: boolean
  onClose: () => void
  area: ShiftArea
  shiftType?: ShiftType | null  // null = crear nuevo
  onSave: (data: {
    code: string
    name: string
    entrada: string
    salida: string
    ordinarias: number
    nocturnas: number
    is_split: boolean
    description?: string
    area: string
    segments?: { segment_index: number; entrada: string; salida: string }[]
  }) => Promise<void>
}

export default function ShiftTypeModal({ isOpen, onClose, area, shiftType, onSave }: ShiftTypeModalProps) {
  const isEditing = !!shiftType
  const [saving, setSaving] = useState(false)

  // Campos base
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [selectedArea, setSelectedArea] = useState<ShiftArea>(area)

  // Segmentos (max 2)
  const [segments, setSegments] = useState<{ entrada: string; salida: string }[]>([
    { entrada: '', salida: '' }
  ])

  // Modal cerrado = no renderizar
  if (!isOpen) return null

  // Inicializar si editando
  useEffect(() => {
    if (shiftType) {
      setCode(shiftType.code)
      setName(shiftType.name)
      setSelectedArea(shiftType.area as ShiftArea)
      if (shiftType.is_split && shiftType.segments && shiftType.segments.length > 0) {
        setSegments(shiftType.segments.map(s => ({ entrada: s.entrada, salida: s.salida })))
      } else {
        setSegments([{ entrada: shiftType.entrada.slice(0, 5), salida: shiftType.salida.slice(0, 5) }])
      }
    } else {
      setCode('')
      setName('')
      setSelectedArea(area)
      setSegments([{ entrada: '', salida: '' }])
    }
  }, [shiftType, area, isOpen])

  const isSplit = segments.length > 1

  // Calcular horas por segmento
  const segmentHours = useMemo(() => {
    return segments.map(seg => calcularHorasSegmento(seg.entrada, seg.salida))
  }, [segments])

  // Totales
  const totalOrdinarias = Math.round(segmentHours.reduce((sum, h) => sum + h.ordinarias, 0) * 10) / 10
  const totalNocturnas = Math.round(segmentHours.reduce((sum, h) => sum + h.nocturnas, 0) * 10) / 10
  const totalHoras = Math.round((totalOrdinarias + totalNocturnas) * 10) / 10
  const esExtra = totalHoras > JORNADA_DIARIA
  const primerSegmentoValido = segments[0].entrada && segments[0].salida && segmentHours[0].total > 0

  // Presets disponibles
  const simplePresets = TURNOS_PREDETERMINADOS[selectedArea] || TURNOS_PREDETERMINADOS.cocina
  const partidoPresets = PARTIDO_PRESETS[selectedArea] || PARTIDO_PRESETS.cocina

  const addSegment = () => {
    if (segments.length >= 2) return
    setSegments(prev => [...prev, { entrada: '', salida: '' }])
  }

  const removeSegment = (index: number) => {
    if (index === 0) return // No se puede eliminar el primer segmento
    setSegments(prev => prev.filter((_, i) => i !== index))
  }

  const updateSegment = (index: number, field: 'entrada' | 'salida', value: string) => {
    setSegments(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const applySimplePreset = (preset: { code: string; name: string; entrada: string; salida: string }) => {
    setCode(preset.code)
    setName(preset.name)
    setSegments([{ entrada: preset.entrada, salida: preset.salida }])
  }

  const applyPartidoPreset = (preset: { code: string; name: string; segments: { entrada: string; salida: string }[] }) => {
    setCode(preset.code)
    setName(preset.name)
    setSegments(preset.segments.map(s => ({ entrada: s.entrada, salida: s.salida })))
  }

  const handleSave = async () => {
    if (!code || !name || !primerSegmentoValido) return

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        code,
        name,
        entrada: segments[0].entrada,
        salida: isSplit ? segments[segments.length - 1].salida : segments[0].salida,
        ordinarias: totalOrdinarias,
        nocturnas: totalNocturnas,
        is_split: isSplit,
        area: selectedArea,
      }

      if (isSplit) {
        payload.segments = segments.map((seg, i) => ({
          segment_index: i + 1,
          entrada: seg.entrada,
          salida: seg.salida,
        }))
      }

      if (shiftType) {
        payload.id = shiftType.id
      }

      await onSave(payload as Parameters<typeof onSave>[0])
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave = code && name && primerSegmentoValido && !saving

  // Time select component
  const TimeSelect = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[var(--text-secondary)]">{label}</label>
      <div className="flex items-center gap-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs appearance-none"
        >
          <option value="">--:--</option>
          {TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[72px] px-1 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs text-center"
        />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl border border-[var(--border-default)] w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {isEditing ? 'Editar turno' : 'Crear turno'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Presets simples */}
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Turnos predefinidos</label>
            <div className="flex flex-wrap gap-1.5">
              {simplePresets.map((p) => (
                <button
                  key={`simple-${p.code}`}
                  onClick={() => applySimplePreset(p)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-md transition-all ${
                    code === p.code && !isSplit
                      ? 'bg-[var(--color-ak-borgona)] text-white font-semibold'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--color-ak-borgona)]/20 hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p.code} — {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Presets partidos */}
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Turnos partidos</label>
            <div className="flex flex-wrap gap-1.5">
              {partidoPresets.map((p) => (
                <button
                  key={`partido-${p.code}`}
                  onClick={() => applyPartidoPreset(p)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                    code === p.code && isSplit
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
                  }`}
                >
                  <Clock size={12} />
                  {p.code} — {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Area selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-secondary)]">Area</label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value as ShiftArea)}
              className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
            >
              <option value="cocina">Cocina</option>
              <option value="barra">Barra</option>
              <option value="servicio">Servicio</option>
            </select>
          </div>

          {/* Codigo y Nombre */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-secondary)]">Codigo</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="A, S, C..."
                maxLength={3}
                className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-secondary)]">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Apertura, Seguido..."
                className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
              />
            </div>
          </div>

          {/* Segmentos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Horarios
                {isSplit && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                    PARTIDO
                  </span>
                )}
              </label>
              {segments.length < 2 && (
                <button
                  onClick={addSegment}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                >
                  <Plus size={12} />
                  Agregar segmento
                </button>
              )}
            </div>

            {segments.map((seg, i) => (
              <div
                key={i}
                className="bg-[var(--bg-card)] rounded-lg p-3 space-y-2 border border-[var(--border-default)] relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Segmento {i + 1}
                    {i === 0 && !isSplit && ' (unico)'}
                  </span>
                  {i > 0 && (
                    <button
                      onClick={() => removeSegment(i)}
                      className="p-1 rounded hover:bg-red-500/10 text-red-400"
                      title="Eliminar segmento"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TimeSelect value={seg.entrada} onChange={(v) => updateSegment(i, 'entrada', v)} label="Entrada" />
                  <TimeSelect value={seg.salida} onChange={(v) => updateSegment(i, 'salida', v)} label="Salida" />
                </div>
                {seg.entrada && seg.salida && segmentHours[i]?.total > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-primary)] font-medium">{segmentHours[i].total}h</span>
                    <span className="text-emerald-400">HO: {segmentHours[i].ordinarias}h</span>
                    <span className={segmentHours[i].nocturnas > 0 ? 'text-amber-400' : 'text-[var(--text-secondary)]'}>
                      HN: {segmentHours[i].nocturnas}h
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resumen total */}
          {segments.some(s => s.entrada && s.salida) && (
            <div
              className="flex items-center gap-3 text-xs py-2 px-3 rounded-lg"
              style={{
                background: esExtra ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${esExtra ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`
              }}
            >
              <span style={{ color: 'var(--text-primary)' }}>
                {isSplit ? `${segments.length} segmentos` : '1 segmento'}
              </span>
              <span className="font-semibold" style={{ color: esExtra ? '#ef4444' : '#22c55e' }}>
                {totalHoras}h total
              </span>
              <span style={{ color: '#34d399' }}>HO: {totalOrdinarias}h</span>
              <span style={{ color: '#fbbf24' }}>HN: {totalNocturnas}h</span>
              {esExtra && (
                <span className="font-bold" style={{ color: '#ef4444' }}>
                  +{Number((totalHoras - JORNADA_DIARIA).toFixed(1))}h extra
                </span>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 justify-end pt-2 border-t border-[var(--border-default)]">
            <button
              onClick={onClose}
              className="text-xs px-4 py-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="text-xs px-4 py-2 rounded-lg bg-[var(--color-ak-borgona)] text-white hover:opacity-90 disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear turno'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}