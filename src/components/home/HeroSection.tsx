'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[var(--color-ak-madera)] via-[var(--color-ak-madera)] to-[var(--color-ak-borgona)]/30 dark:bg-gradient-to-b dark:from-[var(--color-ak-night)] dark:via-[var(--color-ak-night)] dark:to-[var(--color-ak-borgona)]/20 transition-colors duration-300">
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[15%] left-[10%] w-72 h-72 bg-[var(--color-ak-borgona)]/20 rounded-full blur-3xl animate-float-orb-1 will-change-transform" />
        <div className="absolute top-[40%] right-[15%] w-96 h-96 bg-[var(--color-ak-dorado)]/12 rounded-full blur-3xl animate-float-orb-2 will-change-transform" />
        <div className="absolute bottom-[20%] left-[30%] w-64 h-64 bg-[var(--color-ak-ambar)]/15 rounded-full blur-3xl animate-float-orb-3 will-change-transform" />
        <div className="absolute top-[60%] right-[35%] w-40 h-40 bg-[var(--color-ak-ambar)]/15 rounded-full blur-2xl animate-float-orb-2 will-change-transform" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[var(--color-ak-dorado)] tracking-[0.3em] uppercase text-sm mb-4"
        >
          Bogotá
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="font-[family-name:var(--font-heading)] text-6xl md:text-8xl font-bold text-[var(--color-ak-cal)] mb-6"
        >
          ATTIC &amp; KELLER
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-[var(--color-ak-cal)]/70 text-lg md:text-xl max-w-xl mx-auto mb-10"
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
            className="relative inline-block px-10 py-4 bg-[var(--color-ak-borgona)] text-[var(--color-ak-cal)] rounded-full text-lg font-semibold hover:bg-[var(--color-ak-borgona)]/90 active:scale-[0.97] transition-all duration-300 overflow-hidden shadow-lg shadow-black/20"
          >
            <span className="relative z-10">Reservar Mesa</span>
            <div
              className="absolute inset-0 animate-shimmer"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(201,169,78,0.45) 50%, transparent 100%)',
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
        <div className="w-5 h-8 border border-[var(--color-ak-dorado)]/40 rounded-full flex justify-center pt-1.5">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-1 bg-[var(--color-ak-dorado)] rounded-full"
          />
        </div>
      </motion.div>
    </section>
  )
}