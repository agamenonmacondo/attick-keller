'use client'

import Link from 'next/link'

export default function ConfirmadoPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="font-['Playfair_Display'] text-4xl font-bold text-[var(--color-ak-madera)] mb-4">
          ¡Reserva Confirmada!
        </h1>
        <p className="text-[var(--text-secondary)] text-lg mb-8 max-w-md mx-auto">
          Tu reserva ha sido creada exitosamente. Recibirás confirmación pronto.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/perfil"
            className="px-6 py-3 bg-[var(--color-ak-borgona)] text-white rounded-full font-semibold hover:bg-[var(--color-ak-borgona)] transition-colors"
          >
            Ver Mis Reservas
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-[var(--border-default)] rounded-full font-medium hover:bg-[var(--bg-input)] transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}