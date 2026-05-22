'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Funnel, Calendar, CaretDown, X, Clock } from '@phosphor-icons/react'
import { DayPicker } from 'react-day-picker'
import { format, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { POSDashboardFilters } from '@/lib/hooks/usePOSDashboard'
import 'react-day-picker/style.css'

interface POSFiltersBarProps {
  filters: POSDashboardFilters
  onChange: (filters: POSDashboardFilters) => void
  categoryList: Array<{ id: string; name: string }>
}

const ZONES = [
  { value: 'all', label: 'Todas las zonas' },
  { value: 'Tipi', label: 'Tipi' },
  { value: 'Attic', label: 'Attic' },
  { value: 'Chispas', label: 'Chispas' },
]

type QuickRange = 'today' | 'week' | 'month' | 'custom'

function formatDateCOP(d: Date): string {
  return format(d, 'd MMM', { locale: es })
}

export function POSFiltersBar({ filters, onChange, categoryList }: POSFiltersBarProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [quickRange, setQuickRange] = useState<QuickRange>('month')
  const calendarRef = useRef<HTMLDivElement>(null)

  // Close calendar on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false)
      }
    }
    if (showCalendar) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showCalendar])

  const handleQuickRange = (range: QuickRange) => {
    setQuickRange(range)
    const now = new Date()
    let from: string, to: string

    switch (range) {
      case 'today': {
        const today = format(now, 'yyyy-MM-dd')
        from = today
        to = today
        break
      }
      case 'week': {
        from = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        to = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        break
      }
      case 'month': {
        from = format(startOfMonth(now), 'yyyy-MM-dd')
        to = format(endOfMonth(now), 'yyyy-MM-dd')
        break
      }
      default:
        return
    }
    onChange({ ...filters, from, to })
    setShowCalendar(false)
  }

  const handleDayClick = (day: Date) => {
    const clicked = format(day, 'yyyy-MM-dd')
    // Single day selection: set both from and to same day
    setQuickRange('custom')
    onChange({ ...filters, from: clicked, to: clicked })
    setShowCalendar(false)
  }

  // Selected range display
  const rangeLabel = useMemo(() => {
    if (quickRange === 'today') return 'Hoy'
    if (quickRange === 'week') return 'Esta semana'
    if (quickRange === 'month') return 'Este mes'
    if (filters.from === filters.to) return formatDateCOP(new Date(filters.from!))
    return `${formatDateCOP(new Date(filters.from!))} - ${formatDateCOP(new Date(filters.to!))}`
  }, [quickRange, filters.from, filters.to])

  const hasActiveFilters = filters.zone !== 'all' || filters.category !== 'all' || quickRange !== 'month'

  // For the calendar, figure out which days are "selected"
  const selectedDays = useMemo(() => {
    if (!filters.from) return undefined
    const from = new Date(filters.from)
    const to = filters.to ? new Date(filters.to) : from
    if (from.getTime() === to.getTime()) return from
    return { from, to }
  }, [filters.from, filters.to])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <Funnel size={16} weight="regular" />
        <span className="font-medium">Filtros</span>
      </div>

      {/* Quick range buttons */}
      <div className="flex items-center gap-1">
        {[
          { key: 'today' as QuickRange, label: 'Hoy', icon: Clock },
          { key: 'week' as QuickRange, label: 'Semana', icon: null },
          { key: 'month' as QuickRange, label: 'Mes', icon: null },
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => handleQuickRange(btn.key)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              quickRange === btn.key
                ? 'bg-[var(--color-ak-borgona)] text-white'
                : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Date picker trigger */}
      <div className="relative" ref={calendarRef}>
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
            quickRange === 'custom'
              ? 'bg-[var(--color-ak-borgona)] text-white'
              : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Calendar size={14} weight="regular" />
          <span>{rangeLabel}</span>
        </button>

        {showCalendar && (
          <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-lg p-3 animate-in fade-in">
            <DayPicker
              mode="single"
              selected={selectedDays instanceof Date ? selectedDays : undefined}
              onDayClick={handleDayClick}
              locale={es}
              classNames={{
                month_caption: 'text-sm font-semibold text-[var(--text-primary)] mb-2',
                button_previous: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                button_next: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                day: 'text-xs w-8 h-8',
                selected: 'bg-[var(--color-ak-borgona)] text-white rounded-full font-bold',
                today: 'text-[var(--color-ak-borgona)] font-bold',
                outside: 'text-[var(--text-secondary)] opacity-40',
              }}
              footer={
                <div className="mt-3 pt-3 border-t border-[var(--border-default)] text-[10px] text-[var(--text-secondary)] text-center">
                  Selecciona un dia para ver su desempeno
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* Zone selector */}
      <div className="relative">
        <select
          value={filters.zone}
          onChange={e => onChange({ ...filters, zone: e.target.value })}
          className="appearance-none bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 pr-8 text-xs text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)]"
        >
          {ZONES.map(z => (
            <option key={z.value} value={z.value}>{z.label}</option>
          ))}
        </select>
        <CaretDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
      </div>

      {/* Category selector */}
      <div className="relative">
        <select
          value={filters.category}
          onChange={e => onChange({ ...filters, category: e.target.value })}
          className="appearance-none bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 pr-8 text-xs text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)] max-w-[200px]"
        >
          <option value="all">Todas las categorias</option>
          {categoryList.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <CaretDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={() => {
            setQuickRange('month')
            onChange({ zone: 'all', category: 'all' })
          }}
          className="flex items-center gap-1 text-[10px] text-[var(--color-ak-borgona)] hover:underline font-medium"
        >
          <X size={10} />
          Limpiar
        </button>
      )}
    </div>
  )
}