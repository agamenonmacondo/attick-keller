import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[var(--color-ak-madera)] text-[var(--color-ak-cal)] py-12 px-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold mb-2">Attick &amp; Keller</h3>
          <p className="text-[var(--color-ak-dorado)]">Bogotá, Colombia</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Contacto</p>
          <p>Calle 79 #9-45, Bogotá</p>
          <p>+57 601 234 5678</p>
          <p>reservas@attickkeller.com</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Síguenos</p>
          <Link
            href="https://instagram.com/attickkeller"
            target="_blank"
            className="text-[var(--color-ak-dorado)] hover:underline"
          >
            @attickkeller
          </Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[var(--color-ak-ladrillo)]/50 text-center text-xs text-[var(--color-ak-cal)]/70">
        © {new Date().getFullYear()} Attick &amp; Keller. Todos los derechos reservados.
      </div>
    </footer>
  )
}