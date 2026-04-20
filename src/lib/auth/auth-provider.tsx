'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // Clean up URL hash after OAuth redirect
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string, phone: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
      },
    })
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async () => {
    const origin = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export { supabase } from '../supabase/client'