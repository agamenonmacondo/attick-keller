'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import Image from 'next/image'
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
  const ref = useRef(null)
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
    '$' + price.toLocaleString('es-CO')

  if (loading) {
    return (
      <section className="py-20 px-6 bg-[var(--ak-cal)]">
        <div className="max-w-6xl mx-auto">
          {/* Skeleton header */}
          <div className="text-center mb-14 space-y-4">
            <div className="h-7 w-20 mx-auto rounded bg-[#D7CCC8]/60 animate-pulse" />
            <div className="h-14 w-48 mx-auto rounded bg-[#D7CCC8]/60 animate-pulse" />
            <div className="h-px w-24 mx-auto bg-[var(--ak-dorado)]/30" />
          </div>
          {/* Skeleton tabs */}
          <div className="flex justify-center gap-3 mb-12">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-24 rounded-full bg-[#D7CCC8]/40 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          {/* Skeleton items */}
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4 py-4 border-b border-[#8D6E63]/10">
                <div className="w-20 h-20 rounded-lg bg-[#D7CCC8]/40 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 rounded bg-[#D7CCC8]/40 animate-pulse" />
                  <div className="h-3 w-full rounded bg-[#D7CCC8]/30 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const filteredItems = items.filter(i => i.category_id === active)
  const featuredItems = filteredItems.filter(i => i.is_featured)
  const regularItems = filteredItems.filter(i => !i.is_featured)
  const activeCategory = categories.find(c => c.id === active)

  return (
    <>
      {/* Warm transition from hero dark to menu cream */}
      <div className="h-24 bg-gradient-to-b from-[#3E2723] via-[#4E342E] to-[var(--ak-cal)]" />

      <section ref={ref} id="menu" className="bg-[var(--ak-cal)] py-20 md:py-28 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="text-center mb-14">
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
              Menu
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-[var(--ak-dorado)] to-transparent"
            />
          </div>

          {/* Category tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...spring, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 md:gap-3 mb-4"
          >
            {categories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ ...spring, delay: 0.3 + i * 0.04 }}
                onClick={() => setActive(cat.id)}
                className={cn(
                  'px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                  active === cat.id
                    ? 'bg-[var(--ak-borgona)] text-[var(--ak-cal)] shadow-lg shadow-[#6B2737]/20'
                    : 'bg-[#EFEBE9] text-[var(--ak-madera)] border border-[#8D6E63]/20 hover:border-[var(--ak-borgona)]/40 hover:bg-[#D7CCC8] active:scale-95'
                )}
              >
                {cat.icon && <span className="mr-1.5">{cat.icon}</span>}
                {cat.name}
              </motion.button>
            ))}
          </motion.div>

          {/* Category description */}
          <AnimatePresence mode="wait">
            {activeCategory?.description && (
              <motion.p
                key={active}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3 }}
                className="text-center text-[#8D6E63] text-sm mb-12 font-['DM_Sans'] italic"
              >
                {activeCategory.description}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Featured items — full-width cards */}
          {featuredItems.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`featured-${active}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={spring}
                className="mb-12"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="font-['Caveat'] text-[var(--ak-dorado)] text-lg mb-4 flex items-center gap-2"
                >
                  <span className="inline-block w-5 h-px bg-[var(--ak-dorado)]" />
                  Recomendados
                </motion.p>
                <div className={cn(
                  'grid gap-4',
                  featuredItems.length === 1 ? 'grid-cols-1' :
                  featuredItems.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1 md:grid-cols-3'
                )}>
                  {featuredItems.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...spring, delay: 0.1 + i * 0.06 }}
                      className="group relative bg-[#EFEBE9] rounded-xl overflow-hidden border border-[var(--ak-dorado)]/25 hover:border-[var(--ak-dorado)]/50 hover:shadow-xl hover:shadow-[#C9A94E]/10 transition-all duration-300"
                    >
                      {/* Featured badge */}
                      <div className="absolute top-3 right-3 z-10">
                        <span className="bg-[var(--ak-dorado)]/90 text-[var(--ak-cal)] text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full font-['DM_Sans'] shadow-sm">
                          Chef
                        </span>
                      </div>

                      {/* Image */}
                      {item.image_url && (
                        <div className="relative h-40 md:h-48 overflow-hidden">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/60 via-transparent to-transparent" />
                        </div>
                      )}

                      {/* Content */}
                      <div className={cn(
                        'p-5',
                        !item.image_url && 'pt-6'
                      )}>
                        <div className="flex justify-between items-start gap-3">
                          <h3 className="font-['Playfair_Display'] text-[var(--ak-madera)] text-lg md:text-xl font-semibold group-hover:text-[var(--ak-borgona)] transition-colors leading-tight">
                            {item.name}
                          </h3>
                          <span className="font-['DM_Sans'] text-[var(--ak-borgona)] font-bold text-lg whitespace-nowrap shrink-0">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[#8D6E63] text-sm mt-2 leading-relaxed font-['DM_Sans']">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Regular items — editorial list */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`regular-${active}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
            >
              {regularItems.length > 0 && featuredItems.length > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="font-['Caveat'] text-[#8D6E63] text-base mb-4 flex items-center gap-2"
                >
                  <span className="inline-block w-5 h-px bg-[#8D6E63]/40" />
                  Mas del menu
                </motion.p>
              )}

              <div className="grid md:grid-cols-2 gap-x-10 gap-y-1">
                {regularItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: 0.05 + i * 0.03 }}
                    className={cn(
                      'group flex gap-4 py-4 border-b transition-colors duration-300',
                      item.image_url
                        ? 'border-[#8D6E63]/15 hover:border-[var(--ak-dorado)]/40'
                        : 'items-baseline border-[#8D6E63]/15 hover:border-[var(--ak-dorado)]/40'
                    )}
                  >
                    {/* Thumbnail for items with images */}
                    {item.image_url && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 ring-1 ring-[#8D6E63]/10 group-hover:ring-[var(--ak-dorado)]/30 transition-all duration-300">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                          sizes="80px"
                        />
                      </div>
                    )}

                    <div className={cn(
                      'flex-1 min-w-0',
                      item.image_url ? 'flex flex-col justify-center' : 'flex justify-between items-baseline gap-4'
                    )}>
                      <div className="min-w-0">
                        <h3 className="font-['Playfair_Display'] text-[var(--ak-madera)] text-base md:text-lg font-semibold group-hover:text-[var(--ak-borgona)] transition-colors">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-[#8D6E63] text-sm mt-0.5 leading-relaxed font-['DM_Sans'] line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        "font-['DM_Sans'] text-[var(--ak-borgona)] font-bold whitespace-nowrap",
                        item.image_url ? 'text-base mt-1' : 'text-base'
                      )}>
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[#8D6E63] py-12 font-['Caveat'] text-xl"
            >
              Proximamente en esta categoria
            </motion.p>
          )}
        </div>
      </section>
    </>
  )
}