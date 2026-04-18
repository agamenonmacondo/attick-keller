import dynamic from 'next/dynamic'
import type { Metadata } from "next";

const Navbar = dynamic(() => import('@/components/layout/Navbar'))
const HeroSection = dynamic(() => import('@/components/home/HeroSection'))
const AboutSection = dynamic(() => import('@/components/home/AboutSection'))
const ExperiencePillars = dynamic(() => import('@/components/home/ExperiencePillars'))
const GalleryPreview = dynamic(() => import('@/components/home/GalleryPreview'))
const ReservationCTA = dynamic(() => import('@/components/home/ReservationCTA'))
const Footer = dynamic(() => import('@/components/layout/Footer'))

export const metadata: Metadata = {
  title: "Attick & Keller — Wine and Beer Playground",
  description: "Reserva tu mesa en Attick & Keller. Vinos, cervezas artesanales y cocina mediterránea en Bogotá.",
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <HeroSection />
        <AboutSection />
        <ExperiencePillars />
        <GalleryPreview />
        <ReservationCTA />
      </main>
      <Footer />
    </>
  );
}