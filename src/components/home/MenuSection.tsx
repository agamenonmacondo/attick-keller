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
const stagger = { staggerChildren: 0.06, delayChildren: 0.1 }

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
      <section className="py-20 px-6 bg-[#3E2723]">
        <div className="max-w-6xl mx-auto text-center text-[#8D6E63]">Cargando menu...</div>
      </section>
    )
  }

  const filteredItems = items.filter(i => i.category_id === active)

  return (
    <section ref={ref} id="menu" className="relative bg-[#3E2723] py-24 md:py-32 overflow-hidden">
      {/* Decorative background texture */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 20% 50%, #C9A94E 1px, transparent 1px), radial-gradient(circle at 80% 50%, #C9A94E 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div className="relative max-w-6xl mx-auto px-4 md:px-6">
        {/* Header — dramatic entrance */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...spring, delay: 0 }}
            className="font-['Caveat'] text-[#C9A94E] text-xl md:text-2xl mb-3"
          >
            Nuestro
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ ...spring, delay: 0.1 }}
            className="font-['Playfair_Display'] text-5xl md:text-7xl font-bold text-[#F5EDE0] tracking-tighter leading-none mb-4"
          >
            Menu
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#C9A94E] to-transparent"
          />
        </div>

        {/* Category tabs — horizontal scroll on mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ ...spring, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 md:gap-3 mb-16"
        >
          {categories.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ ...spring, delay: 0.3 + i * 0.05 }}
              onClick={() => setActive(cat.id)}
              className={cn(
                'px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                active === cat.id
                  ? 'bg-[#6B2737] text-[#F5EDE0] shadow-lg shadow-[#6B2737]/30 scale-105'
                  : 'bg-[#3E2723] text-[#8D6E63] border border-[#8D6E63]/20 hover:border-[#C9A94E]/40 hover:text-[#D7CCC8] active:scale-95'
              )}
            >
              {cat.name}
            </motion.button>
          ))}
        </motion.div>

        {/* Menu items — dramatic stagger grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={spring}
            className="grid md:grid-cols-2 gap-4 md:gap-6"
          >
            {filteredItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...spring, delay: i * 0.06 }}
                whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className="group relative bg-gradient-to-br from-[#4E342E]/60 to-[#3E2723]/40 backdrop-blur-sm border border-[#8D6E63]/10 rounded-xl p-6 hover:border-[#C9A94E]/30 transition-colors duration-500"
              >
                {/* Gold accent line on hover */}
                <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-[#C9A94E] scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top" />

                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-['Playfair_Display'] text-[#F5EDE0] text-lg font-semibold group-hover:text-[#C9A94E] transition-colors duration-300">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-[#8D6E63] text-sm mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <span className="font-['DM_Sans'] text-[#C9A94E] font-bold text-lg whitespace-nowrap">
                    {formatPrice(item.price)}
                  </span>
                </div>
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

      {/* Bottom gold line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A94E]/40 to-transparent"
      />
    </section>
  )
}