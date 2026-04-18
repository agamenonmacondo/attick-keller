import dynamic from 'next/dynamic'
import type { Metadata } from "next";

const Navbar = dynamic(() => import('@/components/layout/Navbar'))
const ReservationForm = dynamic(() => import('@/components/reservation/ReservationForm'))
const Footer = dynamic(() => import('@/components/layout/Footer'))

export const metadata: Metadata = {
  title: "Reservar — Attick & Keller",
  description: "Reserva tu mesa en Attick & Keller. Vinos, cervezas y cocina mediterránea.",
};

export default function ReservarPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center bg-ak-cream px-6 py-32">
        <div className="mb-8 text-center">
          <h1 className="font-[Playfair_Display] text-4xl tracking-tight text-ak-charcoal md:text-5xl">
            Reservar Mesa
          </h1>
          <p className="mt-3 text-base text-ak-charcoal/60">
            Elige fecha, hora y zona. Te esperamos.
          </p>
        </div>
        <ReservationForm />
      </main>
      <Footer />
    </>
  );
}