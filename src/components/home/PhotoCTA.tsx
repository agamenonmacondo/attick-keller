'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'

const featuredPhotos = [
  { src: '/ak_photo_01.jpg', alt: 'Interior cálido', position: 'center 30%' },
  { src: '/ak_photo_05.jpg', alt: 'Platos artesanales', position: 'center 20%' },
  { src: '/ak_photo_08.jpg', alt: 'Barra principal', position: 'center 40%' },
]

export default function PhotoCTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative">
      {/* Full-bleed photo grid — editorial style */}
      <div className="grid grid-cols-1 md:grid-cols-3 h-[600px] md:h-[700px]">
        {featuredPhotos.map((photo, i) => (
          <motion.div
            key={photo.src}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1.2, delay: i * 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="relative overflow-hidden"
          >
            <div
              className="absolute inset-0 bg-cover bg-no-repeat bg-center md:bg-fixed transition-transform duration-[2s] hover:scale-105"
              style={{ backgroundImage: `url(${photo.src})`, backgroundPosition: photo.position }}
            />
            {/* Dark gradient — intensified for legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ak-night)]/90 via-[var(--color-ak-night)]/55 to-[var(--color-ak-night)]/20" />
          </motion.div>
        ))}
      </div>

      {/* Overlay content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center px-6"
        >
          <p className="font-[family-name:var(--font-accent)] text-[var(--color-ak-ambar)] text-3xl md:text-4xl mb-4">
            Vive la experiencia
          </p>
          <h2 className="font-[family-name:var(--font-heading)] text-5xl md:text-7xl lg:text-8xl font-bold text-[var(--color-ak-cal)] tracking-tighter leading-[0.9] mb-6">
            Cada visita,<br />una historia
          </h2>
          <p className="text-[var(--color-ak-cal)]/70 text-base md:text-lg max-w-md mx-auto mb-6 font-[family-name:var(--font-body)]">
            Cocina de autor, cócteles únicos y un ambiente que te hace quedar.
          </p>
          {/* ◆ ornament before CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8"
          >
            <span style={{ color: 'var(--color-ak-dorado)', fontSize: '0.75rem', letterSpacing: '0.3em' }}>◆</span>
          </motion.div>
          <Link
            href="/reservar"
            className="inline-block bg-[var(--color-ak-rust)] text-[var(--color-ak-cal)] px-12 py-5 rounded-lg font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight hover:bg-[var(--color-ak-rust-light)] hover:scale-[1.02] shadow-xl shadow-[var(--color-ak-night)]/30 transition-all duration-300 active:scale-[0.97]"
          >
            Reservar Mesa
          </Link>
          <p className="text-[var(--color-ak-cal)]/50 text-sm mt-6 font-[family-name:var(--font-body)]">
            Carrera 13 #75-51, Bogotá
          </p>
        </motion.div>
      </div>

      {/* Bottom decorative accent */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-ak-dorado)]/40 to-transparent"
      />
    </section>
  )
}