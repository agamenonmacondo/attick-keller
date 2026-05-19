'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MagnifyingGlass, Tag, Envelope, CalendarBlank, ChartBar, Funnel, X, SortAscending } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'

interface Tag {
  id: string
  name: string
  color: string
}

interface FiltersState {
  q: string
  selectedTagIds: string[]
  hasEmail: string
  minVisits: number
  lastVisitDays: number
  sort: string
  order: string
}

interface CustomerFiltersProps {
  tags: Tag[]
  initialFilters?: {
    q: string; tag_ids: string; has_email: string; min_visits: number; last_visit_days: number; sort?: string; order?: string
  }
  onApply: (filters: {
    q: string; tag_ids: string; has_email: string; min_visits: number; last_visit_days: number; sort: string; order: string
  }) => void
  onCreateTag: () => void
}

const LAST_VISIT_PRESETS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '60 dias', value: 60 },
  { label: '90 dias', value: 90 },
]

const SORT_OPTIONS = [
  { label: 'Mas recientes', value: 'created_at', order: 'desc' },
  { label: 'Mas antiguos', value: 'created_at', order: 'asc' },
  { label: 'Nombre A-Z', value: 'full_name', order: 'asc' },
  { label: 'Nombre Z-A', value: 'full_name', order: 'desc' },
  { label: 'Telefono', value: 'phone', order: 'asc' },
  { label: 'Email', value: 'email', order: 'asc' },
]

export function CustomerFilters({ tags, initialFilters, onApply, onCreateTag }: CustomerFiltersProps) {
  const [filters, setFilters] = useState<FiltersState>({
    q: initialFilters?.q || '',
    selectedTagIds: initialFilters?.tag_ids ? initialFilters.tag_ids.split(',').filter(Boolean) : [],
    hasEmail: initialFilters?.has_email || '',
    minVisits: initialFilters?.min_visits || 0,
    lastVisitDays: initialFilters?.last_visit_days || 0,
    sort: initialFilters?.sort || 'created_at',
    order: initialFilters?.order || 'desc',
  })

  const [searchInput, setSearchInput] = useState(initialFilters?.q || '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (initialFilters) {
      setFilters({
        q: initialFilters.q || '',
        selectedTagIds: initialFilters.tag_ids ? initialFilters.tag_ids.split(',').filter(Boolean) : [],
        hasEmail: initialFilters.has_email || '',
        minVisits: initialFilters.min_visits || 0,
        lastVisitDays: initialFilters.last_visit_days || 0,
        sort: initialFilters.sort || 'created_at',
        order: initialFilters.order || 'desc',
      })
      setSearchInput(initialFilters.q || '')
    }
  }, [initialFilters])

  const toggleTag = useCallback((tagId: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTagIds: prev.selectedTagIds.includes(tagId)
        ? prev.selectedTagIds.filter(id => id !== tagId)
        : [...prev.selectedTagIds, tagId],
    }))
  }, [])

  const handleSearchInput = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, q: value }))
    }, 300)
  }, [])

  const apply = useCallback(() => {
    onApply({
      q: filters.q,
      tag_ids: filters.selectedTagIds.join(','),
      has_email: filters.hasEmail,
      min_visits: filters.minVisits,
      last_visit_days: filters.lastVisitDays,
      sort: filters.sort,
      order: filters.order,
    })
  }, [filters, onApply])

  // Auto-apply when sort/order changes
  useEffect(() => {
    if (initialFilters) return // skip initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.sort, filters.order])

  const clear = useCallback(() => {
    const cleared: FiltersState = { q: '', selectedTagIds: [], hasEmail: '', minVisits: 0, lastVisitDays: 0, sort: 'created_at', order: 'desc' }
    setFilters(cleared)
    setSearchInput('')
    onApply({ q: '', tag_ids: '', has_email: '', min_visits: 0, last_visit_days: 0, sort: 'created_at', order: 'desc' })
  }, [onApply])

  return (
    <div className="space-y-5">
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-[#8D6E63] mb-1.5">
          <MagnifyingGlass size={14} /> Buscar
        </label>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="Nombre, telefono o email..."
          className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] placeholder:text-[#BCAAA4] focus:border-[#6B2737] focus:outline-none"
        />
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-[#8D6E63] mb-1.5">
          <SortAscending size={14} /> Ordenar
        </label>
        <select
          value={`${filters.sort}:${filters.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split(':')
            setFilters(prev => ({ ...prev, sort, order }))
          }}
          className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={`${opt.value}:${opt.order}`} value={`${opt.value}:${opt.order}`}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-[#8D6E63]">
            <Tag size={14} /> Etiquetas
          </label>
          <button
            type="button"
            onClick={onCreateTag}
            className="text-[10px] text-[#6B2737] font-medium hover:underline"
          >
            + Nueva
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 && (
            <p className="text-[10px] text-[#BCAAA4] py-1">Sin etiquetas creadas</p>
          )}
          {tags.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors duration-150',
                filters.selectedTagIds.includes(tag.id)
                  ? 'text-white border-transparent'
                  : 'text-[#3E2723] border-[#D7CCC8] hover:border-[#BCAAA4]'
              )}
              style={{
                backgroundColor: filters.selectedTagIds.includes(tag.id) ? tag.color : '#F5EDE0',
              }}
            >
              {tag.name}
              {filters.selectedTagIds.includes(tag.id) && <X size={10} weight="bold" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-[#8D6E63] mb-1.5">
          <Envelope size={14} /> Email
        </label>
        <div className="flex rounded-lg border border-[#D7CCC8] overflow-hidden">
          {[
            { label: 'Todos', value: '' },
            { label: 'Con email', value: 'true' },
            { label: 'Sin email', value: 'false' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, hasEmail: opt.value }))}
              className={cn(
                'flex-1 py-1.5 text-[11px] font-medium transition-colors duration-150',
                filters.hasEmail === opt.value
                  ? 'bg-[#6B2737] text-white'
                  : 'bg-white text-[#8D6E63] hover:bg-[#EFEBE9]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-[#8D6E63] mb-1.5">
          <CalendarBlank size={14} /> Ultima visita
        </label>
        <div className="flex flex-wrap gap-1.5">
          {LAST_VISIT_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, lastVisitDays: prev.lastVisitDays === p.value ? 0 : p.value }))}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150',
                filters.lastVisitDays === p.value
                  ? 'border-[#6B2737] bg-[#6B2737]/10 text-[#6B2737]'
                  : 'border-[#D7CCC8] text-[#8D6E63] hover:border-[#BCAAA4]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-[#8D6E63] mb-1.5">
          <ChartBar size={14} /> Minimo de visitas
        </label>
        <input
          type="number"
          min={0}
          value={filters.minVisits || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, minVisits: parseInt(e.target.value) || 0 }))}
          placeholder="Ej: 3"
          className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] placeholder:text-[#BCAAA4] focus:border-[#6B2737] focus:outline-none"
        />
      </div>

      <div className="flex gap-2 pt-2 border-t border-[#D7CCC8]">
        <button
          type="button"
          onClick={apply}
          className="flex-1 rounded-lg bg-[#6B2737] py-2 text-xs font-medium text-white hover:bg-[#6B2737]/90 active:scale-[0.97] transition-transform"
        >
          <Funnel size={12} className="inline mr-1" />
          Aplicar
        </button>
        <button
          type="button"
          onClick={clear}
          className="flex-1 rounded-lg border border-[#D7CCC8] py-2 text-xs font-medium text-[#8D6E63] hover:bg-[#EFEBE9] active:scale-[0.97] transition-transform"
        >
          Limpiar
        </button>
      </div>
    </div>
  )
}