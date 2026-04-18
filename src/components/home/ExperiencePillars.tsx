"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Wine, BeerStein, Leaf } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

const pillars = [
  {
    title: "Vinos",
    description:
      "Carta curada con vinos del viejo y nuevo mundo. Copas que viajan desde Ribera del Duero hasta Mendoza.",
    icon: Wine,
    bg: "bg-ak-wine",
    text: "text-ak-cream",
    tall: true,
  },
  {
    title: "Cervezas Artesanales",
    description:
      "Grifos rotativos con lo mejor de la escena cervecera colombiana e internacional.",
    icon: BeerStein,
    bg: "bg-ak-amber",
    text: "text-ak-charcoal",
    tall: false,
  },
  {
    title: "Mediterráneo",
    description:
      "Platos para compartir, tablas, pastas y proteínas con alma mediterránea y productos locales.",
    icon: Leaf,
    bg: "bg-ak-olive",
    text: "text-ak-cream",
    tall: false,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
  }),
};

export default function ExperiencePillars() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-ak-cream-light py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-[Playfair_Display] text-3xl tracking-tight text-ak-charcoal md:text-4xl">
          La experiencia
        </h2>
        <p className="mt-3 text-base text-ak-charcoal/60">
          Tres mundos en una misma mesa.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2 md:grid-rows-2">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                variants={fadeUp}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                custom={i}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl p-8 transition-all duration-300",
                  p.bg,
                  p.text,
                  p.tall && "md:row-span-2"
                )}
              >
                <div className="absolute inset-0 bg-ak-charcoal/0 transition-colors duration-300 group-hover:bg-ak-charcoal/10" />
                <Icon size={36} weight="light" className="relative z-10 mb-4" />
                <h3 className="relative z-10 font-[Playfair_Display] text-2xl tracking-tight">
                  {p.title}
                </h3>
                <p className="relative z-10 mt-3 text-sm leading-relaxed opacity-80">
                  {p.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}