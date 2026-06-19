'use client'

import { useState } from 'react'
import Link from 'next/link'
import { InstagramLogo } from '@phosphor-icons/react'
import { RESTAURANT_INFO } from '@/lib/utils/restaurantInfo'

export default function Footer() {
  const info = RESTAURANT_INFO
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[var(--color-ak-madera)] dark:bg-[var(--color-ak-night)] text-[var(--color-ak-cal)] py-14 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
          <div className="space-y-2">
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Attick &amp; Keller
            </h3>
            <p style={{ fontFamily: 'var(--font-accent)', color: 'var(--color-ak-dorado)' }} className="text-lg">
              Bogotá · Colombia
            </p>
            <p className="text-sm text-[var(--color-ak-cal)]/60" style={{ fontFamily: 'var(--font-body)' }}>
              {info.tagline}
            </p>
            {/* Social */}
            <div className="flex items-center gap-3 pt-3">
              <a
                href={info.social.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-[var(--color-ak-dorado)] hover:text-[var(--color-ak-cal)] transition-colors"
              >
                <InstagramLogo size={24} weight="regular" />
              </a>
            </div>
          </div>

          {/* Visítanos */}
          <div className="space-y-2">
            <p className="font-semibold text-[var(--color-ak-cal)]/80" style={{ fontFamily: 'var(--font-body)' }}>
              Visítanos
            </p>
            <p className="text-sm text-[var(--color-ak-cal)]/60" style={{ fontFamily: 'var(--font-body)' }}>
              {info.address.full}
            </p>
            <div className="text-sm text-[var(--color-ak-cal)]/60 space-y-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              {info.hours.map(h => (
                <p key={h.days}>{h.days} · {h.label}</p>
              ))}
            </div>
            <p className="text-sm text-[var(--color-ak-cal)]/60 pt-1" style={{ fontFamily: 'var(--font-body)' }}>
              {info.phone.display}
            </p>
          </div>

          {/* Explora */}
          <div className="space-y-2">
            <p className="font-semibold text-[var(--color-ak-cal)]/80" style={{ fontFamily: 'var(--font-body)' }}>
              Explora
            </p>
            <ul className="space-y-1.5" style={{ fontFamily: 'var(--font-body)' }}>
              <li><FooterAnchor href="/#filosofia">Filosofía</FooterAnchor></li>
              <li><FooterAnchor href="/#menu">Carta</FooterAnchor></li>
              <li><FooterAnchor href="/#galeria">Galería</FooterAnchor></li>
              <li><FooterAnchor href="/#reservar">Reservar</FooterAnchor></li>
              <li><FooterAnchor href="/auth/login">Mi cuenta</FooterAnchor></li>
            </ul>
          </div>

          {/* Newsletter */}
          <Newsletter />
        </div>

        {/* Gold divider */}
        <div
          className="h-px my-10"
          style={{ background: 'linear-gradient(to right, transparent, rgba(201,169,78,0.4), transparent)' }}
        />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-ak-cal)]/50" style={{ fontFamily: 'var(--font-body)' }}>
          <p>© {year} Attick &amp; Keller. Todos los derechos reservados.</p>
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-[var(--color-ak-cal)] transition-colors">Términos</Link>
            <span aria-hidden>·</span>
            <Link href="/" className="hover:text-[var(--color-ak-cal)] transition-colors">Privacidad</Link>
            <span aria-hidden>·</span>
            <Link href="/" className="hover:text-[var(--color-ak-cal)] transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative inline-block text-sm text-[var(--color-ak-cal)]/60 hover:text-[var(--color-ak-cal)] transition-colors"
    >
      {children}
      <span className="absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 bg-[var(--color-ak-dorado)] transition-transform duration-300 ease-out group-hover:scale-x-100" />
    </Link>
  )
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    // TODO: wire to backend (e.g. POST /api/newsletter). For now, local-only.
    console.warn('newsletter: wire to backend', email)
    setSubscribed(true)
    setEmail('')
  }

  return (
    <div className="space-y-2">
      <p className="font-semibold text-[var(--color-ak-cal)]/80" style={{ fontFamily: 'var(--font-body)' }}>
        Newsletter
      </p>
      <p className="text-sm text-[var(--color-ak-cal)]/60" style={{ fontFamily: 'var(--font-body)' }}>
        Novedades y menús de temporada.
      </p>
      {subscribed ? (
        <p className="text-sm pt-1" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-ak-oliva)' }}>
          ¡Gracias! Te avisaremos pronto.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu correo"
            aria-label="Correo electrónico para el newsletter"
            className="flex-1 min-w-0 px-3 py-2.5 rounded-sm text-sm focus:outline-none focus-visible:ring-1"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: 'rgba(245,237,224,0.1)',
              border: '1px solid rgba(201,169,78,0.3)',
              color: 'var(--color-ak-cal)',
            }}
          />
          <button
            type="submit"
            className="shrink-0 px-4 py-2.5 rounded-sm text-sm font-semibold transition-colors duration-200 active:scale-[0.97]"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-ak-dorado)',
              color: 'var(--color-ak-madera)',
            }}
          >
            Suscribirme
          </button>
        </form>
      )}
    </div>
  )
}