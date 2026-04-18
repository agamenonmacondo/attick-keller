"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Wine, BeerStein, Leaf } from "@phosphor-icons/react";

const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
  }),
};

export default function AboutSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="bg-ak-cream py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-[3fr_2fr] md:gap-16">
        {/* Text */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0}
        >
          <div className="flex gap-6 text-ak-wine">
            <Wine size={32} weight="light" />
            <BeerStein size={32} weight="light" />
            <Leaf size={32} weight="light" />
          </div>

          <h2 className="mt-6 font-[Playfair_Display] text-3xl tracking-tight text-ak-charcoal md:text-4xl">
            Un refugio donde lo artesanal se encuentra con lo mediterráneo
          </h2>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-ak-charcoal/70">
            En Attick &amp; Keller creemos que una buena mesa empieza por los
            ingredientes, sigue por la copa y termina en la conversación.
            Nuestra cocina rinde homenaje al Mediterráneo con productos locales,
            mientras nuestra barra explora vinos del mundo y cervezas que
            cuentan historias.
          </p>

          <p className="mt-6 font-[Caveat] text-2xl text-ak-wine">
            &ldquo;Cada plato, cada copa, es una invitación a quedarte.&rdquo;
          </p>
        </motion.div>

        {/* Image */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={1}
          className="relative overflow-hidden rounded-2xl"
          style={{
            clipPath: inView
              ? "inset(0 0 0 0)"
              : "inset(100% 0 0 0)",
            transition: "clip-path 1s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          <div className="aspect-[4/5] bg-ak-wood/20 flex items-center justify-center">
            <span className="text-ak-charcoal/20 font-[Playfair_Display] text-3xl">
              Foto
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}