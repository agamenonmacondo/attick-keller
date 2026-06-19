'use client'

import { motion } from 'framer-motion'

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const viewOptions = { once: true, amount: 0.2 as const }

const LINES = [
  'Producto del mercado.',
  'Técnicas de la tradición mediterránea.',
  'Servido como en casa.',
]

export default function ManifestoSection() {
  return (
    <section
      id="filosofia"
      className="bg-[var(--color-ak-cal)] dark:bg-[var(--color-ak-night)] py-24 md:py-40"
    >
      <div className="max-w-4xl mx-auto px-6 md:px-12 text-center space-y-8">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewOptions}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="text-2xl"
          style={{
            fontFamily: 'var(--font-accent)',
            color: 'var(--color-ak-ambar)',
          }}
        >
          Nuestra filosofía
        </motion.p>

        {/* Manifesto body — three stepped lines, last in italic */}
        <div className="space-y-2 md:space-y-3">
          {LINES.map((line, i) => (
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewOptions}
              transition={{ duration: 0.8, delay: 0.15 + i * 0.15, ease: EASE_OUT }}
              className="tracking-tight leading-[1.15] text-[var(--color-ak-madera)] dark:text-[var(--color-ak-night-text)]"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 4.5vw, 3.25rem)',
                fontStyle: i === LINES.length - 1 ? 'italic' : 'normal',
              }}
            >
              {line}
            </motion.p>
          ))}
        </div>

        {/* Gold divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={viewOptions}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.77, 0, 0.175, 1] }}
          className="h-px w-20 mx-auto bg-[var(--color-ak-dorado)]/60"
          style={{ transformOrigin: 'center' }}
        />

        {/* Signature */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewOptions}
          transition={{ duration: 0.6, delay: 0.35, ease: EASE_OUT }}
          className="text-sm text-[var(--text-secondary)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          — Attick &amp; Keller, Bogotá
        </motion.p>
      </div>
    </section>
  )
}