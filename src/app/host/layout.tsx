'use client'

import { ThemeProvider } from '@/lib/ThemeProvider'

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}