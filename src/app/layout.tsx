import type { Metadata } from "next"
import type { Metadata } from "next"
import { DM_Sans, Caveat } from "next/font/google"
import localFont from "next/font/local"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/auth-provider"
import { ThemeProvider } from "@/lib/ThemeProvider"

export const dynamic = 'force-dynamic'

// Brand fonts — SmithyXT family for display headings
const smithyHeavy = localFont({
  src: "../../public/fonts/SmithyXT-Heavy.woff2",
  variable: "--font-smithy-heavy",
  display: "swap",
  weight: "700",
})
const smithyVeryHeavy = localFont({
  src: "../../public/fonts/SmithyXT-VeryHeavy.woff2",
  variable: "--font-smithy-vheavy",
  display: "swap",
  weight: "900",
})
const oldPress = localFont({
  src: "../../public/fonts/OldPress.woff2",
  variable: "--font-old-press",
  display: "swap",
  weight: "400",
})

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm" })
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" })

export const metadata: Metadata = {
  title: "Attick & Keller — Reservas",
  description: "Reserva tu mesa en Attick & Keller. Bogotá.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${smithyHeavy.variable} ${smithyVeryHeavy.variable} ${oldPress.variable} ${dmSans.variable} ${caveat.variable}`} suppressHydrationWarning>
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