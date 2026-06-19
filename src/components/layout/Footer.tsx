import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[var(--color-ak-madera)] dark:bg-[var(--color-ak-night)] text-[var(--color-ak-cal)] py-12 px-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        {/* Logo / info */}
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold mb-2">
            Attick &amp; Keller
          </h3>
          <p className="text-[var(--color-ak-dorado)]">Bogotá, Colombia</p>
          <p className="mt-3 text-[var(--color-ak-cal)]/70 leading-relaxed">
            Cocina de autor mediterránea en el corazón de la ciudad.
          </p>
        </div>

        {/* Dirección */}
        <div>
          <p className="font-semibold mb-2">Dirección</p>
          <p className="text-[var(--color-ak-cal)]/80">Carrera 13 #75-51, Bogotá</p>
          <p className="mt-2 text-[var(--color-ak-cal)]/80">+57 310 7874752</p>
          <p className="text-[var(--color-ak-cal)]/80">reservas@attickkeller.com</p>
        </div>

        {/* Horarios */}
        <div>
          <p className="font-semibold mb-2">Horarios</p>
          <p className="text-[var(--color-ak-cal)]/80">Jue – Dom</p>
          <p className="text-[var(--color-ak-cal)]/80">18:00 – 00:00</p>
          <p className="mt-2 text-[var(--color-ak-cal)]/50">Lun – Mar – Cerrado</p>
        </div>

        {/* Síguenos */}
        <div>
          <p className="font-semibold mb-2">Síguenos</p>
          <Link
            href="https://instagram.com/attickkeller"
            target="_blank"
            className="inline-flex items-center gap-2 text-[var(--color-ak-dorado)] hover:text-[var(--color-ak-ambar)] transition-colors duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
            </svg>
            @attickkeller
          </Link>
        </div>
      </div>

      {/* Decorative gold line above copyright */}
      <div className="max-w-7xl mx-auto mt-10">
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-ak-dorado)]/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto mt-6 text-center text-xs text-[var(--color-ak-cal)]/70">
        © {new Date().getFullYear()} Attick &amp; Keller. Todos los derechos reservados.
      </div>
    </footer>
  )
}