"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

const photos = [
  { caption: "Interior cálido", aspect: "aspect-[3/4]" },
  { caption: "Copa de vino", aspect: "aspect-square" },
  { caption: "Tabla de quesos", aspect: "aspect-[4/3]" },
  { caption: "Cerveza artesanal", aspect: "aspect-[3/4]" },
  { caption: "Plato mediterráneo", aspect: "aspect-square" },
  { caption: "Terraza", aspect: "aspect-[4/3]" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.05, duration: 0.5, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
  }),
};

export default function GalleryPreview() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="bg-ak-cream py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-[Playfair_Display] text-3xl tracking-tight text-ak-charcoal md:text-4xl">
          Galería
        </h2>
        <p className="mt-3 text-base text-ak-charcoal/60">
          Momentos que saben bien.
        </p>

        <div className="mt-12 columns-2 gap-4 md:columns-3">
          {photos.map((photo, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              custom={i}
              className={`group relative mb-4 overflow-hidden rounded-xl ${photo.aspect} bg-ak-wood/15`}
            >
              <div className="absolute inset-0 bg-ak-wine/0 transition-colors duration-300 group-hover:bg-ak-wine/40" />
              <div className="absolute inset-0 flex items-end p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="text-sm font-medium text-ak-cream">
                  {photo.caption}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/galeria"
            className="button-press inline-block border-b-2 border-ak-wine pb-1 text-sm font-semibold text-ak-wine transition-colors hover:border-ak-amber hover:text-ak-amber"
          >
            Ver Galería Completa
          </Link>
        </div>
      </div>
    </section>
  );
}