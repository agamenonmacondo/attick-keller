import Navbar from '@/components/layout/Navbar'
import HeroSection from '@/components/home/HeroSection'
import MenuSection from '@/components/home/MenuSection'
import PhotoCTA from '@/components/home/PhotoCTA'
import Footer from '@/components/layout/Footer'

export default function Home() {
  return (
    <div>
      <Navbar />
      <HeroSection />
      <MenuSection />
      <PhotoCTA />
      <Footer />
    </div>
  )
}