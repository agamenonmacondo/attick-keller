'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
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

function CategoryBlock({
  category,
  items,
  isLast,
}: {
  category: MenuCategory
  items: MenuItem[]
  isLast: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <div ref={ref}>
      {/* Category header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ ...spring }}
        className="mb-4 md:mb-6"
      >
        <div className="flex items-end gap-4">
          <h3 className="font-['Playfair_Display'] text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--ak-madera)] leading-none">
            {category.name}
          </h3>
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--ak-dorado)]/50 to-transparent translate-y-[-4px]" />
        </div>
        {category.description && (
          <p className="text-[#8D6E63] text-sm mt-2 font-['DM_Sans'] italic max-w-lg">
            {category.description}
          </p>
        )}
      </motion.div>

      {/* Items grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 lg:gap-x-16">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...spring, delay: 0.08 + i * 0.03 }}
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

      {/* Section divider */}
      {!isLast && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-3 my-8 md:my-10"
        >
          <div className="h-px flex-1 bg-[var(--ak-dorado)]/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--ak-dorado)]/40" />
          <div className="h-px flex-1 bg-[var(--ak-dorado)]/20" />
        </motion.div>
      )}
    </div>
  )
}

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
  const [loading, setLoading] = useState(true)
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

  if (loading) {
    return (
      <section className="py-20 px-6 bg-[var(--ak-cal)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 space-y-4">
            <div className="h-7 w-20 mx-auto rounded bg-[#D7CCC8]/60 animate-pulse" />
            <div className="h-14 w-48 mx-auto rounded bg-[#D7CCC8]/60 animate-pulse" />
            <div className="h-px w-24 mx-auto bg-[var(--ak-dorado)]/30" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-12">
              <div className="h-9 w-40 rounded bg-[#D7CCC8]/50 animate-pulse mb-6" />
              <div className="grid md:grid-cols-2 gap-x-10">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="py-4 border-b border-[#D7CCC8]/30">
                    <div className="flex justify-between">
                      <div className="h-5 w-28 rounded bg-[#D7CCC8]/40 animate-pulse" />
                      <div className="h-5 w-16 rounded bg-[#D7CCC8]/40 animate-pulse" />
                    </div>
                    <div className="h-3 w-full rounded bg-[#D7CCC8]/30 animate-pulse mt-2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

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

          {/* All categories and items */}
          {categories.map((cat, i) => (
            <CategoryBlock
              key={cat.id}
              category={cat}
              items={items.filter(it => it.category_id === cat.id)}
              isLast={i === categories.length - 1}
            />
          ))}
        </div>
      </section>
    </>
  )
}