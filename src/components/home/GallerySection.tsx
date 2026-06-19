'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const viewOptions = { once: true, amount: 0.2 as const }

type Tile = {
  src: string
  word: string
  caption: string
  alt: string
  /** Desktop mosaic spans (grid-cols-4, auto-rows ~220px). */
  span: string
}

const TILES: Tile[] = [
  {
    src: '/ak_photo_05.jpg',
    word: 'Platos',
    caption: 'Cocina de autor',
    alt: 'Plato de cocina mediterránea de autor',
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    src: '/ak_photo_08.jpg',
    word: 'Barra',
    caption: 'La barra principal',
    alt: 'Barra del restaurante',
    span: 'md:col-span-2',
  },
  {
    src: '/ak_photo_01.jpg',
    word: 'Interior',
    caption: 'El comedor, luz cálida',
    alt: 'Interior cálido del comedor',
    span: '',
  },
  {
    src: '/ak_photo_11.jpg',
    word: 'Cócteles',
    caption: 'Coctelería de autor',
    alt: 'Cócteles de autor',
    span: '',
  },
  {
    src: '/ak_photo_14.jpg',
    word: 'Cocina',
    caption: 'Fuego y técnica',
    alt: 'La cocina en acción',
    span: 'md:col-span-2',
  },
  {
    src: '/ak_photo_02.jpg',
    word: 'Detalles',
    caption: 'Cada detalle cuenta',
    alt: 'Detalle de la mesa',
    span: 'md:col-span-2',
  },
]

export default function GallerySection() {
  return (
    <section
      id="galeria"
      className="bg-[var(--color-ak-madera)] dark:bg-[var(--color-ak-night)] py-20 md:py-28"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="mb-10 md:mb-14 text-center md:text-left max-w-2xl mx-auto md:mx-0">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="text-2xl mb-2"
            style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-dorado)' }}
          >
            La experiencia
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
            className="font-bold tracking-tight leading-[0.95] text-[var(--color-ak-cal)]"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Cada visita, una historia
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewOptions}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
            className="mt-4 text-[var(--color-ak-cal)]/70"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Cocina de autor, coctelería única y un ambiente que te invita a quedarte.
          </motion.p>
        </div>

        {/* Mobile — horizontal scroll-snap carousel */}
        <div
          className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-6 px-6 pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {TILES.map((tile, i) => (
            <motion.figure
              key={tile.src}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewOptions}
              transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3), ease: EASE_OUT }}
              className="snap-center shrink-0 w-[78vw] max-w-[340px] relative overflow-hidden rounded-sm"
              style={{ aspectRatio: '4 / 5' }}
            >
              <Image
                src={tile.src}
                alt={tile.alt}
                fill
                loading="lazy"
                sizes="78vw"
                className="object-cover"
              />
              <figcaption
                className="absolute inset-x-0 bottom-0 p-4"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                }}
              >
                <span className="block text-xl leading-none" style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-dorado)' }}>
                  {tile.word}
                </span>
                <span className="block text-sm mt-0.5 text-white/80" style={{ fontFamily: 'var(--font-body)' }}>
                  {tile.caption}
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        {/* Desktop — asymmetric magazine mosaic */}
        <div className="hidden md:grid grid-cols-4 gap-4 auto-rows-[220px]">
          {TILES.map((tile, i) => (
            <motion.figure
              key={tile.src}
              initial={{ opacity: 0, scale: 1.04 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={viewOptions}
              transition={{ duration: 0.7, delay: Math.min(i * 0.08, 0.4), ease: EASE_OUT }}
              className={`group relative overflow-hidden rounded-sm ${tile.span}`}
            >
              <Image
                src={tile.src}
                alt={tile.alt}
                fill
                loading="lazy"
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              {/* Caption revealed on hover */}
              <figcaption
                className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 translate-y-2 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:translate-y-0"
                style={{
                  background: 'linear-gradient(to top, rgba(26,20,18,0.85) 0%, rgba(26,20,18,0.15) 55%, transparent 80%)',
                }}
              >
                <span className="text-3xl leading-none" style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-dorado)' }}>
                  {tile.word}
                </span>
                <span className="text-sm mt-1 text-white/85" style={{ fontFamily: 'var(--font-body)' }}>
                  {tile.caption}
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>

    </section>
  )
}