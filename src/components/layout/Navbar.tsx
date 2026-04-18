"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { List, X, Wine } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/experiencia", label: "Experiencia" },
  { href: "/galeria", label: "Galería" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[var(--ease-out-expo)]",
        scrolled
          ? "bg-ak-wood/95 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-[Playfair_Display] text-xl tracking-tight text-ak-cream"
        >
          <Wine size={24} weight="fill" className="text-ak-amber" />
          Attick &amp; Keller
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ak-cream/80 transition-colors hover:text-ak-amber"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/reservar"
            className="button-press rounded-lg bg-ak-wine px-5 py-2.5 text-sm font-semibold text-ak-cream transition-colors hover:bg-ak-wine-light"
          >
            Reservar
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-ak-cream md:hidden"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X size={28} /> : <List size={28} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-500 ease-[var(--ease-out-expo)] md:hidden",
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-4 bg-ak-wood/95 px-6 pb-6 pt-2 backdrop-blur-md">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-base font-medium text-ak-cream/80 transition-colors hover:text-ak-amber"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/reservar"
            onClick={() => setMobileOpen(false)}
            className="button-press rounded-lg bg-ak-wine px-5 py-2.5 text-center text-sm font-semibold text-ak-cream transition-colors hover:bg-ak-wine-light"
          >
            Reservar
          </Link>
        </div>
      </div>
    </header>
  );
}