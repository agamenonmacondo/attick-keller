'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { RESTAURANT_INFO } from '@/lib/utils/restaurantInfo'

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

/** Roman numerals for the editorial category headings (supports up to 39). */
function toRoman(num: number): string {
  const map: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let n = num
  let out = ''
  for (const [v, s] of map) {
    while (n >= v) {
      out += s
      n -= v
    }
  }
  return out
}

export default function MenuSection() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

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
      <section className="bg-[var(--color-ak-cal)] dark:bg-[var(--color-ak-night)] py-20 md:py-32 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="h-6 w-24 mx-auto rounded animate-pulse" style={{ backgroundColor: 'rgba(201,169,78,0.2)' }} />
            <div className="h-12 w-56 mx-auto rounded animate-pulse" style={{ backgroundColor: 'rgba(62,39,35,0.1)' }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-6">
                <div className="h-5 w-32 rounded animate-pulse" style={{ backgroundColor: 'rgba(62,39,35,0.08)' }} />
                <div className="space-y-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-10 rounded animate-pulse" style={{ backgroundColor: 'rgba(62,39,35,0.04)' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) {
    return (
      <section id="menu" className="bg-[var(--color-ak-cal)] dark:bg-[var(--color-ak-night)] py-24 md:py-40 px-6 md:px-12">
        <div className="max-w-2xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="text-2xl mb-3"
            style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-dorado)' }}
          >
            Próximamente
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
            className="font-bold tracking-tight leading-none mb-6 text-[var(--color-ak-madera)] dark:text-[var(--color-ak-cal)]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            }}
          >
            Nuestra Carta
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={viewOptions}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE_IN_OUT }}
            className="h-px w-24 mx-auto mb-8"
            style={{ background: 'linear-gradient(to right, transparent, var(--color-ak-dorado), transparent)' }}
          />
          <p
            className="text-lg text-[var(--text-secondary)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Estamos preparando nuestra carta. Vuelve pronto para descubrir nuestras creaciones mediterráneas.
          </p>
        </div>
      </section>
    )
  }

  const itemsByCategory = (catId: string) => items.filter(it => it.category_id === catId)

  return (
    <section
      id="menu"
      className="bg-[var(--color-ak-cal)] dark:bg-[var(--color-ak-night)] py-20 md:py-32 px-6 md:px-12"
    >
      <div className="max-w-6xl mx-auto">
        {/* ── Editorial header ── */}
        <div className="text-center mb-16 md:mb-24 max-w-2xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="text-2xl mb-2"
            style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-dorado)' }}
          >
            Descubre
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
            className="font-bold tracking-tight leading-[0.95] mb-6 text-[var(--color-ak-madera)] dark:text-[var(--color-ak-cal)]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.25rem, 5.5vw, 4rem)',
            }}
          >
            Nuestra Carta
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={viewOptions}
            transition={{ duration: 0.9, delay: 0.25, ease: EASE_IN_OUT }}
            className="h-px w-24 mx-auto"
            style={{ background: 'linear-gradient(to right, transparent, var(--color-ak-dorado), transparent)', transformOrigin: 'center' }}
          />
          {items.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={viewOptions}
              transition={{ duration: 0.5, delay: 0.4, ease: EASE_OUT }}
              className="mt-6 text-sm tracking-wide text-[var(--text-secondary)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {items.length} platos · desde {formatPrice(Math.min(...items.map(i => i.price)))}
            </motion.p>
          )}
        </div>

        {/* ── Magazine layout: categories in two columns (desktop), one (mobile) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 lg:gap-x-24 gap-y-20 md:gap-y-28">
          {categories.map((cat, i) => {
            const catItems = itemsByCategory(cat.id)
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewOptions}
                transition={{ duration: 0.7, delay: Math.min(i * 0.08, 0.32), ease: EASE_OUT }}
              >
                {/* Editorial category heading — Roman numeral · gold rule · uppercase name */}
                <div className="flex items-center gap-4 mb-8 md:mb-10">
                  <span
                    className="text-3xl md:text-4xl leading-none"
                    style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-dorado)' }}
                  >
                    {toRoman(i + 1)}
                  </span>
                  <span aria-hidden className="h-px w-10 md:w-12 bg-[var(--color-ak-dorado)]/60" />
                  <h3
                    className="uppercase tracking-[0.24em] text-sm md:text-base font-medium text-[var(--color-ak-madera)] dark:text-[var(--color-ak-cal)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {cat.name}
                  </h3>
                </div>

                {cat.description && (
                  <p
                    className="text-sm leading-relaxed mb-8 max-w-md text-[var(--text-secondary)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {cat.description}
                  </p>
                )}

                {/* Dishes — generous negative space, no dividers, staggered fade-in */}
                {catItems.length === 0 ? (
                  <p
                    className="py-4 text-base italic text-[var(--text-secondary)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    No hay platos disponibles en esta categoría por el momento.
                  </p>
                ) : (
                  <div>
                    {catItems.map((item, j) => (
                      <motion.article
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={viewOptions}
                        transition={{
                          duration: 0.5,
                          delay: Math.min(j * 0.07, 0.42),
                          ease: EASE_OUT,
                        }}
                        className="group py-5"
                      >
                        {/* Name · leader (desktop) · price (right on desktop, below on mobile) */}
                        <div className="flex flex-col gap-1.5 md:flex-row md:items-baseline md:gap-4">
                          <h4
                            className="flex items-baseline gap-2 text-lg md:text-xl font-medium text-[var(--color-ak-madera)] dark:text-[var(--color-ak-cal)] transition-colors duration-300 ease-out group-hover:text-[var(--color-ak-borgona)]"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {item.is_featured && (
                              <span
                                aria-hidden
                                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: 'var(--color-ak-dorado)', transform: 'translateY(-2px)' }}
                              />
                            )}
                            {item.name}
                          </h4>
                          <span
                            aria-hidden
                            className="hidden md:block flex-1 border-b border-dashed border-[var(--border-light)] opacity-40 transition-opacity duration-300 ease-out group-hover:opacity-70"
                            style={{ transform: 'translateY(-4px)' }}
                          />
                          <span
                            className="text-sm md:text-base font-semibold md:whitespace-nowrap md:shrink-0"
                            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-ak-borgona)' }}
                          >
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        {item.description && (
                          <p
                            className="text-sm mt-1.5 leading-relaxed max-w-xl text-[var(--text-secondary)]"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            {item.description}
                          </p>
                        )}
                      </motion.article>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* ── CTA final — discreet underlined reveal, like the hero ── */}
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="mt-24 md:mt-32 text-center"
          >
            <Link
              href={RESTAURANT_INFO.webUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 text-base md:text-lg font-medium"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-ak-borgona)' }}
            >
              Ver menú completo
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              <span className="absolute left-0 -bottom-1 h-px w-full origin-left scale-x-0 bg-[var(--color-ak-dorado)] transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}