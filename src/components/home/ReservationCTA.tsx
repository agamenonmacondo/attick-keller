import Link from "next/link";

export default function ReservationCTA() {
  return (
    <section className="relative bg-ak-wood py-24 md:py-32">
      {/* Subtle wood texture overlay via gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-ak-wood via-ak-charcoal/20 to-ak-wood" />

      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-[Playfair_Display] text-3xl tracking-tight text-ak-cream md:text-5xl">
          ¿Listo para tu mesa?
        </h2>
        <p className="mt-4 text-base text-ak-cream/70">
          Reserva en segundos y prepárate para una noche que merece ser repetida.
        </p>
        <div className="mt-8">
          <Link
            href="/reservar"
            className="button-press inline-block rounded-lg bg-ak-amber px-10 py-4 text-lg font-semibold text-ak-charcoal transition-colors hover:bg-ak-gold"
          >
            Reservar Ahora
          </Link>
        </div>
      </div>
    </section>
  );
}