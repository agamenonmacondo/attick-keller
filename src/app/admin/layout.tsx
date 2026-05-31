'use client'

import { ThemeProvider } from '@/lib/ThemeProvider'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}