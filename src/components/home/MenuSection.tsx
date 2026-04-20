'use client'

import { useEffect, useState } from 'react'
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

export default function MenuSection() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [active, setActive] = useState<string>('')
  const [loading, setLoading] = useState(true)

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

  const formatPrice = (price: number) => {
    return '$' + price.toLocaleString('es-CO')
  }

  if (loading) {
    return (
      <section className="py-20 px-6 bg-[#F5EDE0]">
        <div className="max-w-5xl mx-auto text-center text-[#8D6E63]">Cargando menú...</div>
      </section>
    )
  }

  const filteredItems = items.filter(i => i.category_id === active)

  return (
    <section id="menu" className="py-20 px-6 bg-[#F5EDE0]">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-center text-[#3E2723] mb-4">
          Nuestro Menú
        </h2>
        <p className="text-center text-[#8D6E63] mb-10">Sabores que cuentan historias</p>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-medium transition-all',
                active === cat.id
                  ? 'bg-[#6B2737] text-white'
                  : 'bg-[#EFEBE9] text-[#3E2723] hover:bg-[#D7CCC8]'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="grid md:grid-cols-2 gap-6">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="bg-white/70 backdrop-blur rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-[#3E2723] text-lg">{item.name}</h3>
                <span className="text-[#6B2737] font-bold whitespace-nowrap ml-4">
                  {formatPrice(item.price)}
                </span>
              </div>
              {item.description && (
                <p className="text-[#8D6E63] text-sm">{item.description}</p>
              )}
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <p className="text-center text-[#8D6E63]">No hay platos en esta categoría</p>
        )}
      </div>
    </section>
  )
}