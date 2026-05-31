'use client'

import { createBrowserClient } from '@supabase/ssr'

// Supabase client for Rodrigo's (Seadotec) database
// Lazy initialization to avoid build-time errors when env vars are unavailable
let _rodriSupabase: ReturnType<typeof createBrowserClient> | null = null

export function getRodriSupabase() {
  if (!_rodriSupabase) {
    const url = process.env.NEXT_PUBLIC_RODRI_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_RODRI_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Rodri Supabase env vars not configured. Set NEXT_PUBLIC_RODRI_SUPABASE_URL and NEXT_PUBLIC_RODRI_SUPABASE_ANON_KEY.')
    }
    _rodriSupabase = createBrowserClient(url, key)
  }
  return _rodriSupabase
}