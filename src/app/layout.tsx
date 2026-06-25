import type { Metadata } from "next"
import { Inter, Caveat } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/auth-provider"
import { ThemeProvider } from "@/lib/ThemeProvider"

export const dynamic = 'force-dynamic'

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
        </AuthProvider>
      </body>
    </html>
  )
}