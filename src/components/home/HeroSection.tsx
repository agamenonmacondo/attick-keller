"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
    },
  }),
};

export default function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-ak-charcoal">
      <div className="grid min-h-[100dvh] md:grid-cols-[3fr_2fr]">
        {/* Left — Text */}
        <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:px-24">
          <motion.h1
            className="font-[Playfair_Display] text-5xl tracking-tighter text-ak-cream md:text-7xl"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            Attick &amp; Keller
          </motion.h1>

          <motion.p
            className="mt-4 font-[Caveat] text-2xl text-ak-amber md:text-3xl"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            Wine and Beer Playground
          </motion.p>

          <motion.p
            className="mt-6 max-w-md text-base leading-relaxed text-ak-cream/70"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            Cocina mediterránea, vinos seleccionados y cervezas artesanales en
            un refugio cálido en Bogotá.
          </motion.p>

          <motion.div
            className="mt-8"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            <Link
              href="/reservar"
              className="button-press inline-block rounded-lg bg-ak-wine px-8 py-3.5 text-base font-semibold text-ak-cream transition-colors hover:bg-ak-amber hover:text-ak-charcoal"
            >
              Reservar Mesa
            </Link>
          </motion.div>
        </div>

        {/* Right — Image placeholder */}
        <div className="relative hidden md:block">
          <div className="absolute inset-0 bg-gradient-to-l from-ak-charcoal/30 via-ak-wine/40 to-transparent" />
          <div className="absolute inset-0 bg-ak-wood/60" />
          {/* Replace with Next.js Image when photos available */}
          <div className="flex h-full items-center justify-center text-ak-cream/20">
            <span className="font-[Playfair_Display] text-4xl tracking-tight">
              A&amp;K
            </span>
          </div>
        </div>

        {/* Mobile image overlay (shown on top, stacked) */}
        <div className="relative h-64 md:hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-ak-wine/70 to-ak-charcoal" />
        </div>
      </div>
    </section>
  );
}