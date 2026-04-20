'use client'

import Link from 'next/link'

export default function ConfirmadoPage() {
  return (
    <div className="min-h-screen bg-[#F5EDE0] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="font-['Playfair_Display'] text-4xl font-bold text-[#3E2723] mb-4">
          ¡Reserva Confirmada!
        </h1>
        <p className="text-[#8D6E63] text-lg mb-8 max-w-md mx-auto">
          Tu reserva ha sido creada exitosamente. Recibirás confirmación pronto.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/perfil"
            className="px-6 py-3 bg-[#6B2737] text-white rounded-full font-semibold hover:bg-[#8B3747] transition-colors"
          >
            Ver Mis Reservas
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-[#D7CCC8] rounded-full font-medium hover:bg-[#EFEBE9] transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}