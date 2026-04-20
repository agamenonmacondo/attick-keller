import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#3E2723] text-[#F5EDE0] py-12 px-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <h3 className="font-['Playfair_Display'] text-xl font-bold mb-2">Attick &amp; Keller</h3>
          <p className="text-[#C9A94E]">Bogotá, Colombia</p>
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
            className="text-[#C9A94E] hover:underline"
          >
            @attickkeller
          </Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#5D4037] text-center text-xs text-[#8D6E63]">
        © {new Date().getFullYear()} Attick &amp; Keller. Todos los derechos reservados.
      </div>
    </footer>
  )
}