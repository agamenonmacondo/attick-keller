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
              className="absolute inset-0 bg-cover bg-no-repeat transition-transform duration-[2s] hover:scale-105"
              style={{ backgroundImage: `url(${photo.src})`, backgroundPosition: photo.position }}
            />
            {/* Dark gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/80 via-[#3E2723]/20 to-transparent" />
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
          <p className="font-['Caveat'] text-[#C9A94E] text-2xl md:text-3xl mb-4">
            Vive la experiencia
          </p>
          <h2 className="font-['Playfair_Display'] text-5xl md:text-7xl lg:text-8xl font-bold text-[#F5EDE0] tracking-tighter leading-[0.9] mb-6">
            Cada visita,<br />una historia
          </h2>
          <p className="text-[#D7CCC8] text-base md:text-lg max-w-md mx-auto mb-10">
            Cocina de autor, cócteles únicos y un ambiente que te hace quedar.
          </p>
          <Link
            href="/reservar"
            className="inline-block bg-[#6B2737] text-[#F5EDE0] px-12 py-5 rounded-full font-['Playfair_Display'] text-xl font-bold tracking-tight hover:bg-[#8B3747] transition-all duration-300 active:scale-[0.97]"
          >
            Reservar Mesa
          </Link>
          <p className="text-[#8D6E63] text-sm mt-6">
            Carrera 13 #75-51, Bogotá
          </p>
        </motion.div>
      </div>

      {/* Bottom decorative accent */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A94E]/60 to-transparent"
      />
    </section>
  )
}