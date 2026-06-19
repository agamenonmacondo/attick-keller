'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

export default function HeroCinematic() {
  const ref = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  // Parallax: the image drifts vertically as the hero scrolls out of view.
  // Factor ~0.3 — subtle. Disabled when the user prefers reduced motion.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const overlayY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '40%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section
      ref={ref}
      id="inicio"
      className="relative min-h-[100svh] w-full overflow-hidden bg-[var(--color-ak-madera)]"
    >
      {/* Full-bleed image with subtle parallax */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={reduceMotion ? undefined : { y: imgY }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: EASE_OUT }}
          className="absolute inset-0"
        >
          <Image
            src="/ak_photo_05.jpg"
            alt="Plato de cocina mediterránea de autor en Attick & Keller"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
        {/* Editorial overlay — flat tone + soft bottom anchor gradient. */}
        <div className="absolute inset-0 bg-[var(--color-ak-madera)]/55 dark:bg-[var(--color-ak-madera)]/70" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, var(--color-ak-madera) 0%, rgba(62,39,35,0.35) 35%, transparent 65%)',
          }}
        />
      </motion.div>

      {/* Content — left aligned, anchored to center-low */}
      <motion.div
        className="relative z-10 flex min-h-[100svh] items-end"
        style={
          reduceMotion
            ? undefined
            : { y: contentY, opacity: contentOpacity }
        }
      >
        <div className="w-full max-w-3xl px-6 md:px-12 pb-[18vh] md:pb-[20vh]">
          <motion.div style={reduceMotion ? undefined : { y: overlayY }} className="space-y-6">
            {/* Kicker */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
              className="flex items-center gap-3"
            >
              <span className="h-px w-12 bg-[var(--color-ak-dorado)]" />
              <span
                className="text-2xl"
                style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-dorado)' }}
              >
                Bogotá · cocina de autor
              </span>
            </motion.div>

            {/* Title — two sculptural lines */}
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease: EASE_OUT }}
              className="font-bold tracking-tight leading-[0.95] text-[var(--color-ak-cal)]"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3rem, 9vw, 7rem)',
              }}
            >
              Attick{' '}
              <span className="italic" style={{ fontStyle: 'italic' }}>
                &amp;
              </span>
              <br />
              Keller
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: EASE_OUT }}
              className="max-w-xl text-lg md:text-xl text-[var(--color-ak-cal)]/80"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cocina mediterránea de autor en el corazón de Bogotá. Reservas
              abiertas para esta noche.
            </motion.p>

            {/* CTAs — underline reveal, not pills */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: EASE_OUT }}
              className="flex flex-col sm:flex-row items-start gap-6 sm:gap-10 pt-2"
            >
              <Link
                href="/reservar"
                className="group relative inline-flex items-center gap-2 text-lg font-medium text-[var(--color-ak-cal)]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Reservar Mesa
                <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
                <span className="absolute left-0 -bottom-1 h-px w-full origin-left scale-x-0 bg-[var(--color-ak-dorado)] transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>

              <Link
                href="/#menu"
                className="group relative inline-flex items-center gap-2 text-lg text-[var(--color-ak-cal)]/70"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Ver la carta
                <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
                <span className="absolute left-0 -bottom-1 h-px w-full origin-left scale-x-0 bg-[var(--color-ak-cal)]/40 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Minimal scroll indicator — bottom left, a single drifting line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="pointer-events-none absolute bottom-6 left-6 md:left-12 z-10 hidden sm:flex items-center gap-3"
      >
        <span className="relative block h-12 w-px bg-[var(--color-ak-cal)]/40 overflow-hidden">
          {!reduceMotion && (
            <motion.span
              className="absolute left-0 top-0 h-3 w-px bg-[var(--color-ak-dorado)]"
              animate={{ y: [0, 36, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </span>
      </motion.div>
    </section>
  )
}