"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };
const easeOutExpo: [number, number, number, number] = [0.23, 1, 0.32, 1];

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: easeOutExpo },
  },
};

const fadeRight = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 1, ease: easeOutExpo },
  },
};

export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const overlay = useTransform(scrollYProgress, [0, 1], [0.3, 0.8]);

  return (
    <section ref={ref} className="relative min-h-[100dvh] overflow-hidden bg-ak-charcoal">
      {/* Background photo with parallax */}
      <motion.div className="absolute inset-0" style={{ scale: imgScale }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/ak_photo_01.jpg')" }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-ak-charcoal/40 via-ak-wine/50 to-ak-charcoal"
          style={{ opacity: overlay }}
        />
      </motion.div>

      {/* Decorative gold lines */}
      <motion.div
        className="absolute left-10 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-ak-gold/30 to-transparent"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.5, ease: easeOutExpo, delay: 0.3 }}
        style={{ transformOrigin: "top" }}
      />
      <motion.div
        className="absolute right-10 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-ak-gold/30 to-transparent"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.5, ease: easeOutExpo, delay: 0.5 }}
        style={{ transformOrigin: "top" }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <motion.div
          className="flex flex-col items-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            className="font-[Caveat] text-2xl tracking-wider text-ak-amber md:text-3xl"
            variants={fadeUp}
          >
            Wine and Beer Playground
          </motion.p>

          <motion.h1
            className="mt-4 font-[Playfair_Display] text-6xl leading-[1.05] tracking-tighter text-ak-cream md:text-8xl lg:text-9xl"
            variants={fadeRight}
          >
            Attick
            <br />
            <span className="text-ak-amber">&amp; Keller</span>
          </motion.h1>

          <motion.div
            className="mt-6 h-px w-0 bg-gradient-to-r from-transparent via-ak-gold to-transparent"
            variants={{
              hidden: { width: 0 },
              visible: { width: 200, transition: { duration: 0.8, ease: easeOutExpo, delay: 0.4 } },
            }}
          />

          <motion.p
            className="mt-6 max-w-lg text-base leading-relaxed text-ak-cream/60 md:text-lg"
            variants={fadeUp}
          >
            Reserva tu mesa en un refugio cálido con cocina mediterránea,
            vinos seleccionados y cervezas artesanales.
          </motion.p>

          <motion.div className="mt-10" variants={fadeUp}>
            <Link
              href="/reservar"
              className="group relative inline-flex items-center gap-3 rounded-2xl bg-ak-wine px-10 py-4 text-lg font-semibold text-ak-cream transition-all duration-300 hover:bg-ak-wine-light hover:scale-[1.02] active:scale-[0.98]"
              style={{ transition: "transform 0.2s cubic-bezier(0.23,1,0.32,1)" }}
            >
              Reservar Mesa
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Photo strip at bottom */}
      <motion.div
        className="absolute bottom-16 left-0 right-0 z-10 flex gap-3 overflow-hidden px-6 opacity-0"
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: easeOutExpo, delay: 1.2 }}
      >
        {["ak_photo_08.jpg", "ak_photo_05.jpg", "ak_photo_12.jpg", "ak_photo_15.jpg", "ak_photo_20.jpg"].map((img, i) => (
          <motion.div
            key={img}
            className="h-32 w-44 flex-shrink-0 overflow-hidden rounded-xl border border-ak-gold/20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 + i * 0.1, ease: easeOutExpo }}
          >
            <div
              className="h-full w-full bg-cover bg-center transition-transform duration-500 hover:scale-110"
              style={{ backgroundImage: `url('/${img}')` }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Location */}
      <motion.p
        className="absolute bottom-6 left-0 right-0 z-10 text-center font-[DM_Sans] text-xs tracking-[0.2em] text-ak-cream/30 uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2 }}
      >
        Carrera 13 #75-51 · Bogotá
      </motion.p>
    </section>
  );
}