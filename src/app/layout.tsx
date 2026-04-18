import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-provider";

export const metadata: Metadata = {
  title: "Attick & Keller — Wine and Beer Playground",
  description: "Reserva tu mesa en Attick & Keller. Vinos, cervezas artesanales y cocina mediterránea en Bogotá.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-[DM_Sans]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}