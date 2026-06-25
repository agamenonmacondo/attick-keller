'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string
  image_url: string | null
  is_featured: boolean
  sort_order: number
  is_available: boolean
}

interface MenuCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const

const viewOptions = { once: true, amount: 0.15 as const }

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)
}

export default function MenuSection() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/menu')
      .then(r => r.json())
      .then(data => {
        const cats = data.categories || []
        const itms = data.items || []
        setCategories(cats)
        setItems(itms)
        if (cats.length > 0) {
          setActive(cats[0].id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleCategoryClick = (id: string) => {
    setActive(id)
  }

  const handleMobileCategorySelect = (id: string) => {
    setActive(id)
    setMobileMenuOpen(false)
  }

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (active && panelRef.current) {
      const timer = setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [active])

  useEffect(() => {
    if (active && tabsRef.current) {
      const activeBtn = tabsRef.current.querySelector(`[data-cat-id="${active}"]`) as HTMLElement
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [active])

  if (loading) {
    return (
      <section className="py-20 px-6 bg-[var(--color-ak-cal)] dark:bg-[var(--color-ak-night)] transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <div className="h-6 w-24 mx-auto rounded animate-pulse" style={{ backgroundColor: 'rgba(252,204,4,0.2)' }} />
            <div className="h-10 w-48 mx-auto rounded animate-pulse" style={{ backgroundColor: 'rgba(13,16,21,0.1)' }} />
          </div>
          <div className="flex gap-3 overflow-hidden mb-10">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 w-32 rounded-full animate-pulse shrink-0" style={{ backgroundColor: 'rgba(13,16,21,0.06)' }} />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: 'rgba(13,16,21,0.04)' }} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) {
    return (
      <section id="menu" className="py-20 px-6 bg-[var(--color-ak-cal)] dark:bg-[var(--color-ak-night)] transition-colors duration-300">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="text-xl md:text-2xl mb-2"
            style={{ fontFamily: 'Caveat, cursive', color: 'var(--color-ak-ambar)' }}
          >
            Próximamente
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewOptions}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT }}
            className="mx-auto mb-5 w-12 h-12 rounded-full flex items-center justify-center"
            style={{ border: '1px solid rgba(252,204,4,0.35)' }}
            aria-hidden="true"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-ak-dorado)' }}>
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
              <path d="M7 7h10M7 12h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            </svg>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
            className="text-4xl md:text-5xl font-bold tracking-tight leading-none mb-4"
            style={{ fontFamily: "var(--font-heading)", color: 'var(--color-ak-madera)' }}
          >
            Nuestro Menú
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={viewOptions}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE_IN_OUT }}
            className="h-px w-32 mx-auto mb-6"
            style={{ background: 'linear-gradient(to right, transparent, var(--color-ak-dorado), transparent)' }}
          />
          <p className="text-lg" style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(13,16,21,0.5)' }}>
            Estamos preparando nuestra carta. Vuelve pronto para descubrir nuestras creaciones mediterráneas.
          </p>
        </div>
      </section>
    )
  }

  const activeCategory = categories.find(c => c.id === active)
  const activeItems = active ? items.filter(it => it.category_id === active) : []

  return (
    <>
      <div className="h-16 bg-gradient-to-b from-[var(--color-ak-madera)] via-[var(--color-ak-madera)] to-[var(--color-ak-cal)] dark:from-[var(--color-ak-night)] dark:via-[var(--color-ak-night)] dark:to-[var(--color-ak-night)] transition-colors duration-300" />

      <section id="menu" className="py-12 md:py-20 bg-[var(--color-ak-cal)] dark:bg-[var(--color-ak-night)] transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="text-center mb-10 md:mb-14">
            <motion.p
              initial={{ opacity: 0, transform: 'translateY(20px)' }}
              whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
              viewport={viewOptions}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="text-xl md:text-2xl mb-1"
              style={{ fontFamily: 'Caveat, cursive', color: 'var(--color-ak-ambar)' }}
            >
              Descubre
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, transform: 'translateY(40px)' }}
              whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
              viewport={viewOptions}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
              className="text-4xl md:text-5xl font-bold tracking-tight leading-none mb-3"
              style={{ fontFamily: "var(--font-heading)", color: 'var(--color-ak-madera)' }}
            >
              Nuestra Carta
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={viewOptions}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE_IN_OUT }}
              className="h-px w-32 mx-auto"
              style={{ background: 'linear-gradient(to right, transparent, var(--color-ak-dorado), transparent)', transformOrigin: 'center' }}
            />
          </div>

          {/* ── Mobile category selector (< md) ── */}
          <motion.div
            initial={{ opacity: 0, transform: 'translateY(10px)' }}
            whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
            viewport={viewOptions}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT }}
            className="md:hidden mb-8"
          >
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors duration-200"
              style={{
                fontFamily: "'Inter', sans-serif",
                backgroundColor: 'var(--color-ak-borgona)',
                color: 'var(--color-ak-cal)',
                minHeight: '48px',
                border: mobileMenuOpen
                  ? '1px solid rgba(252,204,4,0.4)'
                  : '1px solid rgba(252,204,4,0.18)',
              }}
              aria-haspopup="listbox"
              aria-expanded={mobileMenuOpen}
              aria-label={`Categoría seleccionada: ${activeCategory?.name ?? 'Seleccionar'}`}
            >
              <span className="font-semibold text-base tracking-wide">
                {activeCategory?.name ?? 'Seleccionar categoría'}
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="shrink-0 transition-transform duration-200"
                style={{ transform: mobileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <p
              className="text-xs mt-2 text-center"
              style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(13,16,21,0.4)' }}
            >
              Toca para ver todas las categorías
            </p>
          </motion.div>

          {/* ── Desktop category tabs (≥ md) — UNCHANGED ── */}
          <motion.div
            initial={{ opacity: 0, transform: 'translateY(10px)' }}
            whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
            viewport={viewOptions}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT }}
            className="hidden md:block relative mb-10 md:mb-14"
          >
            <div
              ref={tabsRef}
              className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {categories.map((cat) => {
                const isActive = active === cat.id
                return (
                  <button
                    key={cat.id}
                    data-cat-id={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={cn(
                      'relative shrink-0 px-5 py-2.5 rounded-full text-sm md:text-base font-medium cursor-pointer focus:outline-none select-none',
                      'transition-transform duration-150 ease-out',
                      'active:scale-[0.97]'
                    )}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: isActive ? 'var(--color-ak-cal)' : 'var(--color-ak-madera)',
                      letterSpacing: '0.02em',
                      borderBottom: isActive ? '2px solid transparent' : '1px solid rgba(13,16,21,0.12)',
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: 'var(--color-ak-borgona)' }}
                        transition={{ type: 'spring', duration: 0.45, bounce: 0.18 }}
                      />
                    )}
                    <span className="relative z-10">{cat.name}</span>
                  </button>
                )
              })}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent to-[var(--color-ak-cal)] dark:to-[var(--color-ak-night)]"
            />
          </motion.div>

          {/* ── Products panel (shared mobile + desktop) ── */}
          <AnimatePresence mode="wait">
            {active && activeCategory && (
              <motion.div
                key={active}
                ref={panelRef}
                initial={{ opacity: 0, transform: 'translateY(16px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={{ opacity: 0, transform: 'translateY(-6px)' }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.08, ease: EASE_OUT }}
                  className="flex items-center gap-4 mb-8"
                >
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(252,204,4,0.5), transparent)' }} />
                  <h3
                    className="text-2xl md:text-3xl font-bold text-center"
                    style={{ fontFamily: "var(--font-heading)", color: 'var(--color-ak-madera)' }}
                  >
                    {activeCategory.name}
                  </h3>
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(252,204,4,0.5), transparent)' }} />
                </motion.div>

                {activeItems.length === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                    className="text-center py-8 text-base italic"
                    style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(13,16,21,0.4)' }}
                  >
                    No hay platos disponibles en esta categoría por el momento.
                  </motion.p>
                ) : (
                  <div className="space-y-0">
                    {activeItems.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, transform: 'translateY(10px) scale(0.98)' }}
                        animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                        transition={{
                          duration: 0.35,
                          delay: Math.min(i * 0.06, 0.4),
                          ease: EASE_OUT,
                        }}
                        className="group dish-row py-4 md:py-5 cursor-default will-change-transform"
                        style={{ borderBottom: '1px solid rgba(13,16,21,0.08)' }}
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <h4
                            className="text-lg md:text-xl font-semibold transition-colors duration-200 ease-out"
                            style={{ fontFamily: "var(--font-heading)", color: 'var(--color-ak-madera)' }}
                          >
                            {item.name}
                          </h4>
                          <div
                            className="flex-1 border-b border-dashed mx-2 hidden md:block transition-opacity duration-200 ease-out opacity-50 group-hover:opacity-80"
                            style={{ borderColor: 'rgba(13,16,21,0.25)', transform: 'translateY(-4px)' }}
                          />
                          <span
                            className="dish-price font-bold text-base md:text-lg whitespace-nowrap shrink-0 transition-colors duration-200 ease-out"
                            style={{ fontFamily: "'Inter', sans-serif", color: 'var(--color-ak-borgona)' }}
                          >
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        {item.description && (
                          <p
                            className="text-sm mt-1.5 leading-relaxed max-w-2xl transition-colors duration-200 ease-out"
                            style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(13,16,21,0.55)' }}
                          >
                            {item.description}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Mobile category bottom-sheet overlay ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ backgroundColor: 'rgba(13,16,21,0.55)' }}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Bottom sheet */}
            <motion.div
              key="mobile-sheet"
              initial={{ transform: 'translateY(100%)' }}
              animate={{ transform: 'translateY(0%)' }}
              exit={{ transform: 'translateY(100%)' }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 md:hidden shadow-2xl bg-[var(--color-ak-cal)] dark:bg-[var(--color-ak-night-card)] transition-colors duration-300"
              style={{
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                maxHeight: '75vh',
                overflow: 'hidden',
              }}
              role="listbox"
              aria-label="Seleccionar categoría del menú"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ backgroundColor: 'rgba(13,16,21,0.15)' }}
                />
              </div>

              {/* Sheet header */}
              <div className="px-5 pt-2 pb-4 flex items-center justify-between">
                <h3
                  className="text-lg font-bold"
                  style={{ fontFamily: "var(--font-heading)", color: 'var(--color-ak-madera)' }}
                >
                  Categorías
                </h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full cursor-pointer focus:outline-none focus-visible:ring-2"
                  style={{
                    backgroundColor: 'rgba(13,16,21,0.06)',
                    color: 'var(--color-ak-madera)',
                  }}
                  aria-label="Cerrar categorías"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Divider */}
              <div className="mx-5 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(252,204,4,0.4), transparent)' }} />

              {/* Category grid */}
              <div
                className="px-5 py-4 overflow-y-auto"
                style={{ maxHeight: 'calc(75vh - 120px)' }}
              >
                <div className="grid grid-cols-2 gap-2.5">
                  {categories.map((cat) => {
                    const isActive = active === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleMobileCategorySelect(cat.id)}
                        className={cn(
                          'relative rounded-xl px-4 py-3 text-sm font-semibold text-center cursor-pointer',
                          'focus:outline-none focus-visible:ring-2 transition-transform duration-100 active:scale-[0.97]'
                        )}
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          minHeight: '48px',
                          backgroundColor: isActive ? 'var(--color-ak-borgona)' : 'rgba(13,16,21,0.05)',
                          color: isActive ? 'var(--color-ak-cal)' : 'var(--color-ak-madera)',
                          border: isActive ? '2px solid var(--color-ak-borgona)' : '2px solid rgba(13,16,21,0.08)',
                          letterSpacing: '0.01em',
                        }}
                        role="option"
                        aria-selected={isActive}
                      >
                        {isActive && (
                          <span
                            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'var(--color-ak-dorado)' }}
                          />
                        )}
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Safe area spacer for phones with home indicator */}
              <div className="h-safe-area-inset-bottom" style={{ minHeight: 'env(safe-area-inset-bottom, 0px)' }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @media (hover: hover) and (pointer: fine) {
          .dish-row:hover h4 { color: var(--color-ak-borgona) !important; }
          .dish-row:hover .group-hover\\:opacity-70 { opacity: 0.7 !important; }
          .dish-row:hover .dish-price { color: var(--color-ak-dorado) !important; }
        }
        .dark .dish-row { border-bottom-color: rgba(245,237,224,0.08) !important; }
      ` }} />
    </>
  )
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}