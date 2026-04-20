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

export default function MenuSection() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [active, setActive] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLElement>(null)
  const itemsRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  useEffect(() => {
    fetch('/api/menu')
      .then(r => r.json())
      .then(data => {
        setCategories(data.categories || [])
        setItems(data.items || [])
        if (data.categories?.length) setActive(data.categories[0].id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)

  const handleCategoryClick = (id: string) => {
    setActive(prev => prev === id ? '' : id)
  }

  if (loading) {
    return (
      <section className="py-20 px-6 bg-[var(--ak-cal)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 space-y-4">
            <div className="h-7 w-20 mx-auto rounded bg-[#D7CCC8]/60 animate-pulse" />
            <div className="h-14 w-48 mx-auto rounded bg-[#D7CCC8]/60 animate-pulse" />
            <div className="h-px w-24 mx-auto bg-[var(--ak-dorado)]/30" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-[#D7CCC8]/40 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <div className="h-24 bg-gradient-to-b from-[#3E2723] via-[#4E342E] to-[var(--ak-cal)]" />

      <section ref={ref} id="menu" className="bg-[var(--ak-cal)] py-20 md:py-28 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ ...spring }}
              className="font-['Caveat'] text-[var(--ak-ambar)] text-xl md:text-2xl mb-2"
            >
              Nuestro
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ ...spring, delay: 0.1 }}
              className="font-['Playfair_Display'] text-5xl md:text-6xl font-bold text-[var(--ak-madera)] tracking-tight leading-none mb-4"
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
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-8"
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
                    'group relative overflow-hidden rounded-xl px-4 py-6 md:py-8 text-center transition-all duration-300',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ak-dorado)]',
                    isActive
                      ? 'bg-[var(--ak-borgona)] text-[var(--ak-cal)] shadow-xl shadow-[#6B2737]/25 md:scale-[1.03]'
                      : 'bg-[#EFEBE9] text-[var(--ak-madera)] border border-[#8D6E63]/15 hover:border-[var(--ak-borgona)]/30 hover:bg-[#E8DED0] active:scale-[0.97]'
                  )}
                >
                  {/* Decorative corner accent */}
                  <div className={cn(
                    'absolute top-0 right-0 w-12 h-12 transition-opacity duration-300',
                    isActive ? 'opacity-20' : 'opacity-[0.07]'
                  )}>
                    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                      <path d="M48 0L0 48" stroke="currentColor" strokeWidth="0.5" />
                      <path d="M48 12L12 48" stroke="currentColor" strokeWidth="0.5" />
                      <path d="M48 24L24 48" stroke="currentColor" strokeWidth="0.5" />
                    </svg>
                  </div>

                  {/* Category name */}
                  <span className={cn(
                    'font-["Playfair_Display"] font-bold text-lg md:text-xl leading-tight transition-colors duration-300',
                    isActive ? 'text-[var(--ak-cal)]' : 'text-[var(--ak-madera)] group-hover:text-[var(--ak-borgona)]'
                  )}>
                    {cat.name}
                  </span>

                  {/* Item count */}
                  <span className={cn(
                    'block mt-2 text-xs tracking-widest uppercase transition-colors duration-300',
                    isActive
                      ? 'text-[var(--ak-dorado)]'
                      : 'text-[#8D6E63]/60 group-hover:text-[#8D6E63]'
                  )}>
                    {count} {count === 1 ? 'plato' : 'platos'}
                  </span>

                  {/* Gold underline on active */}
                  <div className={cn(
                    'absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-[var(--ak-dorado)] transition-all duration-300',
                    isActive ? 'w-12' : 'w-0 group-hover:w-6'
                  )} />
                </motion.button>
              )
            })}
          </motion.div>

          {/* Products panel */}
          <AnimatePresence mode="wait">
            {active && (
              <motion.div
                key={active}
                ref={itemsRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ ...spring, delay: 0.1 }}
                >
                  {/* Category title inside panel */}
                  {(() => {
                    const cat = categories.find(c => c.id === active)
                    if (!cat) return null
                    return (
                      <div className="flex items-center gap-4 mb-8 mt-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-[var(--ak-dorado)]/40 to-transparent" />
                        <h3 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-[var(--ak-madera)]">
                          {cat.name}
                        </h3>
                        <div className="h-px flex-1 bg-gradient-to-l from-[var(--ak-dorado)]/40 to-transparent" />
                      </div>
                    )
                  })()}

                  {/* Items in editorial menu style */}
                  <div className="grid md:grid-cols-2 gap-x-10 md:gap-x-16 gap-y-0">
                    {items
                      .filter(item => item.category_id === active)
                      .map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...spring, delay: 0.05 + i * 0.04 }}
                          className="group py-4 border-b border-[#8D6E63]/12 hover:border-[var(--ak-dorado)]/40 transition-colors duration-300"
                        >
                          {/* Name ... price line */}
                          <div className="flex items-baseline gap-2">
                            <h4 className={cn(
                              'font-["Playfair_Display"] text-[var(--ak-madera)] text-base md:text-lg font-semibold',
                              'group-hover:text-[var(--ak-borgona)] transition-colors duration-300',
                              'shrink-0'
                            )}>
                              {item.name}
                            </h4>

                            {/* Dotted leader line */}
                            <span className="flex-1 border-b border-dotted border-[#8D6E63]/30 min-w-[20px] translate-y-[-3px]" />

                            <span className="font-['DM_Sans'] text-[var(--ak-borgona)] font-bold text-sm md:text-base whitespace-nowrap shrink-0">
                              {formatPrice(item.price)}
                            </span>
                          </div>

                          {/* Description */}
                          {item.description && (
                            <p className="text-[#8D6E63]/70 text-sm mt-1 font-['DM_Sans'] italic leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </motion.div>
                      ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state when no category selected */}
          {!active && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[#8D6E63]/50 py-8 font-['Caveat'] text-xl"
            >
              Selecciona una categoría para ver nuestros platos
            </motion.p>
          )}
        </div>
      </section>
    </>
  )
}