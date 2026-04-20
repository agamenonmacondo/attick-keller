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
  signUpWithEmail: (email: string, password: string, fullName: string, telephone: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle OAuth redirect — Supabase puts tokens in URL hash
    // This processes the hash fragment and establishes the session
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Clean up URL hash after OAuth redirect
        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname)
        }
      }
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Also check/get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Clean up hash if session exists (from OAuth redirect)
      if (session && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      setUser(session?.user ?? null)
      setLoading(false)
    })
  }, [])

  const signInWithPhone = async (phone: string) => {
    try {
      const { error } = await auth.sendOTP(phone)
      return { error: error?.message ?? null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An unknown error occurred' }
    }
  }

  const verifyOTP = async (phone: string, token: string) => {
    try {
      const { error } = await auth.verifyOTP(phone, token)
      return { error: error?.message ?? null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An unknown error occurred' }
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await auth.signInWithEmail(email, password)
      return { error: error?.message ?? null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An unknown error occurred' }
    }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string, telephone: string) => {
    const { data, error } = await auth.signUpWithEmail(email, password, fullName)
    if (error) return { error: error?.message ?? 'An unknown error occurred' }

    const user = data?.user
    if (!user) return { error: 'User not found after sign up' }

    // Create customer profile in the customers table
    const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'a0000000-0000-0000-0000-000000000001'
    const { error: customerError } = await supabase
      .from('customers')
      .insert({
        restaurant_id: restaurantId,
        auth_user_id: user.id,
        full_name: fullName,
        phone: telephone,
        email,
      })

    if (customerError) return { error: customerError.message ?? 'An unknown error occurred' }

    return { error: null }
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
      signUpWithEmail,
      signInWithGoogle,
      signInWithFacebook,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)