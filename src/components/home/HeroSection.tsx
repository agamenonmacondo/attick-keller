'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#3E2723]">
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[15%] left-[10%] w-72 h-72 bg-[#6B2737]/30 rounded-full blur-3xl animate-float-orb-1" />
        <div className="absolute top-[40%] right-[15%] w-96 h-96 bg-[#C9A94E]/20 rounded-full blur-3xl animate-float-orb-2" />
        <div className="absolute bottom-[20%] left-[30%] w-64 h-64 bg-[#D4922A]/25 rounded-full blur-3xl animate-float-orb-3" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[#C9A94E] tracking-[0.3em] uppercase text-sm mb-4"
        >
          Bogotá
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="font-['Playfair_Display'] text-6xl md:text-8xl font-bold text-[#F5EDE0] mb-6"
        >
          Attick &amp; Keller
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-[#D7CCC8] text-lg md:text-xl max-w-xl mx-auto mb-10"
        >
          Cocina de autor en el corazón de Bogotá
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <Link
            href="/reservar"
            className="relative inline-block px-10 py-4 bg-[#6B2737] text-[#F5EDE0] rounded-full text-lg font-semibold hover:bg-[#8B3747] transition-colors overflow-hidden"
          >
            <span className="relative z-10">Reservar Mesa</span>
            <div className="absolute inset-0 animate-shimmer" />
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-[#C9A94E]/50 rounded-full flex justify-center pt-2">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-[#C9A94E] rounded-full"
          />
        </div>
      </motion.div>
    </section>
  )
}