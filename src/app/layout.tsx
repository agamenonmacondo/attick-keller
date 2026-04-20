import type { Metadata } from "next"
import { Playfair_Display, DM_Sans, Caveat } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/auth-provider"

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm" })
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" })

export const metadata: Metadata = {
  title: "Attick & Keller — Reservas",
  description: "Reserva tu mesa en Attick & Keller. Bogotá.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable} ${caveat.variable}`}>
      <body className="font-['DM_Sans'] bg-[#F5EDE0] text-[#1E1E1E]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}