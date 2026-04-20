import dynamic from 'next/dynamic'
import type { Metadata } from 'next'

const Navbar = dynamic(() => import('@/components/layout/Navbar'))
const Footer = dynamic(() => import('@/components/layout/Footer'))
const ReservationConfirmed = dynamic(() => import('./ReservationConfirmed'), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ak-wine border-t-transparent" />
    </div>
  ),
})

export const metadata: Metadata = {
  title: 'Reserva Confirmada — Attick & Keller',
  description: 'Tu reserva ha sido registrada exitosamente.',
}

export default function ConfirmadoPage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center bg-ak-cream px-6 py-32">
        <ReservationConfirmed />
      </main>
      <Footer />
    </>
  )
}