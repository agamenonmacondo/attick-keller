'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0D1015]">
      {/* Gradient overlay — subtle rust wash */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[#8C4434]/10 to-transparent" />

      {/* Floating orbs — always dark-themed for drama */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[15%] left-[10%] w-72 h-72 bg-[#8C4434]/20 rounded-full blur-3xl animate-float-orb-1 will-change-transform" />
        <div className="absolute top-[40%] right-[15%] w-96 h-96 bg-[#FCCC04]/12 rounded-full blur-3xl animate-float-orb-2 will-change-transform" />
        <div className="absolute bottom-[20%] left-[30%] w-64 h-64 bg-[#E48C04]/15 rounded-full blur-3xl animate-float-orb-3 will-change-transform" />
        <div className="absolute top-[60%] right-[35%] w-40 h-40 bg-[#E48C04]/15 rounded-full blur-2xl animate-float-orb-2 will-change-transform" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-[family-name:var(--font-accent)] text-[#E48C04] text-2xl md:text-3xl mb-6"
        >
          Bogotá
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mb-6"
        >
          <Image
            src="/logo_hero.webp"
            alt="Attic & Keller"
            width={600}
            height={160}
            priority
            className="w-[280px] md:w-[420px] lg:w-[520px] h-auto mx-auto"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="font-[family-name:var(--font-body)] text-[#F4ECE4]/80 text-lg md:text-xl max-w-xl mx-auto mb-8"
        >
          Cocina de autor en el corazón de Bogotá
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mb-10"
        >
          <span style={{ color: '#FCCC04' }}>◆</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <Link
            href="/reservar"
            className="relative inline-block px-10 py-4 bg-[#8C4434] text-[#F4ECE4] rounded-lg text-lg font-semibold hover:bg-[#A05840] active:scale-[0.97] transition-all duration-300 overflow-hidden shadow-lg shadow-black/20"
          >
            <span className="relative z-10">Reservar Mesa</span>
            <div
              className="absolute inset-0 animate-shimmer"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(252,204,4,0.45) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
            />
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
        <div className="w-5 h-8 border border-[#E48C04]/40 rounded-full flex justify-center pt-1.5">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-1 bg-[#E48C04] rounded-full"
          />
        </div>
      </motion.div>
    </section>
  )
}