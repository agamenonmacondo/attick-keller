'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

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
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' })

  useEffect(() => {
    fetch('/api/menu')
      .then(r => r.json())
      .then(data => {
        setCategories(data.categories || [])
        setItems(data.items || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleCategoryClick = (id: string) => {
    setActive(prev => prev === id ? null : id)
  }

  // Scroll to items panel after opening
  useEffect(() => {
    if (active && panelRef.current) {
      const timer = setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 120)
      return () => clearTimeout(timer)
    }
  }, [active])

  if (loading) {
    return (
      <section className="py-20 px-6 bg-[var(--ak-cal)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 space-y-3">
            <div className="h-7 w-20 mx-auto rounded bg-[#D7CCC8]/60 animate-pulse" />
            <div className="h-12 w-36 mx-auto rounded bg-[#D7CCC8]/60 animate-pulse" />
            <div className="h-px w-24 mx-auto bg-[var(--ak-dorado)]/30" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-[#D7CCC8]/40 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  const activeCategory = categories.find(c => c.id === active)
  const activeItems = active ? items.filter(it => it.category_id === active) : []

  return (
    <>
      <div className="h-16 bg-gradient-to-b from-[#3E2723] via-[#4E342E] to-[var(--ak-cal)]" />

      <section ref={sectionRef} id="menu" className="bg-[var(--ak-cal)] py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ ...spring }}
              className="font-['Caveat'] text-[var(--ak-ambar)] text-xl md:text-2xl mb-1"
            >
              Nuestro
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ ...spring, delay: 0.1 }}
              className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-[var(--ak-madera)] tracking-tight leading-none mb-3"
            >
              Menú
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-[var(--ak-dorado)] to-transparent"
            />
          </div>

          {/* Category grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...spring, delay: 0.25 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
          >
            {categories.map((cat, i) => {
              const isActive = active === cat.id
              const count = items.filter(it => it.category_id === cat.id).length

              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ ...spring, delay: 0.3 + i * 0.05 }}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={cn(
                    'group relative rounded-xl px-5 py-6 md:py-8 text-left transition-all duration-300',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ak-dorado)]',
                    isActive
                      ? 'bg-[var(--ak-borgona)] text-[var(--ak-cal)] shadow-lg shadow-[#6B2737]/20 ring-1 ring-[var(--ak-borgona)]'
                      : 'bg-white/60 text-[var(--ak-madera)] border border-[#8D6E63]/30 shadow-sm hover:border-[var(--ak-borgona)]/40 hover:bg-white/80 hover:shadow-md active:scale-[0.97]'
                  )}
                >
                  {/* Name */}
                  <span className={cn(
                    'font-["Playfair_Display"] font-bold text-lg md:text-xl leading-tight block transition-colors duration-300',
                    isActive ? 'text-[var(--ak-cal)]' : 'text-[var(--ak-madera)] group-hover:text-[var(--ak-borgona)]'
                  )}>
                    {cat.name}
                  </span>

                  {/* Count & hint */}
                  <span className={cn(
                    'block mt-1.5 text-xs tracking-widest uppercase font-["DM_Sans"] transition-colors duration-300',
                    isActive ? 'text-[var(--ak-dorado)]' : 'text-[#8D6E63]/50 group-hover:text-[#8D6E63]/80'
                  )}>
                    {count} {count === 1 ? 'plato' : 'platos'}
                  </span>

                  {/* Gold accent bottom */}
                  <div className={cn(
                    'absolute bottom-0 left-4 right-4 h-0.5 rounded-full transition-all duration-300',
                    isActive ? 'bg-[var(--ak-dorado)]' : 'bg-transparent group-hover:bg-[var(--ak-dorado)]/50'
                  )} />
                </motion.button>
              )
            })}
          </motion.div>

          {/* Products panel */}
          <AnimatePresence mode="wait">
            {active && activeCategory && (
              <motion.div
                key={active}
                ref={panelRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-8 md:mt-10"
              >
                {/* Category label */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring }}
                  className="flex items-center gap-4 mb-6"
                >
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--ak-dorado)]/40 to-transparent" />
                  <h3 className="font-['Playfair_Display'] text-xl md:text-2xl font-bold text-[var(--ak-madera)]">
                    {activeCategory.name}
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--ak-dorado)]/40 to-transparent" />
                </motion.div>

                {/* Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 lg:gap-x-16">
                  {activeItems.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.05 + i * 0.03 }}
                      className="group py-3.5 border-b border-[#8D6E63]/10 hover:border-[var(--ak-dorado)]/30 transition-colors duration-300"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h4 className="font-['Playfair_Display'] text-[var(--ak-madera)] text-base md:text-[17px] font-semibold group-hover:text-[var(--ak-borgona)] transition-colors duration-300">
                          {item.name}
                        </h4>
                        <span className="font-['DM_Sans'] text-[var(--ak-borgona)] font-bold text-sm md:text-base whitespace-nowrap shrink-0">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[#8D6E63]/70 text-sm mt-1 font-['DM_Sans'] italic leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint when no category selected */}
          {!active && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-[#8D6E63]/40 py-6 font-['Caveat'] text-lg"
            >
              Toca una categoría para ver los platos
            </motion.p>
          )}
        </div>
      </section>
    </>
  )
}