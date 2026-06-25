import type { Metadata } from "next"
import { Inter, Caveat } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/auth-provider"
import { ThemeProvider } from "@/lib/ThemeProvider"

export const dynamic = 'force-dynamic'

export function TextureOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ opacity: 0.04, mixBlendMode: 'overlay' }}
    >
      {/* SVG noise pattern — subtle grain */}
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" opacity="0.5" />
      </svg>
    </div>
  )
}

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700", "800", "900"] })
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" })

export const metadata: Metadata = {
  title: "Attick & Keller — Reservas",
  description: "Reserva tu mesa en Attick & Keller. Bogotá.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ak-theme');if(t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-[family-name:var(--font-body)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
          <TextureOverlay />
        </AuthProvider>
      </body>
    </html>
  )
}