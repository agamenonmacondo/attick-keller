'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { RESTAURANT_INFO } from '@/lib/utils/restaurantInfo'

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const viewOptions = { once: true, amount: 0.2 as const }

export default function ReserveInfoSection() {
  const info = RESTAURANT_INFO

  const rows = [
    { label: 'Horario', value: info.hours.map(h => `${h.days} · ${h.label}`) },
    { label: 'Dirección', value: [info.address.full] },
    { label: 'Contacto', value: [info.phone.display, info.email] },
  ]

  return (
    <section
      id="reservar"
      className="bg-[var(--color-ak-cal)] dark:bg-[var(--color-ak-night-card)] py-24 md:py-32"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 md:gap-16">
        {/* Left — editorial copy + final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewOptions}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="flex flex-col justify-center"
        >
          <p
            className="text-2xl mb-3"
            style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-ambar)' }}
          >
            Reservas
          </p>
          <h2
            className="font-bold tracking-tight leading-[0.98] text-[var(--color-ak-madera)] dark:text-[var(--color-ak-night-text)]"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}
          >
            Reserva tu mesa
          </h2>
          <p
            className="mt-5 max-w-md text-[var(--text-secondary)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Recomendamos reservar con anticipación, especialmente para la cena y
            los fines de semana. Cada mesa es tuya toda la noche: sin prisas, sin
            rotaciones, solo producto y conversación.
          </p>

          <div className="mt-8">
            <Link
              href="/reservar"
              className="inline-flex items-center justify-center px-10 py-4 rounded-sm font-semibold text-[var(--color-ak-cal)] transition-colors duration-200 active:scale-[0.98]"
              style={{
                fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--color-ak-borgona)',
                border: '1px solid var(--color-ak-borgona)',
                minHeight: '52px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-ak-ladrillo)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-ak-borgona)')}
            >
              Reservar Mesa →
            </Link>
          </div>
        </motion.div>

        {/* Right — practical info */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewOptions}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
        >
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {rows.map((row) => (
              <div key={row.label} className="py-5" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <p
                  className="text-sm mb-1.5"
                  style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-dorado)', fontSize: '1.15rem' }}
                >
                  {row.label}
                </p>
                <div className="space-y-0.5">
                  {row.value.map((line, i) => (
                    <p
                      key={i}
                      className="text-[var(--text-primary)]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Cómo llegar — textual block + external map link */}
          <div
            className="mt-6 p-5 rounded-sm"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
            <p
              className="text-sm mb-2"
              style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-dorado)', fontSize: '1.15rem' }}
            >
              Cómo llegar
            </p>
            <p
              className="text-lg text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {info.address.full}
            </p>
            <a
              href={info.address.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 mt-3 text-sm font-medium"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-ak-borgona)' }}
            >
              Ver en Google Maps
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              <span className="absolute left-0 -bottom-1 h-px w-full origin-left scale-x-0 bg-[var(--color-ak-dorado)] transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}