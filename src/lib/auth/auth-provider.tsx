'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, auth } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithPhone: (phone: string) => Promise<{ error: string | null }>
  verifyOTP: (phone: string, token: string) => Promise<{ error: string | null }>
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    auth.getUser().then((u) => {
      setUser(u)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithPhone = async (phone: string) => {
    const { error } = await auth.sendOTP(phone)
    return { error: error?.message ?? null }
  }

  const verifyOTP = async (phone: string, token: string) => {
    const { error } = await auth.verifyOTP(phone, token)
    return { error: error?.message ?? null }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await auth.signInWithEmail(email, password)
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async () => {
    await auth.signInWithGoogle()
  }

  const signInWithFacebook = async () => {
    await auth.signInWithFacebook()
  }

  const signOut = async () => {
    await auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithPhone,
      verifyOTP,
      signInWithEmail,
      signInWithGoogle,
      signInWithFacebook,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)