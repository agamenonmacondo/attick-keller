'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isHost: boolean
  adminRole: string | null
  roleLoading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [adminRole, setAdminRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchRole = useCallback(async () => {
    setRoleLoading(true)
    try {
      const res = await fetch('/api/auth/role')
      if (res.ok) {
        const data = await res.json()
        const admin = data.role === 'store_admin' || data.role === 'super_admin'
        const host = data.role === 'host'
        setIsAdmin(admin)
        setIsHost(host)
        setAdminRole(data.role)
      } else {
        setIsAdmin(false)
        setIsHost(false)
        setAdminRole(null)
      }
    } catch {
      setIsAdmin(false)
      setIsHost(false)
      setAdminRole(null)
    } finally {
      setRoleLoading(false)
    }
  }, [])

  const clearRole = useCallback(() => {
    setIsAdmin(false)
    setIsHost(false)
    setAdminRole(null)
    setRoleLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        fetchRole()
      } else {
        clearRole()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      if (session?.user) {
        fetchRole()
      } else {
        clearRole()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchRole, clearRole])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string, phone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    })

    if (error) return { error: error.message }

    // If session exists already, user is auto-confirmed and logged in
    if (data.session) return { error: null }

    // No session = email confirmation required. Auto-confirm via API.
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName }),
      })
      if (res.ok) {
        // Auto-confirm succeeded, try login
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInError) return { error: null }
      }
      // Retry after short delay (user might not be in listUsers yet)
      await new Promise(r => setTimeout(r, 2000))
      const res2 = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName }),
      })
      if (res2.ok) {
        const { error: signInError2 } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInError2) return { error: null }
      }
    } catch {
      // Auto-confirm failed
    }

    return { error: null }
  }

  const signInWithGoogle = async () => {
    const origin = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin + '/auth/callback' },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    clearRole()
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isHost, adminRole, roleLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)