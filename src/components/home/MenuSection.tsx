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
}

interface MenuCategory {
  id: string
  name: string
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

  const formatPrice = (price: number) => '$' + price.toLocaleString('es-CO')

  if (loading) {
    return (
      <section className="py-20 px-6 bg-[#F5EDE0]">
        <div className="max-w-6xl mx-auto text-center text-[#8D6E63]">Cargando menu...</div>
      </section>
    )
  }

  const filteredItems = items.filter(i => i.category_id === active)

  return (
    <>
      {/* Warm transition from hero dark to menu cream */}
      <div className="h-24 bg-gradient-to-b from-[#3E2723] via-[#4E342E] to-[#F5EDE0]" />

      <section ref={ref} id="menu" className="bg-[#F5EDE0] py-20 md:py-28 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="text-center mb-14">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ ...spring }}
              className="font-['Caveat'] text-[#D4922A] text-xl md:text-2xl mb-2"
            >
              Nuestro
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ ...spring, delay: 0.1 }}
              className="font-['Playfair_Display'] text-5xl md:text-6xl font-bold text-[#3E2723] tracking-tight leading-none mb-4"
            >
              Menu
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-[#C9A94E] to-transparent"
            />
          </div>

          {/* Category tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...spring, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 md:gap-3 mb-12"
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
                    ? 'bg-[#6B2737] text-[#F5EDE0] shadow-lg shadow-[#6B2737]/20'
                    : 'bg-[#EFEBE9] text-[#3E2723] border border-[#8D6E63]/20 hover:border-[#6B2737]/40 hover:bg-[#D7CCC8] active:scale-95'
                )}
              >
                {cat.name}
              </motion.button>
            ))}
          </motion.div>

          {/* All items — full display, no truncation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="grid md:grid-cols-2 gap-x-8 gap-y-3"
            >
              {filteredItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: i * 0.04 }}
                  className="group flex justify-between items-baseline gap-4 py-3 border-b border-[#8D6E63]/15 hover:border-[#C9A94E]/40 transition-colors duration-300"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-['Playfair_Display'] text-[#3E2723] text-base md:text-lg font-semibold group-hover:text-[#6B2737] transition-colors">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-[#8D6E63] text-sm mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <span className="font-['DM_Sans'] text-[#6B2737] font-bold text-base whitespace-nowrap">
                    {formatPrice(item.price)}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[#8D6E63] py-8"
            >
              No hay platos en esta categoria
            </motion.p>
          )}
        </div>
      </section>
    </>
  )
}