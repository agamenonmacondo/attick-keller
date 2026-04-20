'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const photos = [
  { src: '/ak_photo_01.jpg', alt: 'Interior calido', caption: 'Ambiente intimo' },
  { src: '/ak_photo_05.jpg', alt: 'Platos artesanales', caption: 'Cocina de autor' },
  { src: '/ak_photo_08.jpg', alt: 'Barra principal', caption: 'Cocktails unicos' },
  { src: '/ak_photo_12.jpg', alt: 'Detalles gastronomicos', caption: 'Sabores autenticos' },
  { src: '/ak_photo_15.jpg', alt: 'Terraza', caption: 'Al aire libre' },
  { src: '/ak_photo_17.jpg', alt: 'Experiencia completa', caption: 'Momentos memorables' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
  },
}

export default function PhotoCTA() {
  return (
    <section className="relative bg-[#3E2723] py-20 px-4 md:px-6 overflow-hidden">
      {/* Decorative line */}
      <div className="max-w-6xl mx-auto mb-12">
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="h-px bg-gradient-to-r from-transparent via-[#C9A94E] to-transparent"
        />
      </div>

      {/* Section header */}
      <div className="max-w-6xl mx-auto text-center mb-14">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-['Caveat'] text-[#C9A94E] text-xl md:text-2xl mb-3"
        >
          Vive la experiencia
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-['Playfair_Display'] text-4xl md:text-6xl font-bold text-[#F5EDE0] tracking-tight leading-none"
        >
          Cada visita, una historia
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[#D7CCC8] text-base md:text-lg mt-4 max-w-xl mx-auto"
        >
          Cocina de autor, cocktails unicos y un ambiente que te hace quedar.
        </motion.p>
      </div>

      {/* Photo grid — asymmetric, taste-skill compliant */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4"
      >
        {photos.map((photo, i) => {
          // Asymmetric sizing: first and fourth items span 2 rows on md
          const isTall = i === 0 || i === 3
          return (
            <motion.div
              key={photo.src}
              variants={itemVariants}
              whileHover={{ scale: 0.97, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
              className={`group relative overflow-hidden rounded-xl ${isTall ? 'md:row-span-2' : ''}`}
            >
              <div className={`relative ${isTall ? 'aspect-[3/4]' : 'aspect-[4/3]'} md:${isTall ? 'aspect-auto md:h-full' : 'aspect-[4/3]'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Dark overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/90 via-[#3E2723]/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500" />
                {/* Caption */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                  <p className="font-['Caveat'] text-[#C9A94E] text-lg md:text-xl">{photo.caption}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Strong CTA */}
      <div className="max-w-6xl mx-auto mt-14 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
        >
          <Link
            href="/reservar"
            className="inline-block relative overflow-hidden bg-[#6B2737] text-[#F5EDE0] px-10 py-4 rounded-full font-['Playfair_Display'] text-lg md:text-xl font-bold tracking-tight hover:bg-[#8B3747] transition-colors active:scale-[0.97]"
          >
            {/* Shimmer effect */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite]" />
            Reserva tu Mesa
          </Link>
          <p className="text-[#8D6E63] text-sm mt-4">
            Carrera 13 #75-51, Bogota &middot; +57 310 577 2708
          </p>
        </motion.div>
      </div>

      {/* Bottom decorative line */}
      <div className="max-w-6xl mx-auto mt-14">
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay: 0.4 }}
          className="h-px bg-gradient-to-r from-transparent via-[#C9A94E] to-transparent"
        />
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  )
}