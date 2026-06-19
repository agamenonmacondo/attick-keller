import Navbar from '@/components/layout/Navbar'
import HeroCinematic from '@/components/home/HeroCinematic'
import ManifestoSection from '@/components/home/ManifestoSection'
import MenuSection from '@/components/home/MenuSection'
import GallerySection from '@/components/home/GallerySection'
import ReserveInfoSection from '@/components/home/ReserveInfoSection'
import Footer from '@/components/layout/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroCinematic />
      <ManifestoSection />
      <MenuSection />
      <GallerySection />
      <ReserveInfoSection />
      <Footer />
    </>
  )
}