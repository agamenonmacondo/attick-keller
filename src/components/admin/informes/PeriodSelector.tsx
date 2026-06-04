'use client'

import { useMemo } from 'react'

export type PeriodPreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom'

interface PeriodSelectorProps {
  preset: PeriodPreset
  from: string
  to: string
  zone: string
  zones: { value: string; label: string }[]
  onPresetChange: (preset: PeriodPreset, from: string, to: string) => void
  onCustomFromChange: (from: string) => void
  onCustomToChange: (to: string) => void
  onZoneChange: (zone: string) => void
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getPresetDates(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'today':
      return { from: formatDate(today), to: formatDate(today) }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { from: formatDate(y), to: formatDate(y) }
    }
    case 'thisWeek': {
      // Monday to Sunday
      const day = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((day + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: formatDate(monday), to: formatDate(sunday) }
    }
    case 'lastWeek': {
      const day = today.getDay()
      const thisMonday = new Date(today)
      thisMonday.setDate(today.getDate() - ((day + 6) % 7))
      const lastMonday = new Date(thisMonday)
      lastMonday.setDate(thisMonday.getDate() - 7)
      const lastSunday = new Date(lastMonday)
      lastSunday.setDate(lastMonday.getDate() + 6)
      return { from: formatDate(lastMonday), to: formatDate(lastSunday) }
    }
    case 'thisMonth': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from: formatDate(from), to: formatDate(to) }
    }
    case 'lastMonth': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const to = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: formatDate(from), to: formatDate(to) }
    }
    default:
      return { from: formatDate(today), to: formatDate(today) }
  }
}

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'thisWeek', label: 'Esta semana' },
  { key: 'lastWeek', label: 'Sem. pasada' },
  { key: 'thisMonth', label: 'Este mes' },
  { key: 'lastMonth', label: 'Mes pasado' },
  { key: 'custom', label: 'Personalizado' },
]

export function PeriodSelector({
  preset,
  from,
  to,
  zone,
  zones,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  onZoneChange,
}: PeriodSelectorProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              if (p.key === 'custom') {
                onPresetChange('custom', from, to)
              } else {
                const dates = getPresetDates(p.key)
                onPresetChange(p.key, dates.from, dates.to)
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              preset === p.key
                ? 'bg-[var(--color-ak-borgona)] text-white border-[var(--color-ak-borgona)]'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-[var(--text-secondary)]">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)]"
          />
          <label className="text-xs text-[var(--text-secondary)]">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)]"
          />
        </div>
      )}

      {zones.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-secondary)]">Zona</label>
          <select
            value={zone}
            onChange={(e) => onZoneChange(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)]"
          >
            {zones.map((z) => (
              <option key={z.value} value={z.value}>{z.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

export { getPresetDates }