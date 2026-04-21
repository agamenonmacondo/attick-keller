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

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }
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
        // Auto-select first category if data exists
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

  useEffect(() => {
    if (active && panelRef.current) {
      const timer = setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [active])

  // Scroll active tab into view
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
      <section className="py-20 px-6" style={{ backgroundColor: '#F5EDE0' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <div className="h-6 w-24 mx-auto rounded animate-pulse" style={{ backgroundColor: 'rgba(201,169,78,0.2)' }} />
            <div className="h-10 w-48 mx-auto rounded animate-pulse" style={{ backgroundColor: 'rgba(62,39,35,0.1)' }} />
          </div>
          <div className="flex gap-3 overflow-hidden mb-10">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 w-32 rounded-full animate-pulse shrink-0" style={{ backgroundColor: 'rgba(62,39,35,0.06)' }} />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: 'rgba(62,39,35,0.04)' }} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) {
    return (
      <section id="menu" className="py-20 px-6" style={{ backgroundColor: '#F5EDE0' }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={spring}
            className="text-xl md:text-2xl mb-2"
            style={{ fontFamily: 'Caveat, cursive', color: '#D4922A' }}
          >
            Próximamente
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ ...spring, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight leading-none mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: '#3E2723' }}
          >
            Nuestro Menú
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={viewOptions}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="h-px w-24 mx-auto mb-6"
            style={{ background: 'linear-gradient(to right, transparent, #C9A94E, transparent)' }}
          />
          <p className="text-lg" style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(62,39,35,0.5)' }}>
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
      <div className="h-16" style={{ background: 'linear-gradient(to bottom, #3E2723, #4E342E, #F5EDE0)' }} />

      <section id="menu" style={{ backgroundColor: '#F5EDE0' }} className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="text-center mb-10 md:mb-14">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewOptions}
              transition={spring}
              className="text-xl md:text-2xl mb-1"
              style={{ fontFamily: 'Caveat, cursive', color: '#D4922A' }}
            >
              Descubre
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewOptions}
              transition={{ ...spring, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold tracking-tight leading-none mb-3"
              style={{ fontFamily: "'Playfair Display', serif", color: '#3E2723' }}
            >
              Nuestra Carta
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={viewOptions}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="h-px w-24 mx-auto"
              style={{ background: 'linear-gradient(to right, transparent, #C9A94E, transparent)' }}
            />
          </div>

          {/* Category tabs — horizontal scrollable */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ ...spring, delay: 0.2 }}
            className="relative mb-10 md:mb-14"
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
                    className="relative shrink-0 px-5 py-2.5 rounded-full text-sm md:text-base font-medium transition-all duration-300 cursor-pointer focus:outline-none"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      backgroundColor: isActive ? '#6B2737' : 'transparent',
                      color: isActive ? '#F5EDE0' : '#3E2723',
                      border: isActive ? '1.5px solid #6B2737' : '1.5px solid rgba(62,39,35,0.2)',
                      letterSpacing: '0.02em',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'rgba(107,39,55,0.5)'
                        e.currentTarget.style.backgroundColor = 'rgba(107,39,55,0.06)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'rgba(62,39,35,0.2)'
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    {cat.name}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-full"
                        style={{ border: '1.5px solid #6B2737' }}
                        transition={spring}
                      />
                    )}
                  </button>
                )
              })}
            </div>
            {/* Fade edges */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12" style={{ background: 'linear-gradient(to right, transparent, #F5EDE0)' }} />
          </motion.div>

          {/* Products panel */}
          <AnimatePresence mode="wait">
            {active && activeCategory && (
              <motion.div
                key={active}
                ref={panelRef}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ ...spring }}
              >
                {/* Category title */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-4 mb-8"
                >
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(201,169,78,0.5), transparent)' }} />
                  <h3
                    className="text-2xl md:text-3xl font-bold text-center"
                    style={{ fontFamily: "'Playfair Display', serif", color: '#3E2723' }}
                  >
                    {activeCategory.name}
                  </h3>
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(201,169,78,0.5), transparent)' }} />
                </motion.div>

                {activeItems.length === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 text-base italic"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(62,39,35,0.4)' }}
                  >
                    No hay platos disponibles en esta categoría por el momento.
                  </motion.p>
                ) : (
                  <div className="space-y-0">
                    {activeItems.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: 0.04 + i * 0.03 }}
                        className="group py-4 md:py-5"
                        style={{ borderBottom: '1px solid rgba(62,39,35,0.08)' }}
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <h4
                            className="text-lg md:text-xl font-semibold"
                            style={{ fontFamily: "'Playfair Display', serif", color: '#3E2723' }}
                          >
                            {item.name}
                          </h4>
                          {/* Dotted line */}
                          <div className="flex-1 border-b border-dashed mx-2 hidden md:block" style={{ borderColor: 'rgba(62,39,35,0.15)', transform: 'translateY(-4px)' }} />
                          <span
                            className="font-bold text-base md:text-lg whitespace-nowrap shrink-0"
                            style={{ fontFamily: "'DM Sans', sans-serif", color: '#6B2737' }}
                          >
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        {item.description && (
                          <p
                            className="text-sm mt-1.5 leading-relaxed max-w-2xl"
                            style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(62,39,35,0.55)' }}
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

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  )
}
