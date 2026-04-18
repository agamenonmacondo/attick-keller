'use client';

import Link from "next/link";
import { Wine, FacebookLogo, InstagramLogo } from "@phosphor-icons/react";

export default function Footer() {
  return (
    <footer className="bg-ak-wood text-ak-cream/80">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="font-[Playfair_Display] text-2xl tracking-tight text-ak-cream">
              Attick &amp; Keller
            </h3>
            <p className="mt-2 font-[Caveat] text-lg text-ak-amber">
              Wine and Beer Playground
            </p>
            <p className="mt-4 text-sm leading-relaxed">
              Cocina mediterránea, vinos y cervezas artesanales en el corazón de
              Bogotá.
            </p>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-ak-amber">
              Horarios
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Lunes – Jueves: 12:00 PM – 10:00 PM</li>
              <li>Viernes – Sábado: 12:00 PM – 12:00 AM</li>
              <li>Domingo: 12:00 PM – 5:00 PM</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-ak-amber">
              Contacto
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Carrera 13 #75-51, Bogotá</li>
              <li>
                <a
                  href="tel:+573105772708"
                  className="transition-colors hover:text-ak-amber"
                >
                  +57 310 577 2708
                </a>
              </li>
              <li>
                <a
                  href="mailto:reservas@attickkeller.com"
                  className="transition-colors hover:text-ak-amber"
                >
                  reservas@attickkeller.com
                </a>
              </li>
            </ul>
            <div className="mt-4 flex gap-4">
              <a
                href="https://instagram.com/attic_keller"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ak-cream/60 transition-colors hover:text-ak-amber"
                aria-label="Instagram"
              >
                <InstagramLogo size={22} />
              </a>
              <a
                href="#"
                className="text-ak-cream/60 transition-colors hover:text-ak-amber"
                aria-label="Facebook"
              >
                <FacebookLogo size={22} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-ak-cream/10 pt-6 text-center text-xs text-ak-cream/40">
          &copy; {new Date().getFullYear()} Attick &amp; Keller. Todos los
          derechos reservados.
        </div>
      </div>
    </footer>
  );
}