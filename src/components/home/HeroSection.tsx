"use client";

import Link from "next/link";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const easeOutExpo: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  // Floating orbs
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section ref={ref} className="relative min-h-[100dvh] overflow-hidden bg-[#1E1E1E]">
      {/* Animated gradient background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#3E2723] via-[#6B2737] to-[#1E1E1E]" />
        
        {/* Floating orbs */}
        {mounted && (
          <>
            <motion.div
              className="absolute w-96 h-96 rounded-full bg-[#D4922A]/10 blur-[120px]"
              style={{ left: '20%', top: '30%' }}
              animate={{ x: [0, 60, -40, 0], y: [0, -40, 30, 0], scale: [1, 1.2, 0.9, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute w-80 h-80 rounded-full bg-[#6B2737]/15 blur-[100px]"
              style={{ right: '10%', top: '50%' }}
              animate={{ x: [0, -50, 30, 0], y: [0, 50, -30, 0], scale: [1, 0.8, 1.1, 1] }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute w-64 h-64 rounded-full bg-[#C9A94E]/8 blur-[80px]"
              style={{ left: '50%', bottom: '20%' }}
              animate={{ x: [0, 40, -60, 0], y: [0, -30, 20, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}
      </motion.div>

      {/* Decorative gold lines */}
      <motion.div
        className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#C9A94E]/40 to-transparent"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 2, ease: easeOutExpo, delay: 0.5 }}
        style={{ transformOrigin: "top" }}
      />
      <motion.div
        className="absolute right-8 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#C9A94E]/40 to-transparent"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 2, ease: easeOutExpo, delay: 0.7 }}
        style={{ transformOrigin: "top" }}
      />

      {/* Horizontal decorative line */}
      <motion.div
        className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A94E]/10 to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2.5, ease: easeOutExpo, delay: 1 }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center"
        style={{ opacity: textOpacity }}
      >
        {/* Small top label */}
        <motion.div
          className="mb-6 flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.8 }}
        >
          <div className="h-px w-8 bg-[#C9A94E]/60" />
          <span className="font-[DM_Sans] text-sm tracking-[0.25em] text-[#C9A94E]/80 uppercase">
            Bogotá
          </span>
          <div className="h-px w-8 bg-[#C9A94E]/60" />
        </motion.div>

        {/* Main title */}
        <div className="overflow-hidden">
          <motion.h1
            className="font-[Playfair_Display] text-7xl leading-[1] tracking-tight text-[#F5EDE0] md:text-[120px] lg:text-[140px]"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: easeOutExpo, delay: 0.3 }}
          >
            Attick
          </motion.h1>
        </div>
        <div className="overflow-hidden mt-1">
          <motion.h1
            className="font-[Playfair_Display] text-7xl leading-[1] tracking-tight text-[#D4922A] md:text-[120px] lg:text-[140px]"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: easeOutExpo, delay: 0.5 }}
          >
            &amp; Keller
          </motion.h1>
        </div>

        {/* Gold divider */}
        <motion.div
          className="mt-8 h-px bg-gradient-to-r from-transparent via-[#C9A94E] to-transparent"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          transition={{ duration: 1.2, ease: easeOutExpo, delay: 1.2 }}
        />

        {/* Subtitle */}
        <motion.p
          className="mt-6 font-[DM_Sans] text-lg tracking-[0.15em] text-[#F5EDE0]/50 uppercase"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOutExpo, delay: 1.5 }}
        >
          Reservas
        </motion.p>

        {/* CTA Button */}
        <motion.div
          className="mt-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay: 1.8 }}
        >
          <Link
            href="/reservar"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-[#6B2737] px-12 py-5 text-lg font-semibold text-[#F5EDE0] transition-all duration-300 hover:bg-[#8B3751] hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Shimmer effect */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Reservar Mesa</span>
            <span className="relative text-xl transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Bottom location */}
      <motion.div
        className="absolute bottom-8 left-0 right-0 z-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.5 }}
      >
        <p className="font-[DM_Sans] text-xs tracking-[0.2em] text-[#F5EDE0]/25 uppercase">
          Carrera 13 #75-51
        </p>
      </motion.div>
    </section>
  );
}