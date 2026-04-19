import dynamic from 'next/dynamic'
import type { Metadata } from "next";

const Navbar = dynamic(() => import('@/components/layout/Navbar'))
const HeroSection = dynamic(() => import('@/components/home/HeroSection'))
const Footer = dynamic(() => import('@/components/layout/Footer'))

export const metadata: Metadata = {
  title: "Attick & Keller — Reservas",
  description: "Reserva tu mesa en Attick & Keller. Bogotá.",
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <HeroSection />
      </main>
      <Footer />
    </>
  );
}