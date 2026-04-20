import Navbar from '@/components/layout/Navbar'
import HeroSection from '@/components/home/HeroSection'
import MenuSection from '@/components/home/MenuSection'
import Footer from '@/components/layout/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <MenuSection />
      {/* CTA Section */}
      <section className="py-20 px-6 bg-[#3E2723] text-center">
        <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-[#F5EDE0] mb-4">
          ¿Listo para vivir la experiencia?
        </h2>
        <p className="text-[#C9A94E] text-lg mb-8">
          Reserva tu mesa y descubre por qué Attick &amp; Keller es un referente en Bogotá
        </p>
        <a
          href="/reservar"
          className="inline-block px-10 py-4 bg-[#6B2737] text-[#F5EDE0] rounded-full text-lg font-semibold hover:bg-[#8B3747] transition-colors"
        >
          Reservar Mesa
        </a>
      </section>
      <Footer />
    </>
  )
}