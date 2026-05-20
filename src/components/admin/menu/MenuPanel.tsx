'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Spinner, CaretDown, CaretRight, PencilSimple, Eye, EyeSlash, Trash } from '@phosphor-icons/react'
import { formatCOP } from '@/lib/utils/formatCOP'
import { AnimatedCard } from '../shared/AnimatedCard'
import { SectionHeading } from '../shared/SectionHeading'
import { MenuItemForm } from './MenuItemForm'
import { CategoryForm } from './CategoryForm'

interface Category {
  id: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string
  image_url: string | null
  is_featured: boolean
  is_available: boolean
  sort_order: number
}

export function MenuPanel() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showItemForm, setShowItemForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/menu')
      if (res.ok) {
        const d = await res.json()
        setCategories(d.categories || [])
        setItems(d.items || [])
        // Expand all categories by default
        setExpandedCategories(new Set((d.categories || []).map((c: Category) => c.id)))
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMenu() }, [fetchMenu])

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAvailability = useCallback(async (item: MenuItem) => {
    const newAvailable = !item.is_available
    try {
      const res = await fetch(`/api/admin/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: newAvailable }),
      })
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newAvailable } : i))
      }
    } catch {
      // Silently fail
    }
  }, [])

  const toggleCategoryActive = useCallback(async (cat: Category) => {
    const newActive = !cat.is_active
    try {
      const res = await fetch(`/api/admin/menu/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive }),
      })
      if (res.ok) {
        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: newActive } : c))
      }
    } catch {
      // Silently fail
    }
  }, [])

  const deleteItem = useCallback(async (itemId: string) => {
    if (!confirm('Ocultar este plato del menu?')) return
    try {
      const res = await fetch(`/api/admin/menu/items/${itemId}`, { method: 'DELETE' })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== itemId))
      }
    } catch {
      // Silently fail
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => { setEditingCategory(null); setShowCategoryForm(true) }}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 active:scale-[0.97]"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
        >
          <Plus size={16} weight="bold" />
          Nueva Categoria
        </button>
        <button
          type="button"
          onClick={() => { setEditingItem(null); setShowItemForm(true) }}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-[var(--color-ak-borgona)] hover:bg-[var(--color-ak-borgona)]/10 active:scale-[0.97]"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
        >
          <Plus size={16} weight="bold" />
          Nuevo Plato
        </button>
      </div>

      {/* Categories */}
      {categories.map((cat, ci) => {
        const categoryItems = items.filter(i => i.category_id === cat.id)
        const isExpanded = expandedCategories.has(cat.id)

        return (
          <AnimatedCard key={cat.id} delay={ci * 0.06} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
            {/* Category header */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--bg-input)]/50"
              onClick={() => toggleCategory(cat.id)}
              style={{ transition: 'background-color 200ms ease-out' }}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <CaretDown size={16} className="text-[var(--text-secondary)]" /> : <CaretRight size={16} className="text-[var(--text-secondary)]" />}
                <h3 className="font-['Playfair_Display'] text-base font-semibold text-[var(--text-primary)]">
                  {cat.name}
                </h3>
                <span className="text-xs text-[var(--text-secondary)]">({categoryItems.length} platos)</span>
                {!cat.is_active && (
                  <span className="rounded-full bg-[var(--color-danger)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-danger)]">Inactiva</span>
                )}
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => toggleCategoryActive(cat)}
                  className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50"
                  title={cat.is_active ? 'Ocultar categoria' : 'Mostrar categoria'}
                >
                  {cat.is_active ? <Eye size={14} /> : <EyeSlash size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingCategory(cat); setShowCategoryForm(true) }}
                  className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50"
                  title="Editar categoria"
                >
                  <PencilSimple size={14} />
                </button>
              </div>
            </div>

            {/* Items grid */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-[var(--border-default)] px-5 py-4">
                    {categoryItems.length === 0 ? (
                      <p className="py-4 text-center text-sm text-[var(--text-secondary)]">Sin platos en esta categoria</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {categoryItems.map((item, ii) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: ii * 0.04, duration: 0.2 }}
                            className={`rounded-lg border p-3 relative group ${
                              item.is_available ? 'border-[var(--border-default)] bg-[var(--bg-card)]' : 'border-red-100 bg-[var(--color-danger)]/10/30'
                            }`}
                          >
                            {/* Featured badge */}
                            {item.is_featured && (
                              <span className="absolute -top-1.5 -right-1.5 rounded-full bg-[var(--color-ak-dorado)] px-1.5 py-0.5 text-[8px] font-bold text-white">★</span>
                            )}

                            <div className="flex items-start justify-between mb-1">
                              <h4 className="text-sm font-medium text-[var(--text-primary)] leading-tight">{item.name}</h4>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100" style={{ transition: 'opacity 150ms ease-out' }}>
                                <button
                                  type="button"
                                  onClick={() => { setEditingItem(item); setShowItemForm(true) }}
                                  className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50"
                                  title="Editar"
                                >
                                  <PencilSimple size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteItem(item.id)}
                                  className="flex h-6 w-6 items-center justify-center rounded text-red-400 hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                                  title="Ocultar"
                                >
                                  <Trash size={12} />
                                </button>
                              </div>
                            </div>

                            {item.description && (
                              <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mb-2">{item.description}</p>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-bold text-[var(--color-ak-borgona)]">{formatCOP(item.price)}</span>
                              <button
                                type="button"
                                onClick={() => toggleAvailability(item)}
                                className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                  item.is_available
                                    ? 'bg-[var(--color-ak-oliva)]/10 text-[var(--color-ak-oliva)]'
                                    : 'bg-[var(--color-danger)]/10 text-red-500'
                                }`}
                              >
                                {item.is_available ? 'Disponible' : 'Oculto'}
                              </button>
                            </div>
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

      {categories.length === 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">No hay categorias de menu</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Crea una categoria para empezar a agregar platos</p>
        </div>
      )}

      {/* Forms */}
      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => { setShowCategoryForm(false); setEditingCategory(null) }}
          onSaved={fetchMenu}
        />
      )}

      {showItemForm && (
        <MenuItemForm
          item={editingItem}
          categories={categories}
          onClose={() => { setShowItemForm(false); setEditingItem(null) }}
          onSaved={fetchMenu}
        />
      )}
    </div>
  )
}